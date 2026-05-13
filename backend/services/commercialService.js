const fs = require('fs')
const path = require('path')
const repository = require('../repositories/commercialRepository')
const { query: sqlQuery } = require('../database/db')
const { getResource, lookupResources } = require('../models/commercialModel')
const { formatRut, isRutValid } = require('../utils/rutChile')

function notFound(resourceName) {
  const error = new Error(`Recurso no encontrado: ${resourceName}`)
  error.status = 404
  return error
}

function validation(message, field) {
  const error = new Error(message)
  error.status = 400
  error.code = 'VALIDATION'
  error.field = field
  return error
}

function stringifyChangeValue(value) {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function valuesEqual(previous, next) {
  return stringifyChangeValue(previous) === stringifyChangeValue(next)
}

async function logChange(resourceName, recordId, action, changes, actor = {}) {
  if (!changes.length) return

  for (const change of changes) {
    // eslint-disable-next-line no-await-in-loop
    await repository.insertChangeLog({
      resource: resourceName,
      recordId,
      action,
      field: change.field,
      oldValue: stringifyChangeValue(change.oldValue),
      newValue: stringifyChangeValue(change.newValue),
      userId: actor.userId,
      ipAddress: actor.ipAddress,
    })
  }
}

function conflict(message) {
  const error = new Error(message)
  error.status = 409
  error.code = 'RELATED_RECORDS'
  return error
}

function duplicate(message, field) {
  const error = new Error(message)
  error.status = 409
  error.code = 'DUPLICATE'
  error.field = field
  return error
}

function normalizeRutForCompare(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s+/g, '')
}

async function ensureUniqueContactoRut(rut, excludeId = null) {
  if (!rut) return
  const rutNorm = normalizeRutForCompare(rut)
  if (!rutNorm) return
  const params = { rutNorm }
  let where = `REPLACE(REPLACE(REPLACE(UPPER(ISNULL(rut,'')), '.', ''), '-', ''), ' ', '') = @rutNorm`
  if (excludeId != null) {
    where += ` AND id_contacto <> @excludeId`
    params.excludeId = excludeId
  }
  const result = await sqlQuery(
    `SELECT TOP 1 id_contacto AS id, rut FROM dbo.contacto WHERE ${where}`,
    params,
  )
  const existing = result.recordset?.[0]
  if (existing?.id) {
    throw duplicate(`RUT contacto ya existe: ${existing.rut || rut}.`, 'rut')
  }
}

async function ensureResourceSchema(resourceName) {
  if (resourceName === 'empresas') {
    await sqlQuery(`
      IF COL_LENGTH('dbo.empresa', 'ciudad') IS NULL
      BEGIN
        ALTER TABLE dbo.empresa ADD ciudad NVARCHAR(120) NULL;
      END
    `)
    return
  }

  if (resourceName === 'contactos') {
    // Crea un indice UNIQUE filtrado solo cuando no existan duplicados actuales.
    // Evita fallar en ambientes donde ya hay data duplicada historica.
    await sqlQuery(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes i
        WHERE i.name = 'UX_contacto_rut'
          AND i.object_id = OBJECT_ID('dbo.contacto')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM dbo.contacto
        WHERE rut IS NOT NULL AND LTRIM(RTRIM(rut)) <> ''
        GROUP BY REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '')
        HAVING COUNT(*) > 1
      )
      BEGIN
        CREATE UNIQUE INDEX UX_contacto_rut
        ON dbo.contacto(rut)
        WHERE rut IS NOT NULL AND rut <> '';
      END
    `)
  }
}

const allowedUploadTypes = new Map([
  ['application/pdf', '.pdf'],
  ['application/msword', '.doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  ['application/vnd.ms-excel', '.xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['text/plain', '.txt'],
])

function sanitizeFileName(fileName = 'archivo') {
  return String(fileName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)
}

async function uploadFile(body = {}) {
  const fileName = sanitizeFileName(body.fileName)
  const mimeType = String(body.mimeType || '')
  const dataUrl = String(body.dataUrl || '')
  const extension = allowedUploadTypes.get(mimeType)

  if (!extension) throw validation('Formato de archivo no permitido', 'archivo')
  if (!dataUrl.startsWith('data:')) throw validation('Archivo invalido', 'archivo')

  const base64 = dataUrl.split(',')[1]
  if (!base64) throw validation('Archivo invalido', 'archivo')

  const buffer = Buffer.from(base64, 'base64')
  const maxBytes = 8 * 1024 * 1024
  if (buffer.length > maxBytes) throw validation('El archivo no puede superar 8 MB', 'archivo')

  const uploadRoot = path.join(__dirname, '..', 'uploads', 'commercial')
  await fs.promises.mkdir(uploadRoot, { recursive: true })

  const currentExtension = path.extname(fileName).toLowerCase()
  const baseName = path.basename(fileName, currentExtension || extension)
  const finalExtension = currentExtension || extension
  const storedName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${baseName}${finalExtension}`
  const finalPath = path.join(uploadRoot, storedName)

  await fs.promises.writeFile(finalPath, buffer)

  return {
    fileName,
    mimeType,
    size: buffer.length,
    url: `/uploads/commercial/${storedName}`,
  }
}

function getDefinition(resourceName) {
  const resource = getResource(resourceName)
  if (!resource) throw notFound(resourceName)
  return resource
}

function normalizeSearchQuery(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120)
}

function castValue(field, value) {
  if (value === undefined) return undefined
  if (field.type === 'boolean') {
    if (value === null || value === '') return false
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'si', 'sí', 'yes', 'on'].includes(normalized)) return true
      if (['false', '0', 'no', 'off'].includes(normalized)) return false
    }
    return !!value
  }
  if (value === null || value === '') return null

  if (field.type === 'int') {
    const number = Number(value)
    if (!Number.isInteger(number) || number < 1) return null
    return number
  }

  if (field.type === 'number') {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }

  if (field.type === 'date' || field.type === 'dateTime') {
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return null
    return field.type === 'date' ? String(value).slice(0, 10) : date
  }

  return String(value).trim()
}

function buildPayload(resource, body, { isCreate }) {
  const payload = {}
  const errors = []

  for (const field of resource.fields) {
    if (field.readOnly) continue
    if (!isCreate && field.includeOnUpdate === false) continue
    if (field.createOnly && !isCreate) continue
    if (body[field.name] === undefined) continue
    const value = castValue(field, body[field.name])
    if (isCreate && field.createOnly && value == null && !(resource.required || []).includes(field.name)) continue
    payload[field.name] = value
  }

  if (resource.table === 'dbo.contacto' && payload.autoriza_comunicaciones == null) {
    payload.autoriza_comunicaciones = false
  }

  for (const requiredField of resource.required || []) {
    const value = payload[requiredField]
    if (value === undefined || value === null || value === '') {
      errors.push({ field: requiredField, message: `${requiredField} es obligatorio` })
    }
  }

  for (const field of resource.fields.filter((item) => item.validation === 'chileRut')) {
    const value = payload[field.name]
    if (value === undefined || value === null || value === '') continue

    if (!isRutValid(value)) {
      errors.push({
        field: field.name,
        message: `${field.validationLabel || field.name} debe ser un RUT chileno valido`,
      })
      continue
    }

    payload[field.name] = formatRut(value)
  }

  if (errors.length) {
    const hasMissingRequired = errors.some((item) => item.message.includes('es obligatorio'))
    const error = validation(hasMissingRequired ? 'Faltan campos obligatorios' : 'Datos invalidos')
    error.errors = errors
    throw error
  }

  return payload
}

async function list(resourceName, query) {
  await ensureResourceSchema(resourceName)
  const resource = getDefinition(resourceName)
  const page = Math.max(1, Number(query.page || 1))
  const pageSize = Math.min(100, Math.max(10, Number(query.pageSize || 20)))
  const q = normalizeSearchQuery(query.q)
  const sortBy = String(query.sortBy || resource.idField)
  const sortDir = String(query.sortDir || 'asc')
  const dateFrom = query.dateFrom ? new Date(String(query.dateFrom)) : null
  const dateTo = query.dateTo ? new Date(String(query.dateTo)) : null
  const result = await repository.list(resource, {
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
    dateFrom: dateFrom && !Number.isNaN(dateFrom.getTime()) ? dateFrom : null,
    dateTo: dateTo && !Number.isNaN(dateTo.getTime()) ? dateTo : null,
  })
  return { page, pageSize, total: result.total, items: result.items }
}

async function get(resourceName, rawId) {
  await ensureResourceSchema(resourceName)
  const resource = getDefinition(resourceName)
  const id = repository.parseId(resource, rawId)
  if (id == null) throw validation('Identificador invalido', resource.idField)
  const item = await repository.getById(resource, id)
  if (!item) throw notFound(resourceName)
  return item
}

async function create(resourceName, body, actor) {
  await ensureResourceSchema(resourceName)
  const resource = getDefinition(resourceName)
  const payload = buildPayload(resource, body, { isCreate: true })

  // Regla: no permitir 2 contactos con el mismo RUT (mismo comportamiento que empresa).
  if (resourceName === 'contactos' && payload.rut) {
    await ensureUniqueContactoRut(payload.rut, null)
  }

  if (resource.audit) payload.usuario_creacion_id = actor?.userId ?? null
  const id = await repository.create(resource, payload)
  const created = await repository.getById(resource, id)
  await logChange(
    resourceName,
    id,
    'CREATE',
    [{ field: null, oldValue: null, newValue: created || payload }],
    actor,
  )
  return { [resource.idField]: id }
}

async function update(resourceName, rawId, body, actor) {
  await ensureResourceSchema(resourceName)
  const resource = getDefinition(resourceName)
  const id = repository.parseId(resource, rawId)
  if (id == null) throw validation('Identificador invalido', resource.idField)
  const before = await repository.getById(resource, id)
  if (!before) throw notFound(resourceName)
  const payload = buildPayload(resource, body, { isCreate: false })

  if (resourceName === 'contactos' && payload.rut) {
    await ensureUniqueContactoRut(payload.rut, id)
  }

  await repository.update(resource, id, payload)
  const nextId = payload[resource.idField] || id
  const after = await repository.getById(resource, nextId)
  const changedFields = Object.keys(payload)
    .filter((field) => !valuesEqual(before?.[field], after?.[field]))
    .map((field) => ({ field, oldValue: before?.[field], newValue: after?.[field] }))

  await logChange(resourceName, nextId, 'UPDATE', changedFields, actor)
  return { message: 'Updated', [resource.idField]: nextId }
}

async function remove(resourceName, rawId, actor) {
  await ensureResourceSchema(resourceName)
  const resource = getDefinition(resourceName)
  const id = repository.parseId(resource, rawId)
  if (id == null) throw validation('Identificador invalido', resource.idField)
  const existing = await repository.getById(resource, id)
  if (!existing) throw notFound(resourceName)

  const related = []
  for (const dependency of resource.dependencies || []) {
    // eslint-disable-next-line no-await-in-loop
    const total = await repository.countDependency(dependency, id)
    if (total > 0) related.push(`${dependency.label}: ${total}`)
  }

  if (related.length) {
    throw conflict(`No se puede eliminar porque tiene registros relacionados (${related.join(', ')})`)
  }

  await logChange(
    resourceName,
    id,
    'DELETE',
    [{ field: null, oldValue: existing, newValue: null }],
    actor,
  )
  await repository.remove(resource, id)
  return { message: 'Deleted' }
}

async function lookups() {
  const data = {}
  for (const resourceName of lookupResources) {
    // eslint-disable-next-line no-await-in-loop
    await ensureResourceSchema(resourceName)
    const resource = getDefinition(resourceName)
    // eslint-disable-next-line no-await-in-loop
    data[resourceName] = await repository.listLookup(resource)
  }
  return data
}

async function listChangeLog(resourceName, rawId) {
  const resource = getDefinition(resourceName)
  const id = repository.parseId(resource, rawId)
  if (id == null) throw validation('Identificador invalido', resource.idField)
  return repository.listChangeLog(resourceName, id)
}

module.exports = { list, get, create, update, remove, lookups, listChangeLog, uploadFile }
