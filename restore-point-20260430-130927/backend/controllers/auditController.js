const { query } = require('../database/db')

async function listAuditLogs(req, res) {
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize || 20)))
  const q = String(req.query.q || '').trim()
  const actionType = String(req.query.actionType || '').trim()
  const userId = req.query.userId ? Number(req.query.userId) : null
  const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null
  const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null

  const offset = (page - 1) * pageSize

  const where = []
  const params = { offset, pageSize }

  if (q) {
    where.push(
      `(a.ActionType LIKE @q OR a.[Description] LIKE @q OR u.Username LIKE @q OR u.Email LIKE @q)`,
    )
    params.q = `%${q}%`
  }
  if (actionType) {
    where.push(`a.ActionType = @actionType`)
    params.actionType = actionType
  }
  if (userId) {
    where.push(`a.UserId = @userId`)
    params.userId = userId
  }
  if (dateFrom && !Number.isNaN(dateFrom.getTime())) {
    where.push(`a.CreatedAt >= @dateFrom`)
    params.dateFrom = dateFrom
  }
  if (dateTo && !Number.isNaN(dateTo.getTime())) {
    where.push(`a.CreatedAt <= @dateTo`)
    params.dateTo = dateTo
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const totalResult = await query(
    `
    SELECT COUNT(1) AS Total
    FROM dbo.AuditLogs a
    LEFT JOIN dbo.Users u ON u.UserId = a.UserId
    ${whereSql}
    `,
    params,
  )
  const total = Number(totalResult.recordset[0]?.Total || 0)

  const result = await query(
    `
    SELECT
      a.AuditId, a.UserId,
      u.Username, u.Email,
      a.ActionType, a.[Description], a.IPAddress, a.CreatedAt
    FROM dbo.AuditLogs a
    LEFT JOIN dbo.Users u ON u.UserId = a.UserId
    ${whereSql}
    ORDER BY a.AuditId DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
    params,
  )

  return res.json({ page, pageSize, total, items: result.recordset })
}

async function listActionTypes(req, res) {
  const result = await query(
    `
    SELECT DISTINCT TOP (200) ActionType
    FROM dbo.AuditLogs
    ORDER BY ActionType ASC
    `,
  )
  return res.json(result.recordset.map((r) => r.ActionType))
}

module.exports = { listAuditLogs, listActionTypes }

