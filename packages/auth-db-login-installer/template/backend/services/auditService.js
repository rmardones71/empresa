const { query } = require('../database/db')

async function auditLog({ userId, actionType, description, ipAddress }) {
  await query(
    `
    INSERT INTO dbo.AuditLogs (UserId, ActionType, [Description], IPAddress)
    VALUES (@userId, @actionType, @description, @ipAddress)
    `,
    {
      userId: userId ?? null,
      actionType,
      description: description ?? null,
      ipAddress: ipAddress ?? null,
    },
  )
}

module.exports = { auditLog }

