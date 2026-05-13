export const permissionActions = [
  { key: 'create', label: 'Crear' },
  { key: 'read', label: 'Leer' },
  { key: 'write', label: 'Escribir' },
  { key: 'delete', label: 'Eliminar' },
]

export function isSecurityAdmin(role) {
  return role === 'Super Admin' || role === 'Admin'
}

export function hasPermission(user, moduleKey, action = 'read') {
  if (!moduleKey) return true
  if (user?.role === 'Super Admin') return true
  if (isSecurityAdmin(user?.role) && !user?.permissions) return true
  return !!user?.permissions?.[moduleKey]?.[action]
}

export function hasAnyPermission(user, prefix, action = 'read') {
  if (user?.role === 'Super Admin') return true
  if (isSecurityAdmin(user?.role) && !user?.permissions) return true
  const permissions = user?.permissions || {}
  return Object.entries(permissions).some(
    ([key, value]) => key.startsWith(prefix) && !!value?.[action],
  )
}

export function commercialPermissionKey(resourceKey) {
  return `commercial.${resourceKey}`
}
