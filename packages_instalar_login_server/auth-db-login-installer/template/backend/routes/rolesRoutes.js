const express = require('express')
const { body } = require('express-validator')
const { authRequired } = require('../middlewares/authMiddleware')
const { requireRoles } = require('../middlewares/roleMiddleware')
const controller = require('../controllers/rolesController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.get('/', authRequired, requireRoles('Super Admin', 'Admin'), asyncHandler(controller.listRoles))
router.post(
  '/',
  authRequired,
  requireRoles('Super Admin'),
  [body('roleName').isString().trim().notEmpty()],
  asyncHandler(controller.createRole),
)
router.put(
  '/:id',
  authRequired,
  requireRoles('Super Admin'),
  [body('roleName').isString().trim().notEmpty()],
  asyncHandler(controller.updateRole),
)
router.delete('/:id', authRequired, requireRoles('Super Admin'), asyncHandler(controller.deleteRole))

module.exports = { rolesRoutes: router }
