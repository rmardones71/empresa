const crypto = require('crypto')

function randomNumericCode6() {
  const n = crypto.randomInt(0, 1000000)
  return String(n).padStart(6, '0')
}

function randomTempPassword() {
  return crypto.randomBytes(9).toString('base64url') // ~12 chars
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url')
}

module.exports = { randomNumericCode6, randomTempPassword, randomToken }

