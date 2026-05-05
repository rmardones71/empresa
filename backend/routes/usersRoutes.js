const express = require('express')
const { body } = require('express-validator')
const { authRequired } = require('../middlewares/authMiddleware')
const { requirePermission } = require('../middlewares/permissionMiddleware')
const controller = require('../controllers/usersController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.get('/me', authRequired, asyncHandler(controller.getMe))

router.get('/', authRequired, requirePermission('admin.users', 'read'), asyncHandler(controller.listUsers))
router.get('/:id', authRequired, requirePermission('admin.users', 'read'), asyncHandler(controller.getUser))

router.put(
  '/me',
  authRequired,
  [
    body('email').isEmail().withMessage('Ingresa un email válido').normalizeEmail(),
    body('firstName').optional({ nullable: true }).isString().trim(),
    body('lastName').optional({ nullable: true }).isString().trim(),
    body('photoDataUrl').optional({ nullable: true }).isString(),
  ],
  asyncHandler(controller.updateMe),
)

router.post(
  '/',
  authRequired,
  requirePermission('admin.users', 'create'),
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
  requirePermission('admin.users', 'write'),
  [
    body('username').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('photoDataUrl').optional({ nullable: true }).isString(),
    body('roleId').isInt({ min: 1 }),
  ],
  asyncHandler(controller.updateUser),
)

router.delete('/:id', authRequired, requirePermission('admin.users', 'delete'), asyncHandler(controller.deleteUser))
router.patch('/:id/toggle-2fa', authRequired, requirePermission('admin.users', 'write'), asyncHandler(controller.toggle2fa))
router.patch(
  '/:id/toggle-status',
  authRequired,
  requirePermission('admin.users', 'write'),
  asyncHandler(controller.toggleStatus),
)

module.exports = { usersRoutes: router }
