const { env } = require('./config/env')
const { app } = require('./app')

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${env.port}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(`Port ${env.port} is already in use. Stop the existing backend process or set PORT to another value.`)
    process.exit(1)
  }

  throw err
})
