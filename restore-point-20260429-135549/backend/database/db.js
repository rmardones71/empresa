const mssql = require('mssql')
const { env } = require('../config/env')
const sql = mssql

let poolPromise = null

function getPool() {
  if (!poolPromise) {
    const sql = env.db.integrated ? require('mssql/msnodesqlv8') : mssql
    const common = {
      server: env.db.server,
      database: env.db.database,
      port: env.db.port,
      options: {
        encrypt: env.db.encrypt,
        trustServerCertificate: true,
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    }

    const config = env.db.integrated
      ? {
          ...common,
          connectionString: `Driver={${env.db.odbcDriver}};Server=${env.db.server},${env.db.port};Database=${env.db.database};Trusted_Connection=Yes;TrustServerCertificate=Yes;`,
        }
      : {
          ...common,
          user: env.db.user,
          password: env.db.password,
        }

    poolPromise = sql.connect(config)
  }
  return poolPromise
}

async function query(text, params = {}) {
  const pool = await getPool()
  const request = pool.request()
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value)
  }
  return request.query(text)
}

module.exports = { sql, getPool, query }
