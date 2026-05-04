const bcrypt = require('bcrypt')
const { validationResult } = require('express-validator')
const { env } = require('../config/env')
const { query } = require('../database/db')
const { auditLog } = require('../services/auditService')

async function listUsers(req, res) {
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize || 20)))
  const q = String(req.query.q || '').trim()
  const role = String(req.query.role || '').trim()
  const sortBy = String(req.query.sortBy || 'userId')
  const sortDir = String(req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC'
  const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null
  const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null

  const offset = (page - 1) * pageSize
  const sortColumns = {
    userId: 'u.UserId',
    username: 'u.Username',
    email: 'u.Email',
    firstName: 'u.FirstName',
    lastName: 'u.LastName',
    phone: 'u.Phone',
    role: 'r.RoleName',
    isActive: 'u.IsActive',
    twoFactorEnabled: 'u.TwoFactorEnabled',
    lastLogin: 'u.LastLogin',
    createdAt: 'u.CreatedAt',
  }
  const orderBy = sortColumns[sortBy] || sortColumns.userId
  const tieBreaker = orderBy === sortColumns.userId ? '' : ', u.UserId DESC'

  const where = []
  const params = { offset, pageSize }
  if (q) {
    where.push(
      `(u.Username LIKE @q OR u.Email LIKE @q OR u.FirstName LIKE @q OR u.LastName LIKE @q)`,
    )
    params.q = `%${q}%`
  }
  if (role) {
    where.push(`r.RoleName = @role`)
    params.role = role
  }
  if (dateFrom && !Number.isNaN(dateFrom.getTime())) {
    where.push(`u.CreatedAt >= @dateFrom`)
    params.dateFrom = dateFrom
  }
  if (dateTo && !Number.isNaN(dateTo.getTime())) {
    where.push(`u.CreatedAt <= @dateTo`)
    params.dateTo = dateTo
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const totalResult = await query(
    `
    SELECT COUNT(1) AS Total
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    ${whereSql}
    `,
    params,
  )
  const total = Number(totalResult.recordset[0]?.Total || 0)

  const result = await query(
    `
    SELECT
      u.UserId, u.Username, u.Email, u.FirstName, u.LastName, u.Phone, u.PhotoDataUrl,
      r.RoleName AS Role,
      u.IsActive, u.TwoFactorEnabled, u.TempPassword,
      u.LastLogin, u.CreatedAt
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    ${whereSql}
    ORDER BY ${orderBy} ${sortDir}${tieBreaker}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
    params,
  )

  return res.json({ page, pageSize, total, items: result.recordset })
}

async function getUser(req, res) {
  const id = Number(req.params.id)
  const result = await query(
    `
    SELECT TOP 1
      u.UserId, u.Username, u.Email, u.FirstName, u.LastName, u.Phone, u.PhotoDataUrl,
      u.RoleId, r.RoleName AS Role,
      u.IsActive, u.TwoFactorEnabled, u.TempPassword,
      u.LastLogin, u.CreatedAt
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE u.UserId = @id
    `,
    { id },
  )
  const user = result.recordset[0]
  if (!user) return res.status(404).json({ message: 'Not found' })
  return res.json(user)
}

async function createUser(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const {
    username,
    email,
    password,
    firstName,
    lastName,
    phone,
    photoDataUrl,
    roleId,
    isActive,
    twoFactorEnabled,
  } = req.body

  const hash = await bcrypt.hash(password, env.security.bcryptSaltRounds)
  const result = await query(
    `
    INSERT INTO dbo.Users (Username, Email, PasswordHash, FirstName, LastName, Phone, PhotoDataUrl, RoleId, IsActive, TwoFactorEnabled, TempPassword)
    OUTPUT INSERTED.UserId
    VALUES (@username, @email, @hash, @firstName, @lastName, @phone, @photoDataUrl, @roleId, @isActive, @twoFactorEnabled, 0)
    `,
    {
      username,
      email,
      hash,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      phone: phone ?? null,
      photoDataUrl: photoDataUrl ?? null,
      roleId,
      isActive: !!isActive,
      twoFactorEnabled: !!twoFactorEnabled,
    },
  )

  const userId = result.recordset[0]?.UserId
  await auditLog({ userId: req.user.sub, actionType: 'USERS_CREATE', description: `Created userId=${userId}`, ipAddress })
  return res.status(201).json({ userId })
}

async function updateUser(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const id = Number(req.params.id)
  const { username, email, firstName, lastName, phone, photoDataUrl, roleId, isActive, twoFactorEnabled } = req.body

  await query(
    `
    UPDATE dbo.Users
    SET Username=@username, Email=@email, FirstName=@firstName, LastName=@lastName, Phone=@phone,
        PhotoDataUrl=@photoDataUrl,
        RoleId=@roleId, IsActive=@isActive, TwoFactorEnabled=@twoFactorEnabled
    WHERE UserId=@id
    `,
    {
      id,
      username,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      phone: phone ?? null,
      photoDataUrl: photoDataUrl ?? null,
      roleId,
      isActive: !!isActive,
      twoFactorEnabled: !!twoFactorEnabled,
    },
  )
  await auditLog({ userId: req.user.sub, actionType: 'USERS_UPDATE', description: `Updated userId=${id}`, ipAddress })
  return res.json({ message: 'Updated' })
}

async function deleteUser(req, res) {
  const ipAddress = req.ip
  const id = Number(req.params.id)
  await query(`DELETE FROM dbo.Users WHERE UserId=@id`, { id })
  await auditLog({ userId: req.user.sub, actionType: 'USERS_DELETE', description: `Deleted userId=${id}`, ipAddress })
  return res.json({ message: 'Deleted' })
}

async function toggle2fa(req, res) {
  const ipAddress = req.ip
  const id = Number(req.params.id)
  await query(
    `UPDATE dbo.Users SET TwoFactorEnabled = IIF(TwoFactorEnabled=1,0,1) WHERE UserId=@id`,
    { id },
  )
  await auditLog({ userId: req.user.sub, actionType: 'USERS_TOGGLE_2FA', description: `Toggled 2FA userId=${id}`, ipAddress })
  return res.json({ message: 'OK' })
}

async function toggleStatus(req, res) {
  const ipAddress = req.ip
  const id = Number(req.params.id)
  await query(`UPDATE dbo.Users SET IsActive = IIF(IsActive=1,0,1) WHERE UserId=@id`, { id })
  await auditLog({ userId: req.user.sub, actionType: 'USERS_TOGGLE_STATUS', description: `Toggled status userId=${id}`, ipAddress })
  return res.json({ message: 'OK' })
}

async function getMe(req, res) {
  const userId = req.user.sub
  const result = await query(
    `
    SELECT TOP 1
      u.UserId, u.Username, u.Email, u.FirstName, u.LastName, u.PhotoDataUrl,
      r.RoleName AS Role,
      u.IsActive, u.TwoFactorEnabled, u.LastLogin, u.CreatedAt
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE u.UserId = @userId
    `,
    { userId },
  )
  const user = result.recordset[0]
  if (!user) return res.status(404).json({ message: 'User not found' })
  return res.json({
    userId: user.UserId,
    username: user.Username,
    email: user.Email,
    firstName: user.FirstName,
    lastName: user.LastName,
    photoDataUrl: user.PhotoDataUrl,
    role: user.Role,
    twoFactorEnabled: !!user.TwoFactorEnabled,
    lastLogin: user.LastLogin,
    createdAt: user.CreatedAt,
  })
}

async function updateMe(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const ipAddress = req.ip
  const userId = req.user.sub
  const { email, firstName, lastName, photoDataUrl } = req.body

  await query(
    `
    UPDATE dbo.Users
    SET Email=@email, FirstName=@firstName, LastName=@lastName, PhotoDataUrl=@photoDataUrl
    WHERE UserId=@userId
    `,
    { userId, email, firstName: firstName ?? null, lastName: lastName ?? null, photoDataUrl: photoDataUrl ?? null },
  )

  await auditLog({ userId, actionType: 'USERS_UPDATE_SELF', description: 'Updated own profile', ipAddress })

  const result = await query(
    `
    SELECT TOP 1
      u.UserId, u.Username, u.Email, u.FirstName, u.LastName, u.PhotoDataUrl,
      r.RoleName AS Role,
      u.TempPassword, u.TwoFactorEnabled
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE u.UserId = @userId
    `,
    { userId },
  )
  const user = result.recordset[0]
  if (!user) return res.status(404).json({ message: 'User not found' })

  return res.json({
    message: 'Updated',
    user: {
      userId: user.UserId,
      username: user.Username,
      email: user.Email,
      firstName: user.FirstName,
      lastName: user.LastName,
      photoDataUrl: user.PhotoDataUrl,
      role: user.Role,
      tempPassword: !!user.TempPassword,
      twoFactorEnabled: !!user.TwoFactorEnabled,
    },
  })
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, toggle2fa, toggleStatus, getMe, updateMe }
