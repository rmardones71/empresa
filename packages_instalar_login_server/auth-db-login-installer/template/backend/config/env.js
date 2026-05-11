const dotenv = require('dotenv')

dotenv.config()

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function optional(name, fallback = '') {
  const value = process.env[name]
  return value == null || value === '' ? fallback : value
}

function parseTrustProxy(rawValue) {
  if (rawValue == null || rawValue === '') return false

  const value = String(rawValue).trim().toLowerCase()
  if (value === 'false' || value === '0' || value === 'off' || value === 'no') return false

  // `true` is considered permissive by express-rate-limit; interpret it as "1 proxy"
  if (value === 'true' || value === 'on' || value === 'yes') return 1

  if (/^\d+$/.test(value)) return Number(value)

  // Pass through values like: "loopback", "linklocal", "uniquelocal", or CIDRs / IPs
  return rawValue
}

function isSeedProcess() {
  const argv = process.argv.join(' ')
  return argv.includes('seed-admin.js') || String(process.env.SEED_MODE || '').toLowerCase() === 'true'
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  appOrigins: String(process.env.APP_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    database: process.env.DB_DATABASE || 'oportunidades',
    server: required('DB_SERVER'),
    integrated: String(process.env.DB_INTEGRATED || 'false').toLowerCase() === 'true',
    user: optional('DB_USER'),
    password: optional('DB_PASSWORD'),
    port: Number(process.env.DB_PORT || 1433),
    encrypt: String(process.env.DB_ENCRYPT || 'true').toLowerCase() === 'true',
    odbcDriver: process.env.DB_ODBC_DRIVER || 'ODBC Driver 18 for SQL Server',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || '',
  },

  jwt: {
    secret: isSeedProcess() ? optional('JWT_SECRET', 'seed-only-secret') : required('JWT_SECRET'),
    refreshSecret: isSeedProcess()
      ? optional('JWT_REFRESH_SECRET', 'seed-only-refresh-secret')
      : required('JWT_REFRESH_SECRET'),
    accessTtlMinutes: 15,
    refreshTtlDays: 7,
  },

  security: {
    bcryptSaltRounds: 12,
    lockoutMinutes: 30,
    maxFailedAttempts: 5,
    twoFactorMinutes: 5,
  },
}

module.exports = { env }
