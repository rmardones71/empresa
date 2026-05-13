const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const { env } = require('../config/env')
const { query } = require('../database/db')

async function runSqlFile(filePath) {
  const sqlText = fs.readFileSync(filePath, 'utf8')
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
  const oppSchemaPath = path.join(__dirname, '..', 'database', 'opportunities-schema.sql')
  const oppSeedPath = path.join(__dirname, '..', 'database', 'opportunities-seed.sql')

  await runSqlFile(schemaPath)
  await runSqlFile(seedPath)
  await runSqlFile(oppSchemaPath)
  await runSqlFile(oppSeedPath)

  const hash = await bcrypt.hash('123456', env.security.bcryptSaltRounds)
  await query(
    `
    UPDATE dbo.Users
    SET PasswordHash = @hash
    WHERE Username = 'admin' AND PasswordHash = '__BCRYPT_HASH_TO_SET__'
    `,
    { hash },
  )

  // eslint-disable-next-line no-console
  console.log('Seed complete: auth + opportunities schema + seeds (admin/123456, TempPassword=1)')
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
