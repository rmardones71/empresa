const fs = require('fs')
const path = require('path')
const { query } = require('./db')

const startupMigrations = [
  '20260511-create-audit-logs.sql',
  '20260511-create-refresh-tokens.sql',
]

async function ensureSchema() {
  for (const fileName of startupMigrations) {
    const filePath = path.join(__dirname, 'migrations', fileName)
    const sql = fs.readFileSync(filePath, 'utf8')
    // eslint-disable-next-line no-await-in-loop
    await query(sql)
  }
}

module.exports = { ensureSchema }
