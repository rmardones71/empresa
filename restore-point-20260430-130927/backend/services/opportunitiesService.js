const repo = require('../repositories/opportunitiesRepository')
const { auditLog } = require('./auditService')
const { query } = require('../database/db')

async function generateOpportunityCode() {
  // Format: OPP-YYYYMMDD-##### (sequence by day)
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `OPP-${ymd}-`
  const res = await query(
    `
    SELECT COUNT(1) AS Cnt
    FROM dbo.Opportunities
    WHERE OpportunityCode LIKE @prefixLike
    `,
    { prefixLike: `${prefix}%` },
  )
  const next = Number(res.recordset[0]?.Cnt || 0) + 1
  return `${prefix}${String(next).padStart(5, '0')}`
}

async function listStages() {
  return repo.listStages()
}

async function listKanban() {
  const stages = await repo.listStages()
  const items = await repo.listOpportunitiesByStages()
  const byStage = new Map(stages.map((s) => [s.StageId, []]))
  for (const o of items) {
    if (!byStage.has(o.CurrentStageId)) byStage.set(o.CurrentStageId, [])
    byStage.get(o.CurrentStageId).push(o)
  }
  return { stages, itemsByStage: Object.fromEntries(byStage) }
}

async function listTable(params) {
  return repo.listOpportunities(params)
}

async function createOpportunity({ data, userId, ipAddress }) {
  const opportunityCode = await generateOpportunityCode()
  const stageId = data.currentStageId
  const stages = await repo.listStages()
  const stage = stages.find((s) => s.StageId === stageId)
  if (!stage) {
    const err = new Error('Invalid stage')
    err.status = 400
    throw err
  }

  const opportunityId = await repo.insertOpportunity({
    opportunityCode,
    title: data.title,
    customerId: data.customerId ?? null,
    contactName: data.contactName ?? null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    companyName: data.companyName ?? null,
    estimatedValue: data.estimatedValue ?? null,
    probabilityPercent: data.probabilityPercent ?? null,
    currentStageId: data.currentStageId,
    assignedUserId: data.assignedUserId ?? null,
    expectedCloseDate: data.expectedCloseDate ?? null,
    leadSourceId: data.leadSourceId ?? null,
    priority: data.priority ?? null,
    status: data.status ?? 'OPEN',
    lossReasonId: data.lossReasonId ?? null,
    competitor: data.competitor ?? null,
    notes: data.notes ?? null,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  })

  await auditLog({
    userId,
    actionType: 'OPPORTUNITY_CREATE',
    description: `Created opportunityId=${opportunityId} code=${opportunityCode}`,
    ipAddress,
  })

  return opportunityId
}

async function updateOpportunity({ opportunityId, data, userId, ipAddress }) {
  const existing = await repo.getOpportunityById(opportunityId)
  if (!existing) {
    const err = new Error('Not found')
    err.status = 404
    throw err
  }

  await repo.updateOpportunity(opportunityId, {
    title: data.title,
    customerId: data.customerId ?? null,
    contactName: data.contactName ?? null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    companyName: data.companyName ?? null,
    estimatedValue: data.estimatedValue ?? null,
    probabilityPercent: data.probabilityPercent ?? null,
    currentStageId: data.currentStageId,
    assignedUserId: data.assignedUserId ?? null,
    expectedCloseDate: data.expectedCloseDate ?? null,
    leadSourceId: data.leadSourceId ?? null,
    priority: data.priority ?? null,
    status: data.status ?? existing.Status,
    lossReasonId: data.lossReasonId ?? null,
    competitor: data.competitor ?? null,
    notes: data.notes ?? null,
    updatedBy: userId ?? null,
  })

  await auditLog({
    userId,
    actionType: 'OPPORTUNITY_UPDATE',
    description: `Updated opportunityId=${opportunityId}`,
    ipAddress,
  })
}

async function deleteOpportunity({ opportunityId, userId, ipAddress }) {
  await repo.softDeleteOpportunity(opportunityId, userId ?? null)
  await auditLog({
    userId,
    actionType: 'OPPORTUNITY_DELETE',
    description: `Soft deleted opportunityId=${opportunityId}`,
    ipAddress,
  })
}

async function moveStage({ opportunityId, stageId, userId, ipAddress }) {
  const stages = await repo.listStages()
  const stage = stages.find((s) => s.StageId === stageId)
  if (!stage) {
    const err = new Error('Invalid stage')
    err.status = 400
    throw err
  }

  // Business rules: cannot close won/lost without required fields
  const existing = await repo.getOpportunityById(opportunityId)
  if (!existing) {
    const err = new Error('Not found')
    err.status = 404
    throw err
  }

  if (stage.IsClosedWon) {
    if (existing.EstimatedValue == null) {
      const err = new Error('No se puede cerrar GANADO sin monto final.')
      err.status = 400
      throw err
    }
  }
  if (stage.IsClosedLost) {
    if (existing.LossReasonId == null) {
      const err = new Error('No se puede cerrar PERDIDO sin motivo.')
      err.status = 400
      throw err
    }
  }

  await repo.moveOpportunityStage(opportunityId, stageId, userId ?? null)
  await auditLog({
    userId,
    actionType: 'OPPORTUNITY_STAGE_MOVE',
    description: `Moved opportunityId=${opportunityId} stageId=${stageId}`,
    ipAddress,
  })
}

async function dashboard() {
  const stages = await repo.listStages()
  const res = await query(
    `
    SELECT
      COUNT(1) AS Total,
      SUM(CASE WHEN o.EstimatedValue IS NULL THEN 0 ELSE o.EstimatedValue END) AS TotalProjected
    FROM dbo.Opportunities o
    WHERE o.IsDeleted = 0
    `,
  )
  const total = Number(res.recordset[0]?.Total || 0)
  const totalProjected = Number(res.recordset[0]?.TotalProjected || 0)

  const byStageRes = await query(
    `
    SELECT
      s.StageId, s.StageName, s.StageOrder, s.ColorHex,
      COUNT(1) AS CountItems,
      SUM(CASE WHEN o.EstimatedValue IS NULL THEN 0 ELSE o.EstimatedValue END) AS SumValue
    FROM dbo.OpportunityStages s
    LEFT JOIN dbo.Opportunities o ON o.CurrentStageId = s.StageId AND o.IsDeleted = 0
    WHERE s.IsActive = 1
    GROUP BY s.StageId, s.StageName, s.StageOrder, s.ColorHex
    ORDER BY s.StageOrder ASC
    `,
  )

  const byStage = byStageRes.recordset

  return { total, totalProjected, byStage }
}

module.exports = {
  listStages,
  listKanban,
  listTable,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  moveStage,
  dashboard,
}
