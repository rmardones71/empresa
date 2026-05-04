const fs = require('fs')
const path = require('path')
const { query } = require('../database/db')

async function runSqlFile(filePath) {
  const sqlText = fs.readFileSync(filePath, 'utf8')
  const batches = sqlText
    .split(/\r?\nGO\r?\n/gi)
    .map((batch) => batch.trim())
    .filter(Boolean)

  for (const batch of batches) {
    // eslint-disable-next-line no-await-in-loop
    await query(batch)
  }
}

async function main() {
  const schemaPath = path.join(__dirname, '..', 'database', 'commercial-schema.sql')
  await runSqlFile(schemaPath)
  // eslint-disable-next-line no-console
  console.log('Commercial schema migration complete')
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
