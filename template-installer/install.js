#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const bcrypt = require('bcrypt')

const installerRoot = __dirname
const templateRoot = path.join(installerRoot, 'template')
const templateBackend = path.join(templateRoot, 'backend')
const templateFrontend = path.join(templateRoot, 'Frontend')

const currentDefaults = {
  targetRoot: process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'base-installer'),
  backendFolder: 'backend',
  frontendFolder: 'Frontend',
  appEnvironment: 'Desarrollo',
  appOrigin: 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003',
  backendPort: '4001',
  frontendApiUrl: 'http://localhost:4001',
  dbServer: '127.0.0.1',
  dbInstance: '',
  dbPort: '1433',
  dbDatabase: 'oportunidades',
  dbIntegrated: 'false',
  dbUser: 'app_user',
  dbPassword: '123456',
  dbOdbcDriver: 'ODBC Driver 18 for SQL Server',
  dbEncrypt: 'false',
  adminUsername: 'admin',
  adminEmail: 'admin@example.local',
  adminPassword: '123456',
}

function randomSecret() {
  return crypto.randomBytes(48).toString('hex')
}

function prompt() {
  return readline.createInterface({ input: process.stdin, output: process.stdout })
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
  const suffix = fallback ? ' [valor actual detectado]' : ''
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
    if (['node_modules', 'build', '.tmp', 'uploads'].includes(entry.name)) continue
    if (entry.name.endsWith('.log')) continue

    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, entry.name)
    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath)
    } else {
      fs.copyFileSync(sourcePath, destinationPath)
    }
  }
}

function sqlConfig(config, database) {
  const integrated = String(config.dbIntegrated).toLowerCase() === 'true'
  const serverWithInstance = config.dbInstance
    ? `${config.dbServer}\\${config.dbInstance}`
    : config.dbServer
  const sql = integrated ? require('mssql/msnodesqlv8') : require('mssql')
  const common = {
    server: serverWithInstance,
    database,
    port: Number(config.dbPort || 1433),
    options: {
      encrypt: String(config.dbEncrypt).toLowerCase() === 'true',
      trustServerCertificate: true,
    },
  }

  if (integrated) {
    const server = config.dbPort ? `${serverWithInstance},${config.dbPort}` : serverWithInstance
    return {
      sql,
      config: {
        ...common,
        connectionString: `Driver={${config.dbOdbcDriver}};Server=${server};Database=${database};Trusted_Connection=Yes;Encrypt=${String(config.dbEncrypt).toLowerCase() === 'true' ? 'Yes' : 'No'};TrustServerCertificate=Yes;`,
      },
    }
  }

  return { sql, config: { ...common, user: config.dbUser, password: config.dbPassword } }
}

async function runBatches(pool, sqlText) {
  const batches = sqlText
    .split(/\r?\nGO\r?\n/gi)
    .map((batch) => batch.trim())
    .filter(Boolean)

  for (const batch of batches) {
    await pool.request().query(batch)
  }
}

async function ensureDatabase(config) {
  const masterConnection = sqlConfig(config, 'master')
  const pool = await masterConnection.sql.connect(masterConnection.config)
  try {
    const exists = await pool
      .request()
      .input('databaseName', config.dbDatabase)
      .query('SELECT DB_ID(@databaseName) AS DatabaseId')

    if (exists.recordset[0].DatabaseId) return true

    const create = await ask(
      config.rl,
      `La base ${config.dbDatabase} no existe. Desea crearla? (s/N)`,
      'N',
    )
    if (!yes(create)) return false

    const newName = await ask(config.rl, 'Nombre de la nueva base de datos', config.dbDatabase)
    config.dbDatabase = newName
    const safeName = `[${newName.replaceAll(']', ']]')}]`
    await pool.request().query(`CREATE DATABASE ${safeName}`)
    return true
  } finally {
    await pool.close()
  }
}

async function setupDatabase(config) {
  const connection = sqlConfig(config, config.dbDatabase)
  const pool = await connection.sql.connect(connection.config)
  try {
    const schema = fs.readFileSync(path.join(templateBackend, 'database', 'auth-schema.sql'), 'utf8')
    const seedTemplate = fs.readFileSync(path.join(templateBackend, 'database', 'seed-auth.sql'), 'utf8')
    const adminHash = await bcrypt.hash(config.adminPassword, 12)
    const seed = seedTemplate
      .replaceAll('__ENVIRONMENT__', config.appEnvironment)
      .replaceAll('__DB_SERVER__', config.dbServer)
      .replaceAll('__DB_DATABASE__', config.dbDatabase)
      .replaceAll('__ADMIN_USERNAME__', config.adminUsername.replaceAll("'", "''"))
      .replaceAll('__ADMIN_EMAIL__', config.adminEmail.replaceAll("'", "''"))
      .replaceAll('__ADMIN_PASSWORD_HASH__', adminHash.replaceAll("'", "''"))

    await runBatches(pool, schema)
    await runBatches(pool, seed)
  } finally {
    await pool.close()
  }
}

function writeBackendEnv(destination, config) {
  const server = config.dbInstance ? `${config.dbServer}\\${config.dbInstance}` : config.dbServer
  const lines = [
    `DB_SERVER=${server}`,
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
    `APP_ENVIRONMENT=${config.appEnvironment}`,
    `PORT=${config.backendPort}`,
    '',
    `INITIAL_ADMIN_USERNAME=${config.adminUsername}`,
    `INITIAL_ADMIN_EMAIL=${config.adminEmail}`,
    `INITIAL_ADMIN_PASSWORD=${config.adminPassword}`,
    '',
  ]
  fs.writeFileSync(destination, lines.join('\n'), 'utf8')
}

function writeFrontendEnv(destination, config) {
  fs.writeFileSync(destination, `VITE_API_BASE_URL=${config.frontendApiUrl}\n`, 'utf8')
}

async function main() {
  if (!fs.existsSync(templateBackend) || !fs.existsSync(templateFrontend)) {
    throw new Error('No se encontro la carpeta template con backend y Frontend.')
  }

  const rl = prompt()
  console.log('')
  console.log('Instalador plantilla base CRM')
  console.log('Los valores entre corchetes son los actuales detectados y se pueden editar.')
  console.log('')

  const config = {
    rl,
    targetRoot: path.resolve(await ask(rl, 'Carpeta destino', currentDefaults.targetRoot)),
    backendFolder: await ask(rl, 'Carpeta backend', currentDefaults.backendFolder),
    frontendFolder: await ask(rl, 'Carpeta frontend', currentDefaults.frontendFolder),
    appEnvironment: await ask(rl, 'Ambiente (Desarrollo, QA, Produccion)', currentDefaults.appEnvironment),
    dbServer: await ask(rl, 'Nombre servidor SQL', currentDefaults.dbServer),
    dbInstance: await ask(rl, 'Nombre instancia SQL (opcional)', currentDefaults.dbInstance),
    dbPort: await ask(rl, 'Puerto SQL (si aplica)', currentDefaults.dbPort),
    dbIntegrated: await ask(rl, 'Autenticacion integrada Windows? true/false', currentDefaults.dbIntegrated),
    dbUser: await ask(rl, 'Usuario SQL', currentDefaults.dbUser),
    dbPassword: await askSecret(rl, 'Contrasena SQL', currentDefaults.dbPassword),
    dbDatabase: await ask(rl, 'Nombre base de datos', currentDefaults.dbDatabase),
    dbOdbcDriver: await ask(rl, 'Driver ODBC', currentDefaults.dbOdbcDriver),
    dbEncrypt: await ask(rl, 'Cifrado SQL true/false', currentDefaults.dbEncrypt),
    backendPort: await ask(rl, 'Puerto backend', currentDefaults.backendPort),
    frontendApiUrl: await ask(rl, 'URL API frontend', currentDefaults.frontendApiUrl),
    appOrigin: await ask(rl, 'Origenes CORS', currentDefaults.appOrigin),
    adminUsername: await ask(rl, 'Usuario administrador inicial', currentDefaults.adminUsername),
    adminEmail: await ask(rl, 'Email administrador inicial', currentDefaults.adminEmail),
    adminPassword: await askSecret(rl, 'Contrasena administrador inicial', currentDefaults.adminPassword),
    jwtSecret: randomSecret(),
    jwtRefreshSecret: randomSecret(),
  }

  const dbReady = await ensureDatabase(config)
  if (!dbReady) {
    rl.close()
    console.log('Instalacion cancelada: la base de datos no existe y no fue creada.')
    return
  }

  await setupDatabase(config)
  rl.close()

  const backendDestination = path.join(config.targetRoot, config.backendFolder)
  const frontendDestination = path.join(config.targetRoot, config.frontendFolder)
  ensureDir(config.targetRoot)
  copyDir(templateBackend, backendDestination)
  copyDir(templateFrontend, frontendDestination)
  writeBackendEnv(path.join(backendDestination, '.env'), config)
  writeFrontendEnv(path.join(frontendDestination, '.env.local'), config)

  console.log('')
  console.log('Instalacion completada.')
  console.log(`Destino: ${config.targetRoot}`)
  console.log(`Backend: ${backendDestination}`)
  console.log(`Frontend: ${frontendDestination}`)
  console.log('')
  console.log('Siguientes comandos:')
  console.log(`  cd "${backendDestination}"`)
  console.log('  npm install')
  console.log('  npm start')
  console.log(`  cd "${frontendDestination}"`)
  console.log('  npm install')
  console.log('  npm start')
}

main().catch((error) => {
  console.error('')
  console.error(`Error: ${error.message}`)
  process.exit(1)
})
