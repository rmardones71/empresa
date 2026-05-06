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
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin'
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '123456'

  await runSqlFile(schemaPath)
  await runSqlFile(seedPath)

  const hash = await bcrypt.hash(adminPassword, env.security.bcryptSaltRounds)
  await query(
    `
    DECLARE @SuperAdminRoleId INT = (
      SELECT TOP 1 RoleId FROM dbo.Roles WHERE RoleName = N'Super Admin'
    );

    UPDATE dbo.Users
    SET
      Username = @adminUsername,
      Email = @adminEmail,
      PasswordHash = @hash,
      RoleId = @SuperAdminRoleId,
      IsActive = 1,
      TempPassword = 1
    WHERE Username = 'admin' AND PasswordHash = '__BCRYPT_HASH_TO_SET__'
    `,
    { adminUsername, adminEmail, hash },
  )

  // eslint-disable-next-line no-console
  console.log(`Seed complete: roles + admin user (${adminUsername}/${adminPassword}, TempPassword=1)`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
