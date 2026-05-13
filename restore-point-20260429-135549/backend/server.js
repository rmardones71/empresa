const { env } = require('./config/env')
const { app } = require('./app')

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${env.port}`)
})

