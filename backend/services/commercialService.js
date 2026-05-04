const repository = require('../repositories/commercialRepository')
const { getResource, lookupResources } = require('../models/commercialModel')

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

  if (errors.length) {
    const error = validation('Faltan campos obligatorios')
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

async function create(resourceName, body) {
  const resource = getDefinition(resourceName)
  const payload = buildPayload(resource, body, { isCreate: true })
  const id = await repository.create(resource, payload)
  return { [resource.idField]: id }
}

async function update(resourceName, rawId, body) {
  const resource = getDefinition(resourceName)
  const id = repository.parseId(resource, rawId)
  if (id == null) throw validation('Identificador invalido', resource.idField)
  const payload = buildPayload(resource, body, { isCreate: false })
  await repository.update(resource, id, payload)
  return { message: 'Updated' }
}

async function remove(resourceName, rawId) {
  const resource = getDefinition(resourceName)
  const id = repository.parseId(resource, rawId)
  if (id == null) throw validation('Identificador invalido', resource.idField)

  const related = []
  for (const dependency of resource.dependencies || []) {
    // eslint-disable-next-line no-await-in-loop
    const total = await repository.countDependency(dependency, id)
    if (total > 0) related.push(`${dependency.label}: ${total}`)
  }

  if (related.length) {
    throw conflict(`No se puede eliminar porque tiene registros relacionados (${related.join(', ')})`)
  }

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

module.exports = { list, get, create, update, remove, lookups }
