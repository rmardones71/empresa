const { query } = require('../database/db')

async function listStages() {
  const res = await query(
    `
    SELECT StageId, StageName, StageOrder, ColorHex, IsClosedWon, IsClosedLost, IsActive
    FROM dbo.OpportunityStages
    WHERE IsActive = 1
    ORDER BY StageOrder ASC
    `,
  )
  return res.recordset
}

async function listOpportunities({ page, pageSize, q, stageId, assignedUserId, dateFrom, dateTo }) {
  const offset = (page - 1) * pageSize
  const where = ['o.IsDeleted = 0']
  const params = { offset, pageSize }

  if (q) {
    where.push(
      `(o.Title LIKE @q OR o.CompanyName LIKE @q OR o.ContactName LIKE @q OR o.ContactEmail LIKE @q OR o.OpportunityCode LIKE @q)`,
    )
    params.q = `%${q}%`
  }
  if (stageId) {
    where.push('o.CurrentStageId = @stageId')
    params.stageId = stageId
  }
  if (assignedUserId) {
    where.push('o.AssignedUserId = @assignedUserId')
    params.assignedUserId = assignedUserId
  }
  if (dateFrom) {
    where.push('o.CreatedAt >= @dateFrom')
    params.dateFrom = dateFrom
  }
  if (dateTo) {
    where.push('o.CreatedAt <= @dateTo')
    params.dateTo = dateTo
  }

  const whereSql = `WHERE ${where.join(' AND ')}`

  const totalRes = await query(
    `
    SELECT COUNT(1) AS Total
    FROM dbo.Opportunities o
    ${whereSql}
    `,
    params,
  )
  const total = Number(totalRes.recordset[0]?.Total || 0)

  const res = await query(
    `
    SELECT
      o.OpportunityId, o.OpportunityCode, o.Title, o.CompanyName,
      o.EstimatedValue, o.ProbabilityPercent, o.CurrentStageId,
      s.StageName, s.StageOrder, s.ColorHex,
      o.AssignedUserId, u.Username AS AssignedUsername,
      o.ExpectedCloseDate, o.Status, o.LossReasonId,
      o.CreatedAt, o.UpdatedAt
    FROM dbo.Opportunities o
    INNER JOIN dbo.OpportunityStages s ON s.StageId = o.CurrentStageId
    LEFT JOIN dbo.Users u ON u.UserId = o.AssignedUserId
    ${whereSql}
    ORDER BY o.UpdatedAt DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
    params,
  )

  return { total, items: res.recordset }
}

async function listOpportunitiesByStages() {
  const res = await query(
    `
    SELECT
      o.OpportunityId, o.OpportunityCode, o.Title, o.CompanyName,
      o.EstimatedValue, o.ProbabilityPercent, o.CurrentStageId,
      s.StageName, s.StageOrder, s.ColorHex,
      o.AssignedUserId, u.Username AS AssignedUsername,
      o.ExpectedCloseDate, o.Status, o.LossReasonId,
      o.CreatedAt, o.UpdatedAt
    FROM dbo.Opportunities o
    INNER JOIN dbo.OpportunityStages s ON s.StageId = o.CurrentStageId
    LEFT JOIN dbo.Users u ON u.UserId = o.AssignedUserId
    WHERE o.IsDeleted = 0
    ORDER BY s.StageOrder ASC, o.UpdatedAt DESC
    `,
  )
  return res.recordset
}

async function getOpportunityById(opportunityId) {
  const res = await query(
    `
    SELECT TOP 1 *
    FROM dbo.Opportunities
    WHERE OpportunityId = @opportunityId AND IsDeleted = 0
    `,
    { opportunityId },
  )
  return res.recordset[0] || null
}

async function insertOpportunity(opportunity) {
  const res = await query(
    `
    INSERT INTO dbo.Opportunities (
      OpportunityCode, Title, CustomerId, ContactName, ContactEmail, ContactPhone, CompanyName,
      EstimatedValue, ProbabilityPercent, CurrentStageId, AssignedUserId, ExpectedCloseDate,
      LeadSourceId, Priority, Status, LossReasonId, Competitor, Notes,
      CreatedBy, UpdatedBy
    )
    OUTPUT INSERTED.OpportunityId
    VALUES (
      @opportunityCode, @title, @customerId, @contactName, @contactEmail, @contactPhone, @companyName,
      @estimatedValue, @probabilityPercent, @currentStageId, @assignedUserId, @expectedCloseDate,
      @leadSourceId, @priority, @status, @lossReasonId, @competitor, @notes,
      @createdBy, @updatedBy
    )
    `,
    opportunity,
  )
  return res.recordset[0]?.OpportunityId
}

async function updateOpportunity(opportunityId, patch) {
  await query(
    `
    UPDATE dbo.Opportunities
    SET
      Title = @title,
      CustomerId = @customerId,
      ContactName = @contactName,
      ContactEmail = @contactEmail,
      ContactPhone = @contactPhone,
      CompanyName = @companyName,
      EstimatedValue = @estimatedValue,
      ProbabilityPercent = @probabilityPercent,
      CurrentStageId = @currentStageId,
      AssignedUserId = @assignedUserId,
      ExpectedCloseDate = @expectedCloseDate,
      LeadSourceId = @leadSourceId,
      Priority = @priority,
      Status = @status,
      LossReasonId = @lossReasonId,
      Competitor = @competitor,
      Notes = @notes,
      UpdatedBy = @updatedBy
    WHERE OpportunityId = @opportunityId AND IsDeleted = 0
    `,
    { opportunityId, ...patch },
  )
}

async function softDeleteOpportunity(opportunityId, updatedBy) {
  await query(
    `
    UPDATE dbo.Opportunities
    SET IsDeleted = 1, UpdatedBy = @updatedBy
    WHERE OpportunityId = @opportunityId
    `,
    { opportunityId, updatedBy },
  )
}

async function moveOpportunityStage(opportunityId, stageId, updatedBy) {
  await query(
    `
    UPDATE dbo.Opportunities
    SET CurrentStageId = @stageId, UpdatedBy = @updatedBy
    WHERE OpportunityId = @opportunityId AND IsDeleted = 0
    `,
    { opportunityId, stageId, updatedBy },
  )
}

module.exports = {
  listStages,
  listOpportunities,
  listOpportunitiesByStages,
  getOpportunityById,
  insertOpportunity,
  updateOpportunity,
  softDeleteOpportunity,
  moveOpportunityStage,
}

