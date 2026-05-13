const { validationResult } = require('express-validator')
const service = require('../services/opportunitiesService')

function throwIfInvalid(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error('Validation error')
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

async function listStages(req, res) {
  const stages = await service.listStages()
  return res.json(stages)
}

async function kanban(req, res) {
  const data = await service.listKanban()
  return res.json(data)
}

async function list(req, res) {
  throwIfInvalid(req)
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize || 20)))
  const q = String(req.query.q || '').trim()
  const stageId = req.query.stageId ? Number(req.query.stageId) : null
  const assignedUserId = req.query.assignedUserId ? Number(req.query.assignedUserId) : null

  const data = await service.listTable({ page, pageSize, q, stageId, assignedUserId })
  return res.json({ page, pageSize, ...data })
}

async function create(req, res) {
  throwIfInvalid(req)
  const userId = req.user?.sub
  const opportunityId = await service.createOpportunity({ data: req.body, userId, ipAddress: req.ip })
  return res.status(201).json({ opportunityId })
}

async function update(req, res) {
  throwIfInvalid(req)
  const userId = req.user?.sub
  const opportunityId = Number(req.params.id)
  await service.updateOpportunity({ opportunityId, data: req.body, userId, ipAddress: req.ip })
  return res.json({ message: 'Updated' })
}

async function remove(req, res) {
  const userId = req.user?.sub
  const opportunityId = Number(req.params.id)
  await service.deleteOpportunity({ opportunityId, userId, ipAddress: req.ip })
  return res.json({ message: 'Deleted' })
}

async function moveStage(req, res) {
  throwIfInvalid(req)
  const userId = req.user?.sub
  const opportunityId = Number(req.params.id)
  await service.moveStage({ opportunityId, stageId: Number(req.body.stageId), userId, ipAddress: req.ip })
  return res.json({ message: 'Moved' })
}

async function dashboard(req, res) {
  const data = await service.dashboard()
  return res.json(data)
}

module.exports = { listStages, kanban, list, create, update, remove, moveStage, dashboard }
