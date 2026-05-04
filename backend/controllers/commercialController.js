const service = require('../services/commercialService')
const { auditLog } = require('../services/auditService')

function sendError(res, error) {
  if (!error.status) throw error
  return res.status(error.status || 500).json({
    code: error.code || 'ERROR',
    field: error.field,
    message: error.message || 'Error',
    errors: error.errors,
  })
}

async function list(req, res) {
  try {
    const result = await service.list(req.params.resource, req.query)
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function get(req, res) {
  try {
    const result = await service.get(req.params.resource, req.params.id)
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function create(req, res) {
  try {
    const result = await service.create(req.params.resource, req.body)
    await auditLog({
      userId: req.user.sub,
      actionType: 'COMMERCIAL_CREATE',
      description: `Created ${req.params.resource}`,
      ipAddress: req.ip,
    })
    return res.status(201).json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function update(req, res) {
  try {
    const result = await service.update(req.params.resource, req.params.id, req.body)
    await auditLog({
      userId: req.user.sub,
      actionType: 'COMMERCIAL_UPDATE',
      description: `Updated ${req.params.resource}/${req.params.id}`,
      ipAddress: req.ip,
    })
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function remove(req, res) {
  try {
    const result = await service.remove(req.params.resource, req.params.id)
    await auditLog({
      userId: req.user.sub,
      actionType: 'COMMERCIAL_DELETE',
      description: `Deleted ${req.params.resource}/${req.params.id}`,
      ipAddress: req.ip,
    })
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function lookups(req, res) {
  try {
    const result = await service.lookups()
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

module.exports = { list, get, create, update, remove, lookups }
