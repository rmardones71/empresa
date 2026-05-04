/* eslint-disable no-console */
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')

dotenv.config()

function getArg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

function usage() {
  console.log('Usage:')
  console.log('  npm run test:smtp -- --to destinatario@dominio.com')
  console.log('  npm run test:smtp -- destinatario@dominio.com')
  console.log('')
  console.log('Env vars used:')
  console.log('  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM')
}

async function main() {
  const to = getArg('--to') || process.argv[2] || process.env.SMTP_USER || ''
  if (!to) {
    usage()
    process.exit(2)
  }

  const host = process.env.SMTP_HOST || ''
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  const from = process.env.MAIL_FROM || user

  if (!host) {
    console.error('ERROR: SMTP_HOST is empty. Configure backend/.env first.')
    process.exit(2)
  }
  if (!from) {
    console.error('ERROR: MAIL_FROM (or SMTP_USER) is required.')
    process.exit(2)
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  })

  const now = new Date()
  const subject = `SMTP test - ${now.toISOString()}`
  const text = `SMTP test OK (${now.toISOString()})`

  console.log(`Sending test email to: ${to}`)
  console.log(`SMTP: ${host}:${port} (secure=${port === 465}) user=${user || '(none)'}`)

  try {
    const info = await transport.sendMail({ from, to, subject, text })
    console.log('OK: email sent')
    console.log(`MessageId: ${info.messageId || '(none)'}`)
  } catch (e) {
    console.error('ERROR: failed to send email')
    console.error(e && e.message ? e.message : e)
    process.exit(1)
  }
}

main()

