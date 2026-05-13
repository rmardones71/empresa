const repository = require('../repositories/commercialRepository')
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

function getDefinition(resourceName) {
  const resource = getResource(resourceName)
  if (!resource) throw notFound(resourceName)
  return resource
}

function castValue(field, value) {
  if (value === undefined) return undefined
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

  if (field.type === 'boolean') return !!value

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
  const resource = getDefinition(resourceName)
  const page = Math.max(1, Number(query.page || 1))
  const pageSize = Math.min(100, Math.max(10, Number(query.pageSize || 20)))
  const q = String(query.q || '').trim()
  const sortBy = String(query.sortBy || resource.idField)
  const sortDir = String(query.sortDir || 'asc')
  const result = await repository.list(resource, { page, pageSize, q, sortBy, sortDir })
  return { page, pageSize, total: result.total, items: result.items }
}

async function get(resourceName, rawId) {
  const resource = getDefinition(resourceName)
  const id = repository.parseId(resource, rawId)
  if (id == null) throw validation('Identificador invalido', resource.idField)
  const item = await repository.getById(resource, id)
  if (!item) throw notFound(resourceName)
  return item
}

async function create(resourceName, body, actor) {
  const resource = getDefinition(resourceName)
  const payload = buildPayload(resource, body, { isCreate: true })
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
  const resource = getDefinition(resourceName)
  const id = repository.parseId(resource, rawId)
  if (id == null) throw validation('Identificador invalido', resource.idField)
  const before = await repository.getById(resource, id)
  if (!before) throw notFound(resourceName)
  const payload = buildPayload(resource, body, { isCreate: false })
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

module.exports = { list, get, create, update, remove, lookups, listChangeLog }
