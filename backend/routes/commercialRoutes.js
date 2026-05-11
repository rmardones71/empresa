const express = require('express')
const { authRequired } = require('../middlewares/authMiddleware')
const {
  commercialModuleKey,
  requireAnyPermission,
  requirePermission,
  requireSecurityAdmin,
} = require('../middlewares/permissionMiddleware')
const controller = require('../controllers/commercialController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.use(authRequired)

router.get('/lookups', requireAnyPermission('commercial.', 'read'), asyncHandler(controller.lookups))
router.post(
  '/uploads',
  requireAnyPermission('commercial.', 'create'),
  asyncHandler(controller.uploadFile),
)
router.get(
  '/logs/:resource/:id',
  requirePermission(commercialModuleKey, 'read'),
  asyncHandler(controller.listChangeLog),
)
router.get('/:resource', requirePermission(commercialModuleKey, 'read'), asyncHandler(controller.list))
router.get('/:resource/:id', requirePermission(commercialModuleKey, 'read'), asyncHandler(controller.get))
router.post('/:resource', requirePermission(commercialModuleKey, 'create'), asyncHandler(controller.create))
router.put('/:resource/:id', requirePermission(commercialModuleKey, 'write'), asyncHandler(controller.update))
router.delete(
  '/:resource/:id',
  (req, res, next) =>
    req.params.resource === 'contratos_empresa' ? requireSecurityAdmin(req, res, next) : next(),
  requirePermission(commercialModuleKey, 'delete'),
  asyncHandler(controller.remove),
)

module.exports = { commercialRoutes: router }
