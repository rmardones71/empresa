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

  const offset = (page - 1) * pageSize

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
      u.UserId, u.Username, u.Email, u.FirstName, u.LastName, u.Phone,
      r.RoleName AS Role,
      u.IsActive, u.TwoFactorEnabled, u.TempPassword,
      u.LastLogin, u.CreatedAt
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    ${whereSql}
    ORDER BY u.UserId DESC
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
      u.UserId, u.Username, u.Email, u.FirstName, u.LastName, u.Phone,
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
  const { username, email, password, firstName, lastName, phone, roleId, isActive, twoFactorEnabled } = req.body

  const hash = await bcrypt.hash(password, env.security.bcryptSaltRounds)
  const result = await query(
    `
    INSERT INTO dbo.Users (Username, Email, PasswordHash, FirstName, LastName, Phone, RoleId, IsActive, TwoFactorEnabled, TempPassword)
    OUTPUT INSERTED.UserId
    VALUES (@username, @email, @hash, @firstName, @lastName, @phone, @roleId, @isActive, @twoFactorEnabled, 0)
    `,
    { username, email, hash, firstName: firstName ?? null, lastName: lastName ?? null, phone: phone ?? null, roleId, isActive: !!isActive, twoFactorEnabled: !!twoFactorEnabled },
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
  const { username, email, firstName, lastName, phone, roleId, isActive, twoFactorEnabled } = req.body

  await query(
    `
    UPDATE dbo.Users
    SET Username=@username, Email=@email, FirstName=@firstName, LastName=@lastName, Phone=@phone,
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

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, toggle2fa, toggleStatus }

