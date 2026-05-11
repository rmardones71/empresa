const bcrypt = require('bcrypt')
const { validationResult } = require('express-validator')
const { env } = require('../config/env')
const { query } = require('../database/db')
const { auditLog } = require('../services/auditService')
const { sendMail } = require('../services/mailService')
const { randomNumericCode6, randomTempPassword } = require('../utils/random')
const { signAccessToken, signRefreshToken, sha256, verifyRefreshToken } = require('../utils/tokens')

async function getUserByUsernameOrEmail(login) {
  const result = await query(
    `
    SELECT TOP 1
      u.UserId, u.Username, u.Email, u.FirstName, u.LastName, u.PasswordHash, u.IsActive, u.TwoFactorEnabled,
      u.TwoFactorCode, u.TwoFactorExpires, u.TempPassword, u.FailedAttempts, u.LockoutUntil,
      u.RoleId, r.RoleName
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE u.Username = @login OR u.Email = @login
    `,
    { login },
  )
  return result.recordset[0] || null
}

function nowUtc() {
  return new Date()
}

function isLocked(user) {
  if (!user.LockoutUntil) return false
  return new Date(user.LockoutUntil).getTime() > Date.now()
}

async function login(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const { login: loginValue, password } = req.body
  const user = await getUserByUsernameOrEmail(loginValue)

  if (!user) {
    await auditLog({ userId: null, actionType: 'LOGIN_FAILED', description: 'User not found', ipAddress })
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  if (!user.IsActive) {
    await auditLog({ userId: user.UserId, actionType: 'LOGIN_FAILED', description: 'Inactive user', ipAddress })
    return res.status(403).json({ message: 'User inactive' })
  }

  if (isLocked(user)) {
    await auditLog({ userId: user.UserId, actionType: 'LOGIN_BLOCKED', description: 'User locked out', ipAddress })
    return res.status(423).json({ message: 'User locked. Try later.' })
  }

  const ok = await bcrypt.compare(password, user.PasswordHash)
  if (!ok) {
    const failedAttempts = Number(user.FailedAttempts || 0) + 1
    const shouldLock = failedAttempts >= env.security.maxFailedAttempts
    const lockoutUntil = shouldLock ? new Date(Date.now() + env.security.lockoutMinutes * 60 * 1000) : null

    await query(
      `
      UPDATE dbo.Users
      SET FailedAttempts = @failedAttempts,
          LockoutUntil = @lockoutUntil
      WHERE UserId = @userId
      `,
      { failedAttempts, lockoutUntil, userId: user.UserId },
    )

    await auditLog({
      userId: user.UserId,
      actionType: 'LOGIN_FAILED',
      description: shouldLock ? 'Invalid password (locked)' : 'Invalid password',
      ipAddress,
    })
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  await query(
    `
    UPDATE dbo.Users
    SET FailedAttempts = 0, LockoutUntil = NULL
    WHERE UserId = @userId
    `,
    { userId: user.UserId },
  )

  if (user.TwoFactorEnabled) {
    const code = randomNumericCode6()
    const expires = new Date(Date.now() + env.security.twoFactorMinutes * 60 * 1000)
    await query(
      `
      UPDATE dbo.Users
      SET TwoFactorCode = @code, TwoFactorExpires = @expires
      WHERE UserId = @userId
      `,
      { code, expires, userId: user.UserId },
    )

    const mailResult = await sendMail({
      to: user.Email,
      subject: 'Código de verificación (2FA)',
      text: `Tu código es: ${code}. Expira en ${env.security.twoFactorMinutes} minutos.`,
    })

    if (mailResult?.skipped) {
      if (env.nodeEnv === 'production') {
        return res.status(500).json({ message: 'SMTP no configurado; no se puede enviar el código 2FA' })
      }
      // eslint-disable-next-line no-console
      console.warn(`[2FA] SMTP not configured. Code for ${user.Email}: ${code}`)
    }

    await auditLog({ userId: user.UserId, actionType: '2FA_SENT', description: '2FA code sent', ipAddress })
    return res.json({ requires2fa: true, userId: user.UserId })
  }

  const accessToken = signAccessToken({ sub: user.UserId, role: user.RoleName, username: user.Username })
  const refreshToken = signRefreshToken({ sub: user.UserId })
  const refreshHash = sha256(refreshToken)
  const refreshExpires = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000)

  await query(
    `
    INSERT INTO dbo.RefreshTokens (UserId, TokenHash, ExpiresAt)
    VALUES (@userId, @tokenHash, @expiresAt)
    `,
    { userId: user.UserId, tokenHash: refreshHash, expiresAt: refreshExpires },
  )

  await query(`UPDATE dbo.Users SET LastLogin = @lastLogin WHERE UserId = @userId`, {
    lastLogin: nowUtc(),
    userId: user.UserId,
  })

  await auditLog({ userId: user.UserId, actionType: 'LOGIN', description: 'Login success', ipAddress })
  return res.json({
    requires2fa: false,
    accessToken,
    refreshToken,
    user: {
      userId: user.UserId,
      username: user.Username,
      email: user.Email,
      firstName: user.FirstName,
      lastName: user.LastName,
      role: user.RoleName,
      tempPassword: !!user.TempPassword,
      twoFactorEnabled: !!user.TwoFactorEnabled,
    },
  })
}

async function verify2fa(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const { userId, code } = req.body

  const result = await query(
    `
    SELECT TOP 1 u.UserId, u.Username, u.Email, u.FirstName, u.LastName, u.TempPassword, u.TwoFactorCode, u.TwoFactorExpires, u.RoleId, r.RoleName
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE u.UserId = @userId
    `,
    { userId },
  )
  const user = result.recordset[0]
  if (!user) return res.status(404).json({ message: 'User not found' })

  const expires = user.TwoFactorExpires ? new Date(user.TwoFactorExpires) : null
  if (!user.TwoFactorCode || !expires || expires.getTime() < Date.now()) {
    await auditLog({ userId: user.UserId, actionType: '2FA_FAILED', description: '2FA expired', ipAddress })
    return res.status(401).json({ message: '2FA expired' })
  }
  if (String(code) !== String(user.TwoFactorCode)) {
    await auditLog({ userId: user.UserId, actionType: '2FA_FAILED', description: '2FA invalid code', ipAddress })
    return res.status(401).json({ message: 'Invalid 2FA code' })
  }

  await query(
    `
    UPDATE dbo.Users
    SET TwoFactorCode = NULL, TwoFactorExpires = NULL, LastLogin = @lastLogin
    WHERE UserId = @userId
    `,
    { userId: user.UserId, lastLogin: nowUtc() },
  )

  const accessToken = signAccessToken({ sub: user.UserId, role: user.RoleName, username: user.Username })
  const refreshToken = signRefreshToken({ sub: user.UserId })
  const refreshHash = sha256(refreshToken)
  const refreshExpires = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000)

  await query(
    `INSERT INTO dbo.RefreshTokens (UserId, TokenHash, ExpiresAt) VALUES (@userId, @tokenHash, @expiresAt)`,
    { userId: user.UserId, tokenHash: refreshHash, expiresAt: refreshExpires },
  )

  await auditLog({ userId: user.UserId, actionType: 'LOGIN', description: 'Login success (2FA)', ipAddress })
  return res.json({
    accessToken,
    refreshToken,
    user: {
      userId: user.UserId,
      username: user.Username,
      email: user.Email,
      firstName: user.FirstName,
      lastName: user.LastName,
      role: user.RoleName,
      tempPassword: !!user.TempPassword,
      twoFactorEnabled: true,
    },
  })
}

async function forgotPassword(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const { email } = req.body
  const result = await query(
    `SELECT TOP 1 UserId, Email, IsActive FROM dbo.Users WHERE Email = @email`,
    { email },
  )
  const user = result.recordset[0]
  if (!user) {
    await auditLog({ userId: null, actionType: 'FORGOT_PASSWORD', description: 'Email not found', ipAddress })
    return res.json({ message: 'If the email exists, a temporary password was sent.' })
  }
  if (!user.IsActive) {
    await auditLog({ userId: user.UserId, actionType: 'FORGOT_PASSWORD', description: 'Inactive user', ipAddress })
    return res.json({ message: 'If the email exists, a temporary password was sent.' })
  }

  const tempPasswordPlain = randomTempPassword()
  const hash = await bcrypt.hash(tempPasswordPlain, env.security.bcryptSaltRounds)
  await query(
    `
    UPDATE dbo.Users
    SET PasswordHash = @hash, TempPassword = 1
    WHERE UserId = @userId
    `,
    { hash, userId: user.UserId },
  )

  const mailResult = await sendMail({
    to: user.Email,
    subject: 'Recuperación de contraseña',
    text: `Tu contraseña temporal es: ${tempPasswordPlain}. Debes cambiarla al iniciar sesión.`,
  })

  if (mailResult?.skipped) {
    // eslint-disable-next-line no-console
    console.warn(`[MAIL] SMTP not configured. Forgot-password temp for ${user.Email}: ${tempPasswordPlain}`)
  }

  await auditLog({ userId: user.UserId, actionType: 'FORGOT_PASSWORD', description: 'Temporary password sent', ipAddress })
  return res.json({ message: 'If the email exists, a temporary password was sent.' })
}

async function changePassword(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const userId = req.user.sub
  const { currentPassword, newPassword } = req.body

  const result = await query(`SELECT TOP 1 PasswordHash FROM dbo.Users WHERE UserId = @userId`, { userId })
  const user = result.recordset[0]
  if (!user) return res.status(404).json({ message: 'User not found' })

  const ok = await bcrypt.compare(currentPassword, user.PasswordHash)
  if (!ok) {
    await auditLog({ userId, actionType: 'CHANGE_PASSWORD_FAILED', description: 'Invalid current password', ipAddress })
    return res.status(401).json({ message: 'Invalid current password' })
  }

  const hash = await bcrypt.hash(newPassword, env.security.bcryptSaltRounds)
  await query(`UPDATE dbo.Users SET PasswordHash = @hash, TempPassword = 0 WHERE UserId = @userId`, { hash, userId })
  await auditLog({ userId, actionType: 'CHANGE_PASSWORD', description: 'Password changed', ipAddress })
  return res.json({ message: 'Password changed' })
}

async function resetPassword(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const userId = req.user.sub
  const { newPassword } = req.body

  const result = await query(`SELECT TOP 1 TempPassword FROM dbo.Users WHERE UserId = @userId`, { userId })
  const user = result.recordset[0]
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (!user.TempPassword) return res.status(400).json({ message: 'Reset not required' })

  const hash = await bcrypt.hash(newPassword, env.security.bcryptSaltRounds)
  await query(`UPDATE dbo.Users SET PasswordHash = @hash, TempPassword = 0 WHERE UserId = @userId`, { hash, userId })
  await auditLog({ userId, actionType: 'RESET_PASSWORD', description: 'Password reset after temp password', ipAddress })
  return res.json({ message: 'Password reset' })
}

async function refreshToken(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const { refreshToken: token } = req.body
  let payload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    await auditLog({ userId: null, actionType: 'REFRESH_FAILED', description: 'Invalid refresh token', ipAddress })
    return res.status(401).json({ message: 'Invalid refresh token' })
  }

  const tokenHash = sha256(token)
  const userId = payload.sub
  const result = await query(
    `
    SELECT TOP 1 RefreshTokenId, ExpiresAt, RevokedAt
    FROM dbo.RefreshTokens
    WHERE UserId = @userId AND TokenHash = @tokenHash
    ORDER BY RefreshTokenId DESC
    `,
    { userId, tokenHash },
  )
  const row = result.recordset[0]
  if (!row) return res.status(401).json({ message: 'Invalid refresh token' })
  if (row.RevokedAt) return res.status(401).json({ message: 'Refresh token revoked' })
  if (new Date(row.ExpiresAt).getTime() < Date.now()) return res.status(401).json({ message: 'Refresh token expired' })

  const userResult = await query(
    `
    SELECT TOP 1 u.UserId, u.Username, u.Email, u.TempPassword, r.RoleName
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE u.UserId = @userId
    `,
    { userId },
  )
  const user = userResult.recordset[0]
  if (!user) return res.status(404).json({ message: 'User not found' })

  const accessToken = signAccessToken({ sub: user.UserId, role: user.RoleName, username: user.Username })
  await auditLog({ userId: user.UserId, actionType: 'REFRESH', description: 'Access token refreshed', ipAddress })
  return res.json({ accessToken })
}

async function logout(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const { refreshToken } = req.body
  const tokenHash = sha256(refreshToken)
  await query(
    `
    UPDATE dbo.RefreshTokens
    SET RevokedAt = SYSUTCDATETIME()
    WHERE TokenHash = @tokenHash AND RevokedAt IS NULL
    `,
    { tokenHash },
  )
  await auditLog({ userId: req.user?.sub ?? null, actionType: 'LOGOUT', description: 'Logout', ipAddress })
  return res.json({ message: 'Logged out' })
}

module.exports = { login, verify2fa, forgotPassword, changePassword, resetPassword, refreshToken, logout }
