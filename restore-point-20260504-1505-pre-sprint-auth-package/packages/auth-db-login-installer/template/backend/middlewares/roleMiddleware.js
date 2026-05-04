function requireRoles(...roles) {
  const allowed = new Set(roles)
  return (req, res, next) => {
    const roleName = req.user?.role
    if (!roleName) return res.status(403).json({ message: 'Forbidden' })
    if (!allowed.has(roleName)) return res.status(403).json({ message: 'Forbidden' })
    return next()
  }
}

module.exports = { requireRoles }

