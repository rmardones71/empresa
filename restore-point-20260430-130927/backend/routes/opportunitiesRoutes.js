const express = require('express')
const { authRequired } = require('../middlewares/authMiddleware')
const { requireRoles } = require('../middlewares/roleMiddleware')
const { asyncHandler } = require('../utils/asyncHandler')
const controller = require('../controllers/opportunitiesController')
const v = require('../validators/opportunitiesValidator')

const router = express.Router()

// RBAC: allow Admin/Supervisor/Ejecutivo mapped to existing roles
router.get('/stages', authRequired, requireRoles('Super Admin', 'Admin', 'User'), asyncHandler(controller.listStages))
router.get('/dashboard', authRequired, requireRoles('Super Admin', 'Admin', 'User'), asyncHandler(controller.dashboard))
router.get('/kanban', authRequired, requireRoles('Super Admin', 'Admin', 'User'), asyncHandler(controller.kanban))
router.get('/', authRequired, requireRoles('Super Admin', 'Admin', 'User'), v.listValidator, asyncHandler(controller.list))

router.post('/', authRequired, requireRoles('Super Admin', 'Admin', 'User'), v.createOpportunityValidator, asyncHandler(controller.create))
router.put('/:id', authRequired, requireRoles('Super Admin', 'Admin', 'User'), v.updateOpportunityValidator, asyncHandler(controller.update))
router.delete('/:id', authRequired, requireRoles('Super Admin', 'Admin'), asyncHandler(controller.remove))
router.patch('/:id/move-stage', authRequired, requireRoles('Super Admin', 'Admin', 'User'), v.moveStageValidator, asyncHandler(controller.moveStage))

module.exports = { opportunitiesRoutes: router }
