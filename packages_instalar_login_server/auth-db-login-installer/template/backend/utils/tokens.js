const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { env } = require('../config/env')

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: `${env.jwt.accessTtlMinutes}m` })
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: `${env.jwt.refreshTtlDays}d` })
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret)
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret)
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  sha256,
}

