const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const { env } = require('./config/env')
const { authRoutes } = require('./routes/authRoutes')
const { usersRoutes } = require('./routes/usersRoutes')
const { rolesRoutes } = require('./routes/rolesRoutes')
const { auditRoutes } = require('./routes/auditRoutes')
const { opportunitiesRoutes } = require('./routes/opportunitiesRoutes')
const { parseSqlServerError } = require('./utils/sqlErrors')

const app = express()

app.set('trust proxy', env.trustProxy)

app.use(helmet())
app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser clients (no origin) and allowlisted origins
      if (!origin) return cb(null, true)
      if (env.appOrigins.includes(origin)) return cb(null, true)
      return cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
)

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/roles', rolesRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/opportunities', opportunitiesRoutes)

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const parsed = parseSqlServerError(err)
  if (parsed) {
    return res.status(parsed.httpStatus).json({
      code: parsed.code,
      field: parsed.field,
      message: parsed.message,
    })
  }

  if (err?.status && err.status >= 400 && err.status < 600) {
    return res.status(err.status).json({ message: err.message, details: err.details })
  }

  // Avoid leaking internals in production
  const message = env.nodeEnv === 'production' ? 'Internal server error' : err?.message || 'Error'
  res.status(500).json({ message })
})

module.exports = { app }
