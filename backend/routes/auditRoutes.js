const express = require('express')
const { authRequired } = require('../middlewares/authMiddleware')
const { requirePermission } = require('../middlewares/permissionMiddleware')
const controller = require('../controllers/auditController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.get('/', authRequired, requirePermission('admin.audit', 'read'), asyncHandler(controller.listAuditLogs))
router.get(
  '/action-types',
  authRequired,
  requirePermission('admin.audit', 'read'),
  asyncHandler(controller.listActionTypes),
)

module.exports = { auditRoutes: router }
