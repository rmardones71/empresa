const express = require('express')
const { authRequired } = require('../middlewares/authMiddleware')
const { requireRoles } = require('../middlewares/roleMiddleware')
const controller = require('../controllers/commercialController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.use(authRequired, requireRoles('Super Admin', 'Admin'))

router.get('/lookups', asyncHandler(controller.lookups))
router.get('/:resource', asyncHandler(controller.list))
router.get('/:resource/:id', asyncHandler(controller.get))
router.post('/:resource', asyncHandler(controller.create))
router.put('/:resource/:id', asyncHandler(controller.update))
router.delete('/:resource/:id', asyncHandler(controller.remove))

module.exports = { commercialRoutes: router }
