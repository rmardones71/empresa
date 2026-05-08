const { query } = require('../database/db')

const mainFields = [
  'rut_empresa',
  'id_categoria',
  'id_tipo_servicio',
  'id_estado_vital',
  'id_estado_ctr',
  'titulo',
  'fecha_firma',
  'fecha_inicio',
  'fecha_termino',
  'fecha_facturacion',
  'medio_pago',
  'reajustable',
  'multa',
  'requiere_orden_compra',
  'id_frecuencia',
  'id_tipo_tarifa',
  'id_contacto',
  'id_tipo_contacto',
  'id_estado_contacto',
]

const requiredFields = [
  'rut_empresa',
  'id_categoria',
  'id_tipo_servicio',
  'id_estado_vital',
  'id_estado_ctr',
  'titulo',
  'id_frecuencia',
  'id_tipo_tarifa',
  'id_contacto',
  'id_tipo_contacto',
  'id_estado_contacto',
]

const intFields = new Set([
  'id_categoria',
  'id_tipo_servicio',
  'id_estado_vital',
  'id_estado_ctr',
  'id_frecuencia',
  'id_tipo_tarifa',
  'id_contacto',
  'id_tipo_contacto',
  'id_estado_contacto',
])
const numberFields = new Set(['multa'])
const booleanFields = new Set(['reajustable', 'requiere_orden_compra'])
const dateFields = new Set(['fecha_firma', 'fecha_inicio', 'fecha_termino', 'fecha_facturacion'])

const associationConfig = {
  lineas: {
    table: 'dbo.contrato_empresa_lineas',
    idField: 'linea_id',
    targetTable: 'dbo.linea',
    targetId: 'id_linea',
  },
  casos: {
    table: 'dbo.contrato_empresa_casos',
    idField: 'caso_id',
    targetTable: 'dbo.caso',
    targetId: 'id_caso',
  },
  documentos: {
    table: 'dbo.contrato_empresa_documentos',
    idField: 'documento_id',
    targetTable: 'dbo.documentos',
    targetId: 'id_documento',
  },
}

function httpError(status, message, code = 'ERROR', errors) {
  const error = new Error(message)
  error.status = status
  error.code = code
  error.errors = errors
  return error
}

function parseId(raw) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

function castField(field, value) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (intFields.has(field)) {
    const number = Number(value)
    return Number.isInteger(number) && number > 0 ? number : null
  }
  if (numberFields.has(field)) {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  if (booleanFields.has(field)) return !!value
  if (dateFields.has(field)) {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? null : String(value).slice(0, 10)
  }
  return String(value).trim()
}

function buildPayload(body) {
  const payload = {}
  for (const field of mainFields) {
    if (body[field] !== undefined) payload[field] = castField(field, body[field])
  }

  const errors = requiredFields
    .filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '')
    .map((field) => ({ field, message: `${field} es obligatorio` }))

  if (errors.length) throw httpError(400, 'Faltan campos obligatorios', 'VALIDATION', errors)
  return payload
}

function selectSql() {
  return `
    ce.id,
    ce.rut_empresa,
    emp.razon_social AS empresa,
    ce.id_categoria,
    cat.categoria,
    ce.id_tipo_servicio,
    ts.tipo_servicio,
    ce.id_estado_vital,
    ev.estado_vital,
    ce.id_estado_ctr,
    ectr.estado_ctr,
    ce.titulo,
    ce.fecha_firma,
    ce.fecha_inicio,
    ce.fecha_termino,
    ce.fecha_facturacion,
    ce.medio_pago,
    ce.reajustable,
    ce.multa,
    ce.requiere_orden_compra,
    ce.id_frecuencia,
    ff.frecuencia,
    ce.id_tipo_tarifa,
    tt.tipo_tarifa,
    ce.id_contacto,
    co.nombre AS contacto,
    ce.id_tipo_contacto,
    tc.tipo AS tipo_contacto,
    ce.id_estado_contacto,
    ec.estado_contacto,
    ce.activo,
    ce.created_at,
    ce.updated_at,
    ce.created_by,
    COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(creator.FirstName, ' ', creator.LastName))), ''), creator.Username, creator.Email) AS usuario_creador,
    ce.updated_by,
    COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(updater.FirstName, ' ', updater.LastName))), ''), updater.Username, updater.Email) AS usuario_modificador
  `
}

function joinsSql() {
  return `
    INNER JOIN dbo.empresa emp ON emp.rut = ce.rut_empresa
    INNER JOIN dbo.categoria cat ON cat.id_categoria = ce.id_categoria
    INNER JOIN dbo.tipo_servicio ts ON ts.id_tipo_servicio = ce.id_tipo_servicio
    INNER JOIN dbo.estado_vital ev ON ev.id_estado_vital = ce.id_estado_vital
    INNER JOIN dbo.estado_ctr ectr ON ectr.id_estado_ctr = ce.id_estado_ctr
    INNER JOIN dbo.frecuencia_facturacion ff ON ff.id_frecuencia = ce.id_frecuencia
    INNER JOIN dbo.tipo_tarifa tt ON tt.id_tipo_tarifa = ce.id_tipo_tarifa
    INNER JOIN dbo.contacto co ON co.id_contacto = ce.id_contacto
    INNER JOIN dbo.tipo_contacto tc ON tc.id_tipo_contacto = ce.id_tipo_contacto
    INNER JOIN dbo.estado_contacto ec ON ec.id_estado_contacto = ce.id_estado_contacto
    LEFT JOIN dbo.Users creator ON creator.UserId = ce.created_by
    LEFT JOIN dbo.Users updater ON updater.UserId = ce.updated_by
  `
}

async function list({ page = 1, pageSize = 20, q = '', sortBy = 'id', sortDir = 'desc' } = {}) {
  const safePage = Math.max(1, Number(page || 1))
  const safePageSize = Math.min(100, Math.max(10, Number(pageSize || 20)))
  const offset = (safePage - 1) * safePageSize
  const direction = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC'
  const sortColumns = {
    id: 'ce.id',
    titulo: 'ce.titulo',
    empresa: 'emp.razon_social',
    estado_ctr: 'ectr.estado_ctr',
    fecha_inicio: 'ce.fecha_inicio',
    updated_at: 'ce.updated_at',
  }
  const orderBy = sortColumns[sortBy] || sortColumns.id
  const params = { offset, pageSize: safePageSize }
  const where = ['ce.activo = 1']
  if (q) {
    where.push('(ce.titulo LIKE @q OR emp.razon_social LIKE @q OR ectr.estado_ctr LIKE @q)')
    params.q = `%${String(q).trim()}%`
  }
  const whereSql = `WHERE ${where.join(' AND ')}`

  const totalResult = await query(
    `
    SELECT COUNT(1) AS Total
    FROM dbo.contratos_empresa ce
    ${joinsSql()}
    ${whereSql}
    `,
    params,
  )
  const result = await query(
    `
    SELECT ${selectSql()}
    FROM dbo.contratos_empresa ce
    ${joinsSql()}
    ${whereSql}
    ORDER BY ${orderBy} ${direction}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
    params,
  )
  return { page: safePage, pageSize: safePageSize, total: Number(totalResult.recordset[0]?.Total || 0), items: result.recordset }
}

async function getBase(id) {
  const result = await query(
    `
    SELECT TOP 1 ${selectSql()}
    FROM dbo.contratos_empresa ce
    ${joinsSql()}
    WHERE ce.id = @id
    `,
    { id },
  )
  return result.recordset[0] || null
}

async function lineas(id) {
  const result = await query(
    `
    SELECT l.id_linea, l.titulo, con.titulo AS contrato, ts.tipo_servicio, tt.tipo_tarifa, ff.frecuencia,
           l.tarifa_fija, l.tarifa_variable, l.moneda_fijo, l.moneda_variable, rel.created_at
    FROM dbo.contrato_empresa_lineas rel
    INNER JOIN dbo.linea l ON l.id_linea = rel.linea_id
    INNER JOIN dbo.contrato con ON con.id_contrato = l.id_contrato
    INNER JOIN dbo.tipo_servicio ts ON ts.id_tipo_servicio = l.id_tipo_servicio
    INNER JOIN dbo.tipo_tarifa tt ON tt.id_tipo_tarifa = l.id_tipo_tarifa
    INNER JOIN dbo.frecuencia_facturacion ff ON ff.id_frecuencia = l.id_frecuencia
    WHERE rel.contrato_empresa_id = @id
    ORDER BY rel.id ASC
    `,
    { id },
  )
  return result.recordset
}

async function casos(id) {
  const result = await query(
    `
    SELECT c.id_caso, c.titulo, co.nombre AS contacto, con.titulo AS contrato, c.texto, c.relato, rel.created_at
    FROM dbo.contrato_empresa_casos rel
    INNER JOIN dbo.caso c ON c.id_caso = rel.caso_id
    INNER JOIN dbo.contacto co ON co.id_contacto = c.id_contacto
    INNER JOIN dbo.contrato con ON con.id_contrato = c.id_contrato
    WHERE rel.contrato_empresa_id = @id
    ORDER BY rel.id ASC
    `,
    { id },
  )
  return result.recordset
}

async function documentos(id) {
  const result = await query(
    `
    SELECT d.id_documento, d.nombre, d.tipo_documento, d.version, d.estado, d.responsable, con.titulo AS contrato, rel.created_at
    FROM dbo.contrato_empresa_documentos rel
    INNER JOIN dbo.documentos d ON d.id_documento = rel.documento_id
    INNER JOIN dbo.contrato con ON con.id_contrato = d.id_contrato
    WHERE rel.contrato_empresa_id = @id
    ORDER BY rel.id ASC
    `,
    { id },
  )
  return result.recordset
}

async function get(id) {
  const parsedId = parseId(id)
  if (!parsedId) throw httpError(400, 'Identificador invalido', 'VALIDATION')
  const item = await getBase(parsedId)
  if (!item) throw httpError(404, 'Contrato empresa no encontrado', 'NOT_FOUND')
  return {
    ...item,
    lineas: await lineas(parsedId),
    casos: await casos(parsedId),
    documentos: await documentos(parsedId),
  }
}

async function create(body, actor = {}) {
  const payload = buildPayload(body)
  const fields = [...mainFields, 'created_by', 'updated_by']
  const params = { ...payload, created_by: actor.userId ?? null, updated_by: actor.userId ?? null }
  const result = await query(
    `
    INSERT INTO dbo.contratos_empresa (${fields.join(', ')})
    OUTPUT INSERTED.id
    VALUES (${fields.map((field) => `@${field}`).join(', ')})
    `,
    params,
  )
  const id = result.recordset[0]?.id
  await syncAssociations(id, 'lineas', body.lineas || [])
  await syncAssociations(id, 'casos', body.casos || [])
  await syncAssociations(id, 'documentos', body.documentos || [])
  return get(id)
}

async function update(id, body, actor = {}) {
  const parsedId = parseId(id)
  if (!parsedId) throw httpError(400, 'Identificador invalido', 'VALIDATION')
  const existing = await getBase(parsedId)
  if (!existing) throw httpError(404, 'Contrato empresa no encontrado', 'NOT_FOUND')
  const payload = buildPayload(body)
  const params = { ...payload, id: parsedId, updated_by: actor.userId ?? null }
  await query(
    `
    UPDATE dbo.contratos_empresa
    SET ${mainFields.map((field) => `${field} = @${field}`).join(', ')},
        updated_by = @updated_by,
        updated_at = SYSUTCDATETIME()
    WHERE id = @id
    `,
    params,
  )
  await syncAssociations(parsedId, 'lineas', body.lineas || [])
  await syncAssociations(parsedId, 'casos', body.casos || [])
  await syncAssociations(parsedId, 'documentos', body.documentos || [])
  return get(parsedId)
}

async function remove(id, actor = {}) {
  const parsedId = parseId(id)
  if (!parsedId) throw httpError(400, 'Identificador invalido', 'VALIDATION')
  await query(
    `
    UPDATE dbo.contratos_empresa
    SET activo = 0, updated_by = @updated_by, updated_at = SYSUTCDATETIME()
    WHERE id = @id
    `,
    { id: parsedId, updated_by: actor.userId ?? null },
  )
  return { message: 'Deleted' }
}

async function ensureParentAndTarget(contractId, type, targetId) {
  const parsedContractId = parseId(contractId)
  const parsedTargetId = parseId(targetId)
  if (!parsedContractId || !parsedTargetId) throw httpError(400, 'Identificador invalido', 'VALIDATION')

  const parent = await getBase(parsedContractId)
  if (!parent) throw httpError(404, 'Contrato empresa no encontrado', 'NOT_FOUND')
  const config = associationConfig[type]
  if (!config) throw httpError(404, 'Relacion no encontrada', 'NOT_FOUND')

  const target = await query(
    `SELECT TOP 1 ${config.targetId} FROM ${config.targetTable} WHERE ${config.targetId} = @targetId`,
    { targetId: parsedTargetId },
  )
  if (!target.recordset[0]) throw httpError(404, 'Registro relacionado no encontrado', 'NOT_FOUND')
  return { contractId: parsedContractId, targetId: parsedTargetId, config }
}

async function addAssociation(contractId, type, targetId) {
  const { contractId: parsedContractId, targetId: parsedTargetId, config } = await ensureParentAndTarget(contractId, type, targetId)
  await query(
    `
    IF NOT EXISTS (
      SELECT 1 FROM ${config.table}
      WHERE contrato_empresa_id = @contractId AND ${config.idField} = @targetId
    )
    BEGIN
      INSERT INTO ${config.table} (contrato_empresa_id, ${config.idField})
      VALUES (@contractId, @targetId)
    END
    `,
    { contractId: parsedContractId, targetId: parsedTargetId },
  )
  return get(parsedContractId)
}

async function removeAssociation(contractId, type, targetId) {
  const { contractId: parsedContractId, targetId: parsedTargetId, config } = await ensureParentAndTarget(contractId, type, targetId)
  await query(
    `DELETE FROM ${config.table} WHERE contrato_empresa_id = @contractId AND ${config.idField} = @targetId`,
    { contractId: parsedContractId, targetId: parsedTargetId },
  )
  return get(parsedContractId)
}

async function syncAssociations(contractId, type, values) {
  const config = associationConfig[type]
  const ids = [...new Set((values || []).map(parseId).filter(Boolean))]
  await query(`DELETE FROM ${config.table} WHERE contrato_empresa_id = @contractId`, { contractId })
  for (const targetId of ids) {
    // eslint-disable-next-line no-await-in-loop
    await addAssociation(contractId, type, targetId)
  }
}

async function lookupRows(table, id, label, extra = '') {
  const result = await query(`
    SELECT ${id} AS id, ${label} AS label${extra ? `, ${extra}` : ''}
    FROM ${table}
    ORDER BY ${label} ASC
  `)
  return result.recordset
}

async function lookups() {
  const [
    empresas,
    categorias,
    tipoServicios,
    estadoVitales,
    estadosCtr,
    contactos,
    contratos,
    tipoContactos,
    estadoContactos,
    frecuencias,
    tipoTarifas,
    lineasLookup,
    casosLookup,
    documentosLookup,
  ] = await Promise.all([
    query('SELECT rut AS id, razon_social AS label, id_categoria FROM dbo.empresa ORDER BY razon_social ASC'),
    lookupRows('dbo.categoria', 'id_categoria', 'categoria'),
    lookupRows('dbo.tipo_servicio', 'id_tipo_servicio', 'tipo_servicio'),
    lookupRows('dbo.estado_vital', 'id_estado_vital', 'estado_vital'),
    lookupRows('dbo.estado_ctr', 'id_estado_ctr', 'estado_ctr'),
    query('SELECT id_contacto AS id, nombre AS label, rut_empresa, id_tipo_contacto, id_estado_contacto FROM dbo.contacto ORDER BY nombre ASC'),
    query('SELECT id_contrato AS id, titulo AS label, rut_empresa FROM dbo.contrato ORDER BY titulo ASC'),
    lookupRows('dbo.tipo_contacto', 'id_tipo_contacto', 'tipo'),
    lookupRows('dbo.estado_contacto', 'id_estado_contacto', 'estado_contacto'),
    lookupRows('dbo.frecuencia_facturacion', 'id_frecuencia', 'frecuencia'),
    lookupRows('dbo.tipo_tarifa', 'id_tipo_tarifa', 'tipo_tarifa'),
    query('SELECT id_linea AS id, titulo AS label, id_contrato FROM dbo.linea ORDER BY titulo ASC'),
    query('SELECT id_caso AS id, titulo AS label, id_contacto, id_contrato FROM dbo.caso ORDER BY titulo ASC'),
    query('SELECT id_documento AS id, nombre AS label, id_contrato FROM dbo.documentos ORDER BY nombre ASC'),
  ])

  return {
    empresas: empresas.recordset,
    categorias,
    tipo_servicios: tipoServicios,
    estado_vitales: estadoVitales,
    estados_ctr: estadosCtr,
    contactos: contactos.recordset,
    contratos: contratos.recordset,
    tipo_contactos: tipoContactos,
    estado_contactos: estadoContactos,
    frecuencias,
    tipo_tarifas: tipoTarifas,
    lineas: lineasLookup.recordset,
    casos: casosLookup.recordset,
    documentos: documentosLookup.recordset,
  }
}

module.exports = {
  addAssociation,
  create,
  get,
  list,
  lookups,
  remove,
  removeAssociation,
  update,
}
