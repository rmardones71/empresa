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

async function metrics(req, res) {
  try {
    const result = await service.metrics(req.query)
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function create(req, res) {
  try {
    const result = await service.create(req.body, { userId: req.user.sub, ipAddress: req.ip })
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

async function reserveCode(req, res) {
  try {
    const result = await service.reserveCode({ userId: req.user.sub })
    return res.status(201).json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function releaseCode(req, res) {
  try {
    const result = await service.releaseCode(req.body, { userId: req.user.sub })
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function update(req, res) {
  try {
    const result = await service.update(req.params.id, req.body, { userId: req.user.sub, ipAddress: req.ip })
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
    const result = await service.remove(req.params.id, { userId: req.user.sub, ipAddress: req.ip })
    await auditLog({
      userId: req.user.sub,
      actionType: 'CONTRATO_EMPRESA_DELETE',
      description: `Deleted contratoEmpresaId=${req.params.id}`,
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
    const result = await service.addAssociation(req.params.id, req.params.type, req.body?.id, {
      userId: req.user.sub,
      ipAddress: req.ip,
    })
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

async function removeRelated(req, res) {
  try {
    const result = await service.removeAssociation(req.params.id, req.params.type, req.params.relatedId, {
      userId: req.user.sub,
      ipAddress: req.ip,
    })
    return res.json(result)
  } catch (error) {
    return sendError(res, error)
  }
}

module.exports = {
  addRelated,
  create,
  get,
  metrics,
  list,
  lookups,
  releaseCode,
  remove,
  removeRelated,
  reserveCode,
  update,
}
