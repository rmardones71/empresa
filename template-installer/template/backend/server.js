const { env } = require('./config/env')
const { app } = require('./app')
const { ensureSchema } = require('./database/ensureSchema')

async function probeExistingBackend(port) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 1500)

  try {
    const res = await fetch(`http://localhost:${port}/api/health`, {
      signal: controller.signal,
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

async function start() {
  const existingBackend = await probeExistingBackend(env.port)
  if (existingBackend?.ok) {
    // eslint-disable-next-line no-console
    console.log(`Backend already running on http://localhost:${env.port}`)
    return
  }

  await ensureSchema()

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${env.port}`)
  })

  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      const health = await probeExistingBackend(env.port)

      if (health?.ok) {
        // eslint-disable-next-line no-console
        console.log(`Backend already running on http://localhost:${env.port}`)
        return
      }

      // eslint-disable-next-line no-console
      console.error(
        `Port ${env.port} is already in use by another process. Stop it or set PORT to another value.`,
      )
      process.exit(1)
    }

    throw err
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
