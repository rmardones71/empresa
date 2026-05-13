const express = require('express')
const path = require('path')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const { env } = require('./config/env')
const { authRoutes } = require('./routes/authRoutes')
const { usersRoutes } = require('./routes/usersRoutes')
const { rolesRoutes } = require('./routes/rolesRoutes')
const { auditRoutes } = require('./routes/auditRoutes')
const { commercialRoutes } = require('./routes/commercialRoutes')
const { contratosEmpresaRoutes } = require('./routes/contratosEmpresaRoutes')
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
app.use(express.json({ limit: '12mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    limit: env.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' },
  }),
)

app.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    app: 'crm-oportunidades-backend',
    port: env.port,
  }),
)

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/roles', rolesRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/commercial', commercialRoutes)
app.use('/api/contratos-empresa', contratosEmpresaRoutes)

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

  // Avoid leaking internals in production
  const message = env.nodeEnv === 'production' ? 'Internal server error' : err?.message || 'Error'
  res.status(500).json({ message })
})

module.exports = { app }
