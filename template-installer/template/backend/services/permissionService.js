const { query } = require('../database/db')
const { permissionModules } = require('../security/permissionModules')

const actionColumns = {
  create: 'CanCreate',
  read: 'CanRead',
  write: 'CanWrite',
  delete: 'CanDelete',
}

function isSecurityAdmin(roleName) {
  return roleName === 'Super Admin' || roleName === 'Admin'
}

function isSuperAdmin(roleName) {
  return roleName === 'Super Admin'
}

function rowToPermission(row) {
  return {
    moduleKey: row.ModuleKey,
    moduleName: row.ModuleName,
    moduleGroup: row.ModuleGroup,
    menuPath: row.MenuPath,
    sortOrder: Number(row.SortOrder || 0),
    create: !!row.CanCreate,
    read: !!row.CanRead,
    write: !!row.CanWrite,
    delete: !!row.CanDelete,
  }
}

function normalizePermissions(rows) {
  return rows.reduce((acc, row) => {
    acc[row.ModuleKey] = {
      create: !!row.CanCreate,
      read: !!row.CanRead,
      write: !!row.CanWrite,
      delete: !!row.CanDelete,
    }
    return acc
  }, {})
}

async function syncPermissionModules() {
  for (const item of permissionModules) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      `
      MERGE dbo.SystemModules AS target
      USING (SELECT
        @moduleKey AS ModuleKey,
        @moduleName AS ModuleName,
        @moduleGroup AS ModuleGroup,
        @menuPath AS MenuPath,
        @sortOrder AS SortOrder
      ) AS source
      ON target.ModuleKey = source.ModuleKey
      WHEN MATCHED THEN
        UPDATE SET
          target.ModuleName = source.ModuleName,
          target.ModuleGroup = source.ModuleGroup,
          target.MenuPath = source.MenuPath,
          target.SortOrder = source.SortOrder,
          target.IsActive = 1,
          target.UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (ModuleKey, ModuleName, ModuleGroup, MenuPath, SortOrder, IsActive)
        VALUES (source.ModuleKey, source.ModuleName, source.ModuleGroup, source.MenuPath, source.SortOrder, 1);
      `,
      item,
    )
  }

  await query(`
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanCreate, CanRead, CanWrite, CanDelete)
    SELECT r.RoleId, m.ModuleKey, 1, 1, 1, 1
    FROM dbo.Roles r
    CROSS JOIN dbo.SystemModules m
    WHERE r.RoleName IN (N'Super Admin', N'Admin')
      AND m.IsActive = 1
      AND NOT EXISTS (
        SELECT 1
        FROM dbo.RolePermissions rp
        WHERE rp.RoleId = r.RoleId AND rp.ModuleKey = m.ModuleKey
      );
  `)
}

async function listModules() {
  await syncPermissionModules()
  const result = await query(`
    SELECT ModuleKey, ModuleName, ModuleGroup, MenuPath, SortOrder
    FROM dbo.SystemModules
    WHERE IsActive = 1
    ORDER BY SortOrder ASC, ModuleName ASC
  `)
  return result.recordset
}

async function getRole(roleId) {
  const result = await query(
    `SELECT TOP 1 RoleId, RoleName, IsActive FROM dbo.Roles WHERE RoleId = @roleId`,
    { roleId },
  )
  return result.recordset[0] || null
}

async function getRolePermissionRows(roleId) {
  await syncPermissionModules()
  const result = await query(
    `
    SELECT
      m.ModuleKey,
      m.ModuleName,
      m.ModuleGroup,
      m.MenuPath,
      m.SortOrder,
      ISNULL(rp.CanCreate, 0) AS CanCreate,
      ISNULL(rp.CanRead, 0) AS CanRead,
      ISNULL(rp.CanWrite, 0) AS CanWrite,
      ISNULL(rp.CanDelete, 0) AS CanDelete
    FROM dbo.SystemModules m
    LEFT JOIN dbo.RolePermissions rp
      ON rp.ModuleKey = m.ModuleKey AND rp.RoleId = @roleId
    WHERE m.IsActive = 1
    ORDER BY m.SortOrder ASC, m.ModuleName ASC
    `,
    { roleId },
  )
  return result.recordset
}

async function getRolePermissions(roleId) {
  const role = await getRole(roleId)
  if (!role) {
    const error = new Error('Rol no encontrado')
    error.status = 404
    throw error
  }

  const rows = await getRolePermissionRows(roleId)
  const items = rows.map((row) => {
    if (role.RoleName === 'Super Admin') {
      return rowToPermission({
        ...row,
        CanCreate: true,
        CanRead: true,
        CanWrite: true,
        CanDelete: true,
      })
    }
    return rowToPermission(row)
  })

  return {
    role: { roleId: role.RoleId, roleName: role.RoleName, isActive: !!role.IsActive },
    items,
  }
}

async function getUserPermissionMap(userId) {
  await syncPermissionModules()
  const userResult = await query(
    `
    SELECT TOP 1 u.RoleId, r.RoleName
    FROM dbo.Users u
    INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE u.UserId = @userId
    `,
    { userId },
  )
  const user = userResult.recordset[0]
  if (!user) return {}

  const rows = await getRolePermissionRows(user.RoleId)
  if (user.RoleName === 'Super Admin') {
    return rows.reduce((acc, row) => {
      acc[row.ModuleKey] = { create: true, read: true, write: true, delete: true }
      return acc
    }, {})
  }

  return normalizePermissions(rows)
}

async function updateRolePermissions(roleId, permissions, actor = {}) {
  const role = await getRole(roleId)
  if (!role) {
    const error = new Error('Rol no encontrado')
    error.status = 404
    throw error
  }

  if (role.RoleName === 'Super Admin' && actor.role !== 'Super Admin') {
    const error = new Error('Solo Super Admin puede modificar permisos de Super Admin')
    error.status = 403
    throw error
  }

  const moduleKeys = new Set((await listModules()).map((item) => item.ModuleKey))
  for (const permission of permissions || []) {
    if (!moduleKeys.has(permission.moduleKey)) continue
    // eslint-disable-next-line no-await-in-loop
    await query(
      `
      MERGE dbo.RolePermissions AS target
      USING (SELECT @roleId AS RoleId, @moduleKey AS ModuleKey) AS source
      ON target.RoleId = source.RoleId AND target.ModuleKey = source.ModuleKey
      WHEN MATCHED THEN
        UPDATE SET
          CanCreate = @canCreate,
          CanRead = @canRead,
          CanWrite = @canWrite,
          CanDelete = @canDelete,
          UpdatedBy = @updatedBy,
          UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (RoleId, ModuleKey, CanCreate, CanRead, CanWrite, CanDelete, UpdatedBy)
        VALUES (@roleId, @moduleKey, @canCreate, @canRead, @canWrite, @canDelete, @updatedBy);
      `,
      {
        roleId,
        moduleKey: permission.moduleKey,
        canCreate: role.RoleName === 'Super Admin' ? true : !!permission.create,
        canRead: role.RoleName === 'Super Admin' ? true : !!permission.read,
        canWrite: role.RoleName === 'Super Admin' ? true : !!permission.write,
        canDelete: role.RoleName === 'Super Admin' ? true : !!permission.delete,
        updatedBy: actor.userId ?? null,
      },
    )
  }

  return getRolePermissions(roleId)
}

async function hasPermission({ userId, roleName, moduleKey, action }) {
  if (isSuperAdmin(roleName)) return true
  const column = actionColumns[action]
  if (!column || !moduleKey) return false

  const result = await query(
    `
    SELECT TOP 1 rp.${column} AS Allowed
    FROM dbo.Users u
    INNER JOIN dbo.RolePermissions rp ON rp.RoleId = u.RoleId
    INNER JOIN dbo.SystemModules m ON m.ModuleKey = rp.ModuleKey AND m.IsActive = 1
    WHERE u.UserId = @userId AND rp.ModuleKey = @moduleKey
    `,
    { userId, moduleKey },
  )
  return !!result.recordset[0]?.Allowed
}

async function hasAnyPermission({ userId, roleName, modulePrefix, action }) {
  if (isSuperAdmin(roleName)) return true
  const column = actionColumns[action]
  if (!column || !modulePrefix) return false

  const result = await query(
    `
    SELECT TOP 1 rp.${column} AS Allowed
    FROM dbo.Users u
    INNER JOIN dbo.RolePermissions rp ON rp.RoleId = u.RoleId
    INNER JOIN dbo.SystemModules m ON m.ModuleKey = rp.ModuleKey AND m.IsActive = 1
    WHERE u.UserId = @userId
      AND rp.ModuleKey LIKE @modulePrefix
      AND rp.${column} = 1
    `,
    { userId, modulePrefix: `${modulePrefix}%` },
  )
  return !!result.recordset[0]?.Allowed
}

module.exports = {
  getRolePermissions,
  getUserPermissionMap,
  hasAnyPermission,
  hasPermission,
  isSecurityAdmin,
  syncPermissionModules,
  updateRolePermissions,
}
