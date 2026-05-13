const express = require('express')
const { authRequired } = require('../middlewares/authMiddleware')
const { requireRoles } = require('../middlewares/roleMiddleware')
const controller = require('../controllers/auditController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.get('/', authRequired, requireRoles('Super Admin'), asyncHandler(controller.listAuditLogs))
router.get('/action-types', authRequired, requireRoles('Super Admin'), asyncHandler(controller.listActionTypes))

module.exports = { auditRoutes: router }
