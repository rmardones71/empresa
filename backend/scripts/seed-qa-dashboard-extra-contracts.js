const bcrypt = require('bcrypt')
const { env } = require('../config/env')
const { query } = require('../database/db')
const commercialService = require('../services/commercialService')
const contratosEmpresaService = require('../services/contratosEmpresaService')
const { formatRut } = require('../utils/rutChile')

const QA_PREFIX = 'QA Dashboard Extra'
const PASSWORD = '123456'
const SELLER_PLAN = [
  { index: 1, username: 'qa.user.dashboard.01', email: 'qa.user.dashboard.01@example.com', total: 3 },
  { index: 2, username: 'qa.user.dashboard.02', email: 'qa.user.dashboard.02@example.com', total: 8 },
  { index: 3, username: 'qa.user.dashboard.03', email: 'qa.user.dashboard.03@example.com', total: 5 },
  { index: 4, username: 'qa.user.dashboard.04', email: 'qa.user.dashboard.04@example.com', total: 4 },
]

function rutDv(body) {
  const digits = String(body).split('').map(Number)
  let sum = 0
  let factor = 2
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += digits[index] * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const value = 11 - (sum % 11)
  if (value === 11) return '0'
  if (value === 10) return 'K'
  return String(value)
}

function makeRut(body) {
  return formatRut(`${body}${rutDv(body)}`)
}

function monthDate(offsetFromCurrent, day = 15) {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetFromCurrent, day, 12, 0, 0))
}

function addMonths(date, months) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 12, 0, 0))
}

async function one(sql, params = {}) {
  const result = await query(sql, params)
  return result.recordset[0] || null
}

async function scalar(sql, params = {}, field = 'id') {
  const row = await one(sql, params)
  return row?.[field] ?? null
}

async function ensureUser({ index, username, email }) {
  const existing = await one(`SELECT TOP 1 UserId FROM dbo.Users WHERE Username = @username`, { username })
  if (existing) return existing.UserId

  const roleId = await scalar(`SELECT TOP 1 RoleId AS id FROM dbo.Roles WHERE RoleName = N'User'`)
  if (!roleId) throw new Error('No existe el rol User')

  const passwordHash = await bcrypt.hash(PASSWORD, env.security.bcryptSaltRounds)
  const result = await query(
    `
    INSERT INTO dbo.Users (
      Username, Email, PasswordHash, FirstName, LastName, RoleId,
      IsActive, TwoFactorEnabled, TempPassword
    )
    OUTPUT INSERTED.UserId
    VALUES (
      @username, @email, @passwordHash, @firstName, @lastName, @roleId,
      1, 0, 0
    )
    `,
    {
      username,
      email,
      passwordHash,
      firstName: 'QA',
      lastName: `Dashboard ${String(index).padStart(2, '0')}`,
      roleId,
    },
  )
  return result.recordset[0].UserId
}

async function lookupIds() {
  const ids = {
    categoria: await scalar(`SELECT TOP 1 id_categoria AS id FROM dbo.categoria ORDER BY id_categoria`),
    tipoServicio: await scalar(`SELECT TOP 1 id_tipo_servicio AS id FROM dbo.tipo_servicio ORDER BY id_tipo_servicio`),
    estadoVital: await scalar(`SELECT TOP 1 id_estado_vital AS id FROM dbo.estado_vital ORDER BY id_estado_vital`),
    estadoCtr: await scalar(`SELECT TOP 1 id_estado_ctr AS id FROM dbo.estado_ctr ORDER BY id_estado_ctr`),
    frecuencia: await scalar(`SELECT TOP 1 id_frecuencia AS id FROM dbo.frecuencia_facturacion ORDER BY id_frecuencia`),
    tipoTarifa: await scalar(`SELECT TOP 1 id_tipo_tarifa AS id FROM dbo.tipo_tarifa ORDER BY id_tipo_tarifa`),
    tipoContacto: await scalar(`SELECT TOP 1 id_tipo_contacto AS id FROM dbo.tipo_contacto ORDER BY id_tipo_contacto`),
    estadoContacto: await scalar(`SELECT TOP 1 id_estado_contacto AS id FROM dbo.estado_contacto ORDER BY id_estado_contacto`),
  }

  const missing = Object.entries(ids)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missing.length) throw new Error(`Faltan tablas maestras: ${missing.join(', ')}`)
  return ids
}

async function ensureEmpresa(index, ids, actor) {
  const rut = makeRut(84020000 + index)
  const existing = await one(`SELECT TOP 1 rut FROM dbo.empresa WHERE rut = @rut`, { rut })
  if (existing) return rut

  await commercialService.create(
    'empresas',
    {
      rut,
      razon_social: `${QA_PREFIX} Empresa ${index} SpA`,
      nombre_fantasia: `${QA_PREFIX} ${index}`,
      giro: 'Servicios de validacion',
      rubro: 'QA',
      direccion: `Av. Dashboard ${200 + index}`,
      region: 'Metropolitana de Santiago',
      ciudad: 'Santiago',
      comuna: 'Santiago',
      sitio_web: 'https://qa-dashboard.local',
      id_categoria: ids.categoria,
    },
    actor,
  )
  return rut
}

async function ensureContacto(index, ids, actor) {
  const rut = makeRut(28020000 + index)
  const existing = await one(`SELECT TOP 1 id_contacto FROM dbo.contacto WHERE rut = @rut`, { rut })
  if (existing) return existing.id_contacto

  const created = await commercialService.create(
    'contactos',
    {
      id_tipo_contacto: ids.tipoContacto,
      id_estado_contacto: ids.estadoContacto,
      rut,
      nombre: `${QA_PREFIX} Contacto ${index}`,
      cargo: 'Usuario QA',
      area: 'Validacion',
      email: `qa.dashboard.extra.contacto${index}@example.com`,
      telefono: `56991000${String(index).padStart(3, '0')}`,
      rol: 'QA',
      autoriza_comunicaciones: true,
      estado: 'Activo',
    },
    actor,
  )
  return created.id_contacto
}

async function ensureContrato({ globalIndex, sellerIndex, sellerSequence, date, rutEmpresa, idContacto, ids, actor }) {
  const monthTag = date.toISOString().slice(0, 7)
  const titulo = `${QA_PREFIX} Vendedor ${sellerIndex} ${monthTag} #${String(sellerSequence).padStart(2, '0')}`
  const existing = await one(`SELECT TOP 1 id FROM dbo.contratos_empresa WHERE titulo = @titulo`, { titulo })
  const fecha = date.toISOString().slice(0, 10)
  const payload = {
    rut_empresa: rutEmpresa,
    id_categoria: ids.categoria,
    id_tipo_servicio: ids.tipoServicio,
    id_estado_vital: ids.estadoVital,
    id_estado_ctr: ids.estadoCtr,
    id_frecuencia: ids.frecuencia,
    id_tipo_tarifa: ids.tipoTarifa,
    id_contacto: idContacto,
    id_tipo_contacto: ids.tipoContacto,
    id_estado_contacto: ids.estadoContacto,
    fecha_firma: fecha,
    fecha_inicio: fecha,
    fecha_termino: addMonths(date, 12).toISOString().slice(0, 10),
    fecha_facturacion: fecha,
    medio_pago: globalIndex % 2 === 0 ? 'Transferencia' : 'Orden de compra',
    reajustable: globalIndex % 3 === 0,
    multa: globalIndex * 750,
    requiere_orden_compra: globalIndex % 2 === 1,
  }

  if (existing) {
    await query(
      `
      UPDATE dbo.contratos_empresa
      SET rut_empresa = @rutEmpresa,
          id_categoria = @idCategoria,
          id_tipo_servicio = @idTipoServicio,
          id_estado_vital = @idEstadoVital,
          id_estado_ctr = @idEstadoCtr,
          id_frecuencia = @idFrecuencia,
          id_tipo_tarifa = @idTipoTarifa,
          id_contacto = @idContacto,
          id_tipo_contacto = @idTipoContacto,
          id_estado_contacto = @idEstadoContacto,
          fecha_firma = @fecha,
          fecha_inicio = @fecha,
          fecha_facturacion = @fecha,
          fecha_termino = @fechaTermino,
          medio_pago = @medioPago,
          reajustable = @reajustable,
          multa = @multa,
          requiere_orden_compra = @requiereOrdenCompra,
          activo = 1,
          created_at = @createdAt,
          updated_at = @createdAt,
          created_by = @userId,
          updated_by = @userId
      WHERE id = @id
      `,
      {
        id: existing.id,
        rutEmpresa: payload.rut_empresa,
        idCategoria: payload.id_categoria,
        idTipoServicio: payload.id_tipo_servicio,
        idEstadoVital: payload.id_estado_vital,
        idEstadoCtr: payload.id_estado_ctr,
        idFrecuencia: payload.id_frecuencia,
        idTipoTarifa: payload.id_tipo_tarifa,
        idContacto: payload.id_contacto,
        idTipoContacto: payload.id_tipo_contacto,
        idEstadoContacto: payload.id_estado_contacto,
        fecha: payload.fecha_firma,
        fechaTermino: payload.fecha_termino,
        medioPago: payload.medio_pago,
        reajustable: payload.reajustable,
        multa: payload.multa,
        requiereOrdenCompra: payload.requiere_orden_compra,
        createdAt: date,
        userId: actor.userId,
      },
    )
    return { id: existing.id, action: 'updated' }
  }

  const created = await contratosEmpresaService.create({ ...payload, titulo }, actor)
  await query(
    `
    UPDATE dbo.contratos_empresa
    SET created_at = @createdAt,
        updated_at = @createdAt,
        created_by = @userId,
        updated_by = @userId
    WHERE id = @id
    `,
    { id: created.id, createdAt: date, userId: actor.userId },
  )
  return { id: created.id, action: 'created' }
}

async function main() {
  const ids = await lookupIds()
  const users = []
  for (const seller of SELLER_PLAN) {
    // eslint-disable-next-line no-await-in-loop
    const userId = await ensureUser(seller)
    users.push({ ...seller, userId })
  }

  const systemActor = { userId: users[0].userId, ipAddress: 'seed-qa-dashboard-extra' }
  const empresas = []
  const contactos = []
  for (let index = 1; index <= 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    empresas.push(await ensureEmpresa(index, ids, systemActor))
    // eslint-disable-next-line no-await-in-loop
    contactos.push(await ensureContacto(index, ids, systemActor))
  }

  const results = []
  let globalIndex = 0
  for (const seller of users) {
    for (let sellerSequence = 1; sellerSequence <= seller.total; sellerSequence += 1) {
      globalIndex += 1
      const monthOffset = -11 + ((globalIndex - 1) % 12)
      const day = 5 + ((globalIndex - 1) % 20)
      // eslint-disable-next-line no-await-in-loop
      const result = await ensureContrato({
        globalIndex,
        sellerIndex: seller.index,
        sellerSequence,
        date: monthDate(monthOffset, day),
        rutEmpresa: empresas[(globalIndex - 1) % empresas.length],
        idContacto: contactos[(globalIndex - 1) % contactos.length],
        ids,
        actor: { userId: seller.userId, ipAddress: 'seed-qa-dashboard-extra' },
      })
      results.push({ ...result, seller: seller.index, userId: seller.userId })
    }
  }

  const metrics = await contratosEmpresaService.metrics({ weeks: 12, months: 12 })
  const distribution = users.map((seller) => ({
    vendedor: seller.index,
    usuarioId: seller.userId,
    contratosExtra: results.filter((item) => item.userId === seller.userId).length,
  }))

  console.log(
    JSON.stringify(
      {
        contratosExtra: results.length,
        creados: results.filter((item) => item.action === 'created').length,
        actualizados: results.filter((item) => item.action === 'updated').length,
        distribution,
        metricsPreview: {
          byUser: metrics.byUser,
          monthly: metrics.monthly,
        },
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
