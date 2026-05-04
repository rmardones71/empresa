#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const packageRoot = __dirname
const templateBackend = path.join(packageRoot, 'template', 'backend')

const defaults = {
  targetRoot: process.argv[2] ? path.resolve(process.argv[2]) : process.cwd(),
  backendFolder: 'backend',
  port: '4000',
  appOrigin: 'http://localhost:3000,http://localhost:3001',
  dbServer: 'D-RICHARD-M',
  dbDatabase: 'oportunidades',
  dbPort: '1433',
  dbIntegrated: 'true',
  dbUser: '',
  dbPassword: '',
  dbOdbcDriver: 'ODBC Driver 18 for SQL Server',
  dbEncrypt: 'false',
  smtpHost: 'smtp.office365.com',
  smtpPort: '587',
  smtpUser: 'rmardones@ucmchile.com',
  smtpPass: '',
  mailFrom: 'CRM Oportunidades <rmardones@ucmchile.com>',
  adminUsername: 'admin',
  adminEmail: 'rmardones@ucmchile.com',
  adminPassword: '123456',
}

function randomSecret() {
  return crypto.randomBytes(48).toString('hex')
}

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function ask(rl, label, fallback) {
  const suffix = fallback ? ` [${fallback}]` : ''
  return new Promise((resolve) => {
    rl.question(`${label}${suffix}: `, (answer) => {
      const value = String(answer || '').trim()
      resolve(value || fallback)
    })
  })
}

function askSecret(rl, label, fallback) {
  const suffix = fallback ? ' [configurado]' : ' [vacio]'
  return new Promise((resolve) => {
    rl.question(`${label}${suffix}: `, (answer) => {
      const value = String(answer || '').trim()
      resolve(value || fallback)
    })
  })
}

function yes(value) {
  return ['s', 'si', 'y', 'yes'].includes(String(value || '').trim().toLowerCase())
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function copyDir(source, destination) {
  ensureDir(destination)

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath)
      continue
    }

    fs.copyFileSync(sourcePath, destinationPath)
  }
}

function writeEnv(destination, config) {
  const lines = [
    `DB_SERVER=${config.dbServer}`,
    `DB_DATABASE=${config.dbDatabase}`,
    `DB_PORT=${config.dbPort}`,
    `DB_INTEGRATED=${config.dbIntegrated}`,
    `DB_USER=${config.dbUser}`,
    `DB_PASSWORD=${config.dbPassword}`,
    `DB_ODBC_DRIVER=${config.dbOdbcDriver}`,
    `DB_ENCRYPT=${config.dbEncrypt}`,
    '',
    `JWT_SECRET=${config.jwtSecret}`,
    `JWT_REFRESH_SECRET=${config.jwtRefreshSecret}`,
    '',
    `APP_ORIGIN=${config.appOrigin}`,
    `PORT=${config.port}`,
    '',
    `SMTP_HOST=${config.smtpHost}`,
    `SMTP_PORT=${config.smtpPort}`,
    `SMTP_USER=${config.smtpUser}`,
    `SMTP_PASS=${config.smtpPass}`,
    `MAIL_FROM=${config.mailFrom}`,
    '',
    `INITIAL_ADMIN_USERNAME=${config.adminUsername}`,
    `INITIAL_ADMIN_EMAIL=${config.adminEmail}`,
    `INITIAL_ADMIN_PASSWORD=${config.adminPassword}`,
    '',
  ]

  fs.writeFileSync(destination, `${lines.join('\n')}`, 'utf8')
}

async function main() {
  if (!fs.existsSync(templateBackend)) {
    throw new Error(`No se encontro la plantilla backend en: ${templateBackend}`)
  }

  const rl = createPrompt()

  console.log('')
  console.log('Instalador Auth + SQL Server')
  console.log('Presiona Enter para aceptar los valores predeterminados.')
  console.log('')

  const targetRoot = path.resolve(await ask(rl, 'Carpeta raiz del proyecto destino', defaults.targetRoot))
  const backendFolder = await ask(rl, 'Nombre/carpeta del backend a instalar', defaults.backendFolder)
  const backendDestination = path.resolve(targetRoot, backendFolder)

  if (fs.existsSync(backendDestination) && fs.readdirSync(backendDestination).length > 0) {
    const overwrite = await ask(
      rl,
      `La carpeta ${backendDestination} ya existe. Deseas fusionar/sobrescribir archivos? (s/N)`,
      'N',
    )
    if (!yes(overwrite)) {
      rl.close()
      console.log('Instalacion cancelada sin cambios.')
      return
    }
  }

  console.log('')
  console.log('Conexion SQL Server')
  const dbServer = await ask(rl, 'DB_SERVER', defaults.dbServer)
  const dbDatabase = await ask(rl, 'DB_DATABASE', defaults.dbDatabase)
  const dbPort = await ask(rl, 'DB_PORT', defaults.dbPort)
  const dbIntegrated = await ask(rl, 'DB_INTEGRATED (true Windows Auth / false SQL Auth)', defaults.dbIntegrated)
  const dbUser = await ask(rl, 'DB_USER', defaults.dbUser)
  const dbPassword = await askSecret(rl, 'DB_PASSWORD', defaults.dbPassword)
  const dbOdbcDriver = await ask(rl, 'DB_ODBC_DRIVER', defaults.dbOdbcDriver)
  const dbEncrypt = await ask(rl, 'DB_ENCRYPT', defaults.dbEncrypt)

  console.log('')
  console.log('Aplicacion y seguridad')
  const port = await ask(rl, 'PORT', defaults.port)
  const appOrigin = await ask(rl, 'APP_ORIGIN', defaults.appOrigin)
  const jwtSecret = await askSecret(rl, 'JWT_SECRET', randomSecret())
  const jwtRefreshSecret = await askSecret(rl, 'JWT_REFRESH_SECRET', randomSecret())

  console.log('')
  console.log('Usuario administrador inicial')
  const adminUsername = await ask(rl, 'INITIAL_ADMIN_USERNAME', defaults.adminUsername)
  const adminEmail = await ask(rl, 'INITIAL_ADMIN_EMAIL', defaults.adminEmail)
  const adminPassword = await askSecret(rl, 'INITIAL_ADMIN_PASSWORD', defaults.adminPassword)

  console.log('')
  console.log('SMTP opcional')
  const smtpHost = await ask(rl, 'SMTP_HOST', defaults.smtpHost)
  const smtpPort = await ask(rl, 'SMTP_PORT', defaults.smtpPort)
  const smtpUser = await ask(rl, 'SMTP_USER', defaults.smtpUser)
  const smtpPass = await askSecret(rl, 'SMTP_PASS', defaults.smtpPass)
  const mailFrom = await ask(rl, 'MAIL_FROM', defaults.mailFrom)

  rl.close()

  ensureDir(targetRoot)
  copyDir(templateBackend, backendDestination)

  const envPath = path.join(backendDestination, '.env')
  if (fs.existsSync(envPath)) {
    const generatedEnvPath = path.join(backendDestination, '.env.generated')
    writeEnv(generatedEnvPath, {
      dbServer,
      dbDatabase,
      dbPort,
      dbIntegrated,
      dbUser,
      dbPassword,
      dbOdbcDriver,
      dbEncrypt,
      port,
      appOrigin,
      jwtSecret,
      jwtRefreshSecret,
      adminUsername,
      adminEmail,
      adminPassword,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      mailFrom,
    })
    console.log(`Se genero ${generatedEnvPath} porque ya existia un .env.`)
  } else {
    writeEnv(envPath, {
      dbServer,
      dbDatabase,
      dbPort,
      dbIntegrated,
      dbUser,
      dbPassword,
      dbOdbcDriver,
      dbEncrypt,
      port,
      appOrigin,
      jwtSecret,
      jwtRefreshSecret,
      adminUsername,
      adminEmail,
      adminPassword,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      mailFrom,
    })
  }

  console.log('')
  console.log('Instalacion completada.')
  console.log(`Backend instalado en: ${backendDestination}`)
  console.log('')
  console.log('Siguientes pasos:')
  console.log(`  cd "${backendDestination}"`)
  console.log('  npm install')
  console.log('  npm run seed')
  console.log('  npm run dev')
  console.log('')
  console.log('Credenciales iniciales:')
  console.log(`  Usuario: ${adminUsername}`)
  console.log(`  Password: ${adminPassword}`)
}

main().catch((error) => {
  console.error('')
  console.error(`Error: ${error.message}`)
  process.exit(1)
})
