const nodemailer = require('nodemailer')
const { env } = require('../config/env')

function createTransport() {
  if (!env.smtp.host) return null
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  })
}

async function sendMail({ to, subject, text }) {
  const transport = createTransport()
  if (!transport) {
    // In dev environments without SMTP, we avoid failing authentication flows.
    // Caller should still log/audit.
    return { skipped: true, reason: 'SMTP not configured (missing SMTP_HOST)' }
  }
  const from = env.smtp.from || env.smtp.user
  await transport.sendMail({ from, to, subject, text })
  return { skipped: false, reason: null }
}

module.exports = { sendMail }
