const express = require('express')
const { authRequired } = require('../middlewares/authMiddleware')
const { requirePermission } = require('../middlewares/permissionMiddleware')
const controller = require('../controllers/contratosEmpresaController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.use(authRequired)

router.get('/lookups', requirePermission('commercial.contratos_empresa', 'read'), asyncHandler(controller.lookups))
router.get('/', requirePermission('commercial.contratos_empresa', 'read'), asyncHandler(controller.list))
router.get('/:id', requirePermission('commercial.contratos_empresa', 'read'), asyncHandler(controller.get))
router.post('/', requirePermission('commercial.contratos_empresa', 'create'), asyncHandler(controller.create))
router.put('/:id', requirePermission('commercial.contratos_empresa', 'write'), asyncHandler(controller.update))
router.delete('/:id', requirePermission('commercial.contratos_empresa', 'delete'), asyncHandler(controller.remove))
router.post(
  '/:id/:type',
  requirePermission('commercial.contratos_empresa', 'write'),
  asyncHandler(controller.addRelated),
)
router.delete(
  '/:id/:type/:relatedId',
  requirePermission('commercial.contratos_empresa', 'write'),
  asyncHandler(controller.removeRelated),
)

module.exports = { contratosEmpresaRoutes: router }
