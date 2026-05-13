const { validationResult } = require('express-validator')
const { query } = require('../database/db')
const { auditLog } = require('../services/auditService')
const {
  getRolePermissions,
  updateRolePermissions,
} = require('../services/permissionService')

async function listRoles(req, res) {
  const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null
  const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null

  const where = []
  const params = {}
  if (dateFrom && !Number.isNaN(dateFrom.getTime())) {
    where.push(`CreatedAt >= @dateFrom`)
    params.dateFrom = dateFrom
  }
  if (dateTo && !Number.isNaN(dateTo.getTime())) {
    where.push(`CreatedAt <= @dateTo`)
    params.dateTo = dateTo
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const result = await query(
    `SELECT RoleId, RoleName, [Description], IsActive, CreatedAt, UpdatedAt FROM dbo.Roles ${whereSql} ORDER BY RoleId ASC`,
    params,
  )
  return res.json(result.recordset)
}

async function createRole(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  const ipAddress = req.ip
  const { roleName, description, isActive } = req.body
  const result = await query(
    `
    INSERT INTO dbo.Roles (RoleName, [Description], IsActive)
    OUTPUT INSERTED.RoleId
    VALUES (@roleName, @description, @isActive)
    `,
    { roleName, description: description ?? null, isActive: isActive ?? true },
  )
  const roleId = result.recordset[0]?.RoleId
  await auditLog({ userId: req.user.sub, actionType: 'ROLES_CREATE', description: `Created roleId=${roleId}`, ipAddress })
  return res.status(201).json({ roleId })
}

async function updateRole(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  const ipAddress = req.ip
  const id = Number(req.params.id)
  const { roleName, description, isActive } = req.body
  await query(
    `UPDATE dbo.Roles SET RoleName=@roleName, [Description]=@description, IsActive=@isActive WHERE RoleId=@id`,
    { id, roleName, description: description ?? null, isActive: !!isActive },
  )
  await auditLog({ userId: req.user.sub, actionType: 'ROLES_UPDATE', description: `Updated roleId=${id}`, ipAddress })
  return res.json({ message: 'Updated' })
}

async function deleteRole(req, res) {
  const ipAddress = req.ip
  const id = Number(req.params.id)
  await query(`DELETE FROM dbo.Roles WHERE RoleId=@id`, { id })
  await auditLog({ userId: req.user.sub, actionType: 'ROLES_DELETE', description: `Deleted roleId=${id}`, ipAddress })
  return res.json({ message: 'Deleted' })
}

async function getPermissions(req, res) {
  const id = Number(req.params.id)
  const result = await getRolePermissions(id)
  return res.json(result)
}

async function savePermissions(req, res) {
  const ipAddress = req.ip
  const id = Number(req.params.id)
  const result = await updateRolePermissions(id, req.body?.permissions || [], {
    userId: req.user.sub,
    role: req.user.role,
  })
  await auditLog({
    userId: req.user.sub,
    actionType: 'ROLES_PERMISSIONS_UPDATE',
    description: `Updated permissions roleId=${id}`,
    ipAddress,
  })
  return res.json(result)
}

module.exports = {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  savePermissions,
}
