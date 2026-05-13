const {
  hasAnyPermission,
  hasPermission,
  isSecurityAdmin,
} = require('../services/permissionService')

function forbidden(res) {
  return res.status(403).json({ message: 'No tienes permisos para realizar esta accion' })
}

function requireSecurityAdmin(req, res, next) {
  if (!isSecurityAdmin(req.user?.role)) return forbidden(res)
  return next()
}

function requirePermission(moduleKeyOrResolver, action) {
  return async (req, res, next) => {
    try {
      const moduleKey =
        typeof moduleKeyOrResolver === 'function' ? moduleKeyOrResolver(req) : moduleKeyOrResolver
      const allowed = await hasPermission({
        userId: req.user?.sub,
        roleName: req.user?.role,
        moduleKey,
        action,
      })
      if (!allowed) return forbidden(res)
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

function requireAnyPermission(modulePrefix, action) {
  return async (req, res, next) => {
    try {
      const allowed = await hasAnyPermission({
        userId: req.user?.sub,
        roleName: req.user?.role,
        modulePrefix,
        action,
      })
      if (!allowed) return forbidden(res)
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

function commercialModuleKey(req) {
  return `commercial.${req.params.resource}`
}

module.exports = {
  commercialModuleKey,
  requireAnyPermission,
  requirePermission,
  requireSecurityAdmin,
}
