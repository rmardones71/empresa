const express = require('express')
const { body } = require('express-validator')
const { authRequired } = require('../middlewares/authMiddleware')
const { requireRoles } = require('../middlewares/roleMiddleware')
const controller = require('../controllers/usersController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.get('/me', authRequired, asyncHandler(controller.getMe))

router.get('/', authRequired, requireRoles('Super Admin', 'Admin'), asyncHandler(controller.listUsers))
router.get('/:id', authRequired, requireRoles('Super Admin', 'Admin'), asyncHandler(controller.getUser))

router.put(
  '/me',
  authRequired,
  [
    body('email').isEmail().normalizeEmail(),
    body('firstName').optional({ nullable: true }).isString().trim(),
    body('lastName').optional({ nullable: true }).isString().trim(),
  ],
  asyncHandler(controller.updateMe),
)

router.post(
  '/',
  authRequired,
  requireRoles('Super Admin', 'Admin'),
  [
    body('username').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6 }),
    body('photoDataUrl').optional({ nullable: true }).isString(),
    body('roleId').isInt({ min: 1 }),
  ],
  asyncHandler(controller.createUser),
)

router.put(
  '/:id',
  authRequired,
  requireRoles('Super Admin', 'Admin'),
  [
    body('username').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('photoDataUrl').optional({ nullable: true }).isString(),
    body('roleId').isInt({ min: 1 }),
  ],
  asyncHandler(controller.updateUser),
)

router.delete('/:id', authRequired, requireRoles('Super Admin'), asyncHandler(controller.deleteUser))
router.patch('/:id/toggle-2fa', authRequired, requireRoles('Super Admin', 'Admin'), asyncHandler(controller.toggle2fa))
router.patch(
  '/:id/toggle-status',
  authRequired,
  requireRoles('Super Admin', 'Admin'),
  asyncHandler(controller.toggleStatus),
)

module.exports = { usersRoutes: router }
