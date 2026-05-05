const { query } = require('../database/db')

function fieldNames(resource, { includeCreateOnly = true } = {}) {
  return resource.fields
    .filter((field) => includeCreateOnly || !field.createOnly)
    .map((field) => field.name)
}

function uniqueFields(fields) {
  return [...new Set(fields)]
}

function assertField(resource, fieldName) {
  const allowed = new Set([
    resource.idField,
    ...fieldNames(resource),
    ...(resource.joins || []).map((join) => join.as),
    ...(resource.virtualFields || []),
  ])
  return allowed.has(fieldName)
}

function isVirtualField(resource, fieldName) {
  return (
    (resource.joins || []).some((join) => join.as === fieldName) ||
    (resource.virtualFields || []).includes(fieldName)
  )
}

function parseId(resource, rawId) {
  if (resource.idType === 'int') {
    const id = Number(rawId)
    if (!Number.isInteger(id) || id < 1) return null
    return id
  }
  const id = String(rawId || '').trim()
  return id || null
}

function buildSelect(resource) {
  const baseColumns = uniqueFields([resource.idField, ...fieldNames(resource)])
  const selectColumns = baseColumns.map((field) => `base.${field}`)
  const joinColumns = (resource.joins || []).map((join) => `${join.alias}.${join.field} AS ${join.as}`)
  const auditColumns = resource.audit
    ? [
        `COALESCE(
          NULLIF(LTRIM(RTRIM(CONCAT(creator.FirstName, ' ', creator.LastName))), ''),
          creator.Username,
          creator.Email,
          CASE WHEN base.usuario_creacion_id IS NULL THEN NULL ELSE CONCAT('Usuario ', base.usuario_creacion_id) END
        ) AS usuario_creacion`,
      ]
    : []
  const auditJoin = resource.audit
    ? 'LEFT JOIN dbo.Users creator ON creator.UserId = base.usuario_creacion_id'
    : ''
  const relationJoins = (resource.joins || [])
    .map((join) => `LEFT JOIN ${join.table} ${join.alias} ON ${join.alias}.${join.foreign} = base.${join.local}`)
    .join('\n')
  const joins = [relationJoins, auditJoin]
    .filter(Boolean)
    .join('\n')

  return {
    selectSql: [...selectColumns, ...joinColumns, ...auditColumns].join(',\n      '),
    joins,
  }
}

function buildWhere(resource, q, params) {
  const where = []
  if (q && resource.searchFields?.length) {
    const likeParts = resource.searchFields.map((field) => `base.${field} LIKE @q`)
    where.push(`(${likeParts.join(' OR ')})`)
    params.q = `%${q}%`
  }
  return where.length ? `WHERE ${where.join(' AND ')}` : ''
}

async function list(resource, { page, pageSize, q, sortBy, sortDir }) {
  const offset = (page - 1) * pageSize
  const params = { offset, pageSize }
  const whereSql = buildWhere(resource, q, params)
  const { selectSql, joins } = buildSelect(resource)

  const sortField = assertField(resource, sortBy) ? sortBy : resource.idField
  const sortPrefix = isVirtualField(resource, sortField) ? '' : 'base.'
  const direction = String(sortDir || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const totalResult = await query(
    `
    SELECT COUNT(1) AS Total
    FROM ${resource.table} base
    ${whereSql}
    `,
    params,
  )

  const result = await query(
    `
    SELECT
      ${selectSql}
    FROM ${resource.table} base
    ${joins}
    ${whereSql}
    ORDER BY ${sortPrefix}${sortField} ${direction}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
    params,
  )

  return {
    total: Number(totalResult.recordset[0]?.Total || 0),
    items: result.recordset,
  }
}

async function getById(resource, id) {
  const { selectSql, joins } = buildSelect(resource)
  const result = await query(
    `
    SELECT TOP 1
      ${selectSql}
    FROM ${resource.table} base
    ${joins}
    WHERE base.${resource.idField} = @id
    `,
    { id },
  )
  return result.recordset[0] || null
}

async function create(resource, data) {
  const insertFields = fieldNames(resource).filter((field) => data[field] !== undefined)
  const columns = insertFields.join(', ')
  const values = insertFields.map((field) => `@${field}`).join(', ')

  const outputSql =
    resource.idType === 'int'
      ? `OUTPUT INSERTED.${resource.idField}`
      : `OUTPUT INSERTED.${resource.idField}`

  const result = await query(
    `
    INSERT INTO ${resource.table} (${columns})
    ${outputSql}
    VALUES (${values})
    `,
    data,
  )
  return result.recordset[0]?.[resource.idField]
}

async function update(resource, id, data) {
  const updateFields = fieldNames(resource, { includeCreateOnly: false }).filter((field) => {
    const config = resource.fields.find((item) => item.name === field)
    return !config?.readOnly && config?.includeOnUpdate !== false && data[field] !== undefined
  })

  const auditSetSql = resource.audit ? ['fecha_actualizacion = SYSUTCDATETIME()'] : []
  const setSql = [...updateFields.map((field) => `${field} = @${field}`), ...auditSetSql].join(', ')
  await query(
    `
    UPDATE ${resource.table}
    SET ${setSql}
    WHERE ${resource.idField} = @id
    `,
    { ...data, id },
  )
}

async function remove(resource, id) {
  await query(`DELETE FROM ${resource.table} WHERE ${resource.idField} = @id`, { id })
}

async function countDependency(dependency, id) {
  const result = await query(
    `SELECT COUNT(1) AS Total FROM ${dependency.table} WHERE ${dependency.field} = @id`,
    { id },
  )
  return Number(result.recordset[0]?.Total || 0)
}

async function listLookup(resource) {
  const result = await query(
    `
    SELECT ${resource.idField} AS id, ${resource.displayField} AS label
    FROM ${resource.table}
    ORDER BY ${resource.displayField} ASC
    `,
  )
  return result.recordset
}

async function insertChangeLog(entry) {
  await query(
    `
    INSERT INTO dbo.commercial_change_log
      (recurso, id_registro, accion, campo, valor_anterior, valor_nuevo, usuario_id, ip_address)
    VALUES
      (@resource, @recordId, @action, @field, @oldValue, @newValue, @userId, @ipAddress)
    `,
    {
      resource: entry.resource,
      recordId: String(entry.recordId),
      action: entry.action,
      field: entry.field ?? null,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      userId: entry.userId ?? null,
      ipAddress: entry.ipAddress ?? null,
    },
  )
}

async function listChangeLog(resource, id) {
  const result = await query(
    `
    SELECT TOP 200
      log.id_log,
      log.recurso,
      log.id_registro,
      log.accion,
      log.campo,
      log.valor_anterior,
      log.valor_nuevo,
      log.usuario_id,
      COALESCE(
        NULLIF(LTRIM(RTRIM(CONCAT(u.FirstName, ' ', u.LastName))), ''),
        u.Username,
        u.Email,
        CASE WHEN log.usuario_id IS NULL THEN NULL ELSE CONCAT('Usuario ', log.usuario_id) END
      ) AS usuario,
      log.ip_address,
      log.fecha_cambio
    FROM dbo.commercial_change_log log
    LEFT JOIN dbo.Users u ON u.UserId = log.usuario_id
    WHERE log.recurso = @resource AND log.id_registro = @id
    ORDER BY log.fecha_cambio DESC, log.id_log DESC
    `,
    { resource, id: String(id) },
  )
  return result.recordset
}

module.exports = {
  parseId,
  list,
  getById,
  create,
  update,
  remove,
  countDependency,
  listLookup,
  insertChangeLog,
  listChangeLog,
}
