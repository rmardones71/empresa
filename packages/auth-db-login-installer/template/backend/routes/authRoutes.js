const express = require('express')
const { body } = require('express-validator')
const { authRequired } = require('../middlewares/authMiddleware')
const controller = require('../controllers/authController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.post(
  '/login',
  [body('login').isString().trim().notEmpty(), body('password').isString().notEmpty()],
  asyncHandler(controller.login),
)

router.post(
  '/verify-2fa',
  [body('userId').isInt({ min: 1 }), body('code').isString().trim().isLength({ min: 6, max: 6 })],
  asyncHandler(controller.verify2fa),
)

router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  asyncHandler(controller.forgotPassword),
)

router.post(
  '/reset-password',
  authRequired,
  [body('newPassword').isString().isLength({ min: 6 })],
  asyncHandler(controller.resetPassword),
)

router.post(
  '/change-password',
  authRequired,
  [body('currentPassword').isString().notEmpty(), body('newPassword').isString().isLength({ min: 6 })],
  asyncHandler(controller.changePassword),
)

router.post(
  '/refresh-token',
  [body('refreshToken').isString().notEmpty()],
  asyncHandler(controller.refreshToken),
)

router.post('/logout', authRequired, [body('refreshToken').isString().notEmpty()], asyncHandler(controller.logout))

module.exports = { authRoutes: router }
