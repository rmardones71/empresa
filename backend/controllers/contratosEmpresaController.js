const service = require('../services/contratosEmpresaService')
const { auditLog } = require('../services/auditService')

function sendError(res, error) {
  if (!error.status) throw error
  return res.status(error.status).json({
    code: error.code || 'ERROR',
    message: error.message || 'Error',
    errors: error.errors,
  })
}

async function list(req, res) {
  try {
    const result = await service.list(req.query)
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function get(req, res) {
  try {
    const result = await service.get(req.params.id)
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function create(req, res) {
  try {
    const result = await service.create(req.body, { userId: req.user.sub })
    await auditLog({
      userId: req.user.sub,
      actionType: 'CONTRATO_EMPRESA_CREATE',
      description: `Created contratoEmpresaId=${result.id}`,
      ipAddress: req.ip,
    })
    return res.status(201).json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function update(req, res) {
  try {
    const result = await service.update(req.params.id, req.body, { userId: req.user.sub })
    await auditLog({
      userId: req.user.sub,
      actionType: 'CONTRATO_EMPRESA_UPDATE',
      description: `Updated contratoEmpresaId=${req.params.id}`,
      ipAddress: req.ip,
    })
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function remove(req, res) {
  try {
    const result = await service.remove(req.params.id, { userId: req.user.sub })
    await auditLog({
      userId: req.user.sub,
      actionType: 'CONTRATO_EMPRESA_DELETE',
      description: `Disabled contratoEmpresaId=${req.params.id}`,
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

async function addRelated(req, res) {
  try {
    const result = await service.addAssociation(req.params.id, req.params.type, req.body?.id)
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function removeRelated(req, res) {
  try {
    const result = await service.removeAssociation(req.params.id, req.params.type, req.params.relatedId)
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

module.exports = { addRelated, create, get, list, lookups, remove, removeRelated, update }
