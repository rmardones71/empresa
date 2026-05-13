const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const { env } = require('../config/env')
const { query } = require('../database/db')

async function runSqlFile(filePath) {
  let sqlText = fs.readFileSync(filePath, 'utf8')
  if (path.basename(filePath) === 'seed-auth.sql') {
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin'
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.local'
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '123456'
    const hash = await bcrypt.hash(adminPassword, env.security.bcryptSaltRounds)

    sqlText = sqlText
      .replaceAll('__ENVIRONMENT__', process.env.APP_ENVIRONMENT || 'Desarrollo')
      .replaceAll('__DB_SERVER__', env.db.server)
      .replaceAll('__DB_DATABASE__', env.db.database)
      .replaceAll('__ADMIN_USERNAME__', adminUsername.replaceAll("'", "''"))
      .replaceAll('__ADMIN_EMAIL__', adminEmail.replaceAll("'", "''"))
      .replaceAll('__ADMIN_PASSWORD_HASH__', hash.replaceAll("'", "''"))
  }
  // naive split by GO (line-only). Enough for our seed scripts.
  const batches = sqlText
    .split(/\r?\nGO\r?\n/gi)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const batch of batches) {
    // eslint-disable-next-line no-await-in-loop
    await query(batch)
  }
}

async function main() {
  const schemaPath = path.join(__dirname, '..', 'database', 'auth-schema.sql')
  const seedPath = path.join(__dirname, '..', 'database', 'seed-auth.sql')

  await runSqlFile(schemaPath)
  await runSqlFile(seedPath)

  // eslint-disable-next-line no-console
  console.log('Seed complete: roles, permissions, menu metadata and initial admin user')
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
