const { query } = require('../database/db')
const commercialRepository = require('../repositories/commercialRepository')

const mainFields = [
  'rut_empresa',
  'id_categoria',
  'id_tipo_servicio',
  'id_estado_vital',
  'id_estado_ctr',
  'titulo',
  'fecha_firma',
  'fecha_inicio',
  'fecha_termino',
  'fecha_facturacion',
  'medio_pago',
  'reajustable',
  'multa',
  'requiere_orden_compra',
  'id_frecuencia',
  'id_tipo_tarifa',
  'id_contacto',
  'id_tipo_contacto',
  'id_estado_contacto',
]

const requiredFields = [
  'rut_empresa',
  'id_categoria',
  'id_tipo_servicio',
  'id_estado_vital',
  'id_estado_ctr',
  'titulo',
  'id_frecuencia',
  'id_tipo_tarifa',
  'id_contacto',
  'id_tipo_contacto',
  'id_estado_contacto',
]

const intFields = new Set([
  'id_categoria',
  'id_tipo_servicio',
  'id_estado_vital',
  'id_estado_ctr',
  'id_frecuencia',
  'id_tipo_tarifa',
  'id_contacto',
  'id_tipo_contacto',
  'id_estado_contacto',
])
const numberFields = new Set(['multa'])
const booleanFields = new Set(['reajustable', 'requiere_orden_compra'])
const dateFields = new Set(['fecha_firma', 'fecha_inicio', 'fecha_termino', 'fecha_facturacion'])
const changeLogResource = 'contratos_empresa'

const associationConfig = {
  lineas: {
    table: 'dbo.contrato_empresa_lineas',
    idField: 'linea_id',
    targetTable: 'dbo.linea',
    targetId: 'id_linea',
  },
  casos: {
    table: 'dbo.contrato_empresa_casos',
    idField: 'caso_id',
    targetTable: 'dbo.caso',
    targetId: 'id_caso',
  },
  documentos: {
    table: 'dbo.contrato_empresa_documentos',
    idField: 'documento_id',
    targetTable: 'dbo.documentos',
    targetId: 'id_documento',
  },
}

function httpError(status, message, code = 'ERROR', errors) {
  const error = new Error(message)
  error.status = status
  error.code = code
  error.errors = errors
  return error
}

function parseId(raw) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

function castField(field, value) {
  if (value === undefined) return undefined
  if (booleanFields.has(field)) {
    if (value === null || value === '') return false
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'si', 'sí', 'yes', 'on'].includes(normalized)) return true
      if (['false', '0', 'no', 'off'].includes(normalized)) return false
    }
    return !!value
  }
  if (value === null || value === '') return null
  if (intFields.has(field)) {
    const number = Number(value)
    return Number.isInteger(number) && number > 0 ? number : null
  }
  if (numberFields.has(field)) {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  if (dateFields.has(field)) {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? null : String(value).slice(0, 10)
  }
  return String(value).trim()
}

function buildPayload(body, { existing = null } = {}) {
  const payload = {}
  for (const field of mainFields) {
    if (body[field] !== undefined) {
      payload[field] = castField(field, body[field])
    } else if (existing) {
      payload[field] = castField(field, existing[field])
    } else {
      payload[field] = booleanFields.has(field) ? false : null
    }
  }

  const errors = requiredFields
    .filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '')
    .map((field) => ({ field, message: `${field} es obligatorio` }))

  if (errors.length) throw httpError(400, 'Faltan campos obligatorios', 'VALIDATION', errors)
  return payload
}

function formatContractCode(number) {
  return `CEMP${String(number).padStart(8, '0')}`
}

function parseContractCode(raw) {
  const match = /^CEMP(\d{8})$/.exec(String(raw || '').trim().toUpperCase())
  if (!match) return null
  return { number: Number(match[1]), code: `CEMP${match[1]}` }
}

function normalizeSearchText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120)
}

function escapeLike(value) {
  return normalizeSearchText(value).replace(/[~%_[\]]/g, (match) => `~${match}`)
}

function normalizeRutSearch(value) {
  return normalizeSearchText(value).replace(/[^0-9kK]/g, '').toUpperCase()
}

function normalizeCodeSearch(value) {
  return normalizeSearchText(value).replace(/\D/g, '')
}

function stringifyChangeValue(value) {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function valuesEqual(previous, next) {
  return stringifyChangeValue(previous) === stringifyChangeValue(next)
}

async function logChange(recordId, action, changes, actor = {}) {
  const validChanges = (changes || []).filter(Boolean)
  if (!validChanges.length) return

  for (const change of validChanges) {
    // eslint-disable-next-line no-await-in-loop
    await commercialRepository.insertChangeLog({
      resource: changeLogResource,
      recordId,
      action,
      field: change.field,
      oldValue: stringifyChangeValue(change.oldValue),
      newValue: stringifyChangeValue(change.newValue),
      userId: actor.userId,
      ipAddress: actor.ipAddress,
    })
  }
}

function buildFieldChanges(before, after, fields) {
  return fields
    .filter((field) => !valuesEqual(before?.[field], after?.[field]))
    .map((field) => ({ field, oldValue: before?.[field], newValue: after?.[field] }))
}

async function ensureSchema() {
  await query(`
    IF COL_LENGTH('dbo.empresa', 'ciudad') IS NULL
    BEGIN
      ALTER TABLE dbo.empresa ADD ciudad NVARCHAR(120) NULL;
    END
    IF COL_LENGTH('dbo.contratos_empresa', 'numero_contrato_empresa') IS NULL
    BEGIN
      ALTER TABLE dbo.contratos_empresa ADD numero_contrato_empresa INT NULL;
    END
    IF COL_LENGTH('dbo.contratos_empresa', 'codigo_contrato_empresa') IS NULL
    BEGIN
      ALTER TABLE dbo.contratos_empresa ADD codigo_contrato_empresa NVARCHAR(12) NULL;
    END
  `)

  await query(`
    DECLARE @baseNumeroContratoEmpresa INT;
    SELECT @baseNumeroContratoEmpresa = ISNULL(MAX(numero_contrato_empresa), 0)
    FROM dbo.contratos_empresa
    WHERE numero_contrato_empresa IS NOT NULL;

    ;WITH pendientes AS (
      SELECT id, @baseNumeroContratoEmpresa + ROW_NUMBER() OVER (ORDER BY id ASC) AS nuevo_numero
      FROM dbo.contratos_empresa
      WHERE numero_contrato_empresa IS NULL
    )
    UPDATE ce
    SET numero_contrato_empresa = pendientes.nuevo_numero
    FROM dbo.contratos_empresa ce
    INNER JOIN pendientes ON pendientes.id = ce.id;

    UPDATE dbo.contratos_empresa
    SET codigo_contrato_empresa = CONCAT('CEMP', RIGHT(CONCAT('00000000', numero_contrato_empresa), 8))
    WHERE codigo_contrato_empresa IS NULL
      AND numero_contrato_empresa IS NOT NULL;
  `)

  await query(`
    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'UX_contratos_empresa_numero'
        AND object_id = OBJECT_ID('dbo.contratos_empresa')
    )
    BEGIN
      CREATE UNIQUE INDEX UX_contratos_empresa_numero
      ON dbo.contratos_empresa(numero_contrato_empresa)
      WHERE numero_contrato_empresa IS NOT NULL;
    END

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'UX_contratos_empresa_codigo'
        AND object_id = OBJECT_ID('dbo.contratos_empresa')
    )
    BEGIN
      CREATE UNIQUE INDEX UX_contratos_empresa_codigo
      ON dbo.contratos_empresa(codigo_contrato_empresa)
      WHERE codigo_contrato_empresa IS NOT NULL;
    END
  `)

  await query(`
    IF OBJECT_ID('dbo.contrato_empresa_codigo_reservas', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.contrato_empresa_codigo_reservas (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_contrato_empresa_codigo_reservas PRIMARY KEY,
        numero_contrato_empresa INT NOT NULL,
        codigo_contrato_empresa NVARCHAR(12) NOT NULL,
        user_id INT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_contrato_empresa_codigo_reservas_created_at DEFAULT SYSUTCDATETIME()
      );
    END

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'UX_contrato_empresa_codigo_reservas_numero'
        AND object_id = OBJECT_ID('dbo.contrato_empresa_codigo_reservas')
    )
    BEGIN
      CREATE UNIQUE INDEX UX_contrato_empresa_codigo_reservas_numero
      ON dbo.contrato_empresa_codigo_reservas(numero_contrato_empresa);
    END

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'UX_contrato_empresa_codigo_reservas_codigo'
        AND object_id = OBJECT_ID('dbo.contrato_empresa_codigo_reservas')
    )
    BEGIN
      CREATE UNIQUE INDEX UX_contrato_empresa_codigo_reservas_codigo
      ON dbo.contrato_empresa_codigo_reservas(codigo_contrato_empresa);
    END
  `)

  await query(`
    IF COL_LENGTH('dbo.linea', 'contrato_empresa_id') IS NULL
    BEGIN
      ALTER TABLE dbo.linea ADD contrato_empresa_id INT NULL;
    END
    IF COL_LENGTH('dbo.caso', 'contrato_empresa_id') IS NULL
    BEGIN
      ALTER TABLE dbo.caso ADD contrato_empresa_id INT NULL;
    END
    IF COL_LENGTH('dbo.documentos', 'contrato_empresa_id') IS NULL
    BEGIN
      ALTER TABLE dbo.documentos ADD contrato_empresa_id INT NULL;
    END
  `)
}

async function reserveCode(actor = {}) {
  await ensureSchema()
  const result = await query(
    `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @lockContratos INT;
    DECLARE @lockReservas INT;
    DECLARE @nextNumeroContratoEmpresa INT;
    DECLARE @nextCodigoContratoEmpresa NVARCHAR(12);
    DECLARE @baseNumeroContratoEmpresa INT;

    SELECT @lockContratos = COUNT(1)
    FROM dbo.contratos_empresa WITH (TABLOCKX, HOLDLOCK);

    SELECT @lockReservas = COUNT(1)
    FROM dbo.contrato_empresa_codigo_reservas WITH (TABLOCKX, HOLDLOCK);

    DELETE FROM dbo.contrato_empresa_codigo_reservas
    WHERE (user_id = @user_id OR (user_id IS NULL AND @user_id IS NULL));

    ;WITH used_numbers AS (
      SELECT MAX(numero) AS max_numero
      FROM (
        SELECT numero_contrato_empresa AS numero
        FROM dbo.contratos_empresa
        WHERE numero_contrato_empresa IS NOT NULL
        UNION ALL
        SELECT numero_contrato_empresa
        FROM dbo.contrato_empresa_codigo_reservas
      ) used_numbers
    )
    SELECT @baseNumeroContratoEmpresa = ISNULL(max_numero, 0)
    FROM used_numbers;

    SET @nextNumeroContratoEmpresa = ISNULL(@baseNumeroContratoEmpresa, 0) + 1;

    IF @nextNumeroContratoEmpresa IS NULL
    BEGIN
      ROLLBACK;
      THROW 51001, 'No hay numeros de contrato disponibles', 1;
    END

    SET @nextCodigoContratoEmpresa = CONCAT('CEMP', RIGHT(CONCAT('00000000', @nextNumeroContratoEmpresa), 8));

    INSERT INTO dbo.contrato_empresa_codigo_reservas (
      numero_contrato_empresa,
      codigo_contrato_empresa,
      user_id
    )
    VALUES (
      @nextNumeroContratoEmpresa,
      @nextCodigoContratoEmpresa,
      @user_id
    );

    COMMIT;

    SELECT
      @nextNumeroContratoEmpresa AS numero_contrato_empresa,
      @nextCodigoContratoEmpresa AS codigo_contrato_empresa;
    `,
    { user_id: actor.userId ?? null },
  )
  return result.recordset[0]
}

async function releaseCode(body = {}, actor = {}) {
  await ensureSchema()
  const parsed = parseContractCode(body.codigo_contrato_empresa)
  if (!parsed) return { message: 'Released' }
  await query(
    `
    DELETE FROM dbo.contrato_empresa_codigo_reservas
    WHERE codigo_contrato_empresa = @codigo_contrato_empresa
      AND (user_id = @user_id OR user_id IS NULL OR @user_id IS NULL)
    `,
    { codigo_contrato_empresa: parsed.code, user_id: actor.userId ?? null },
  )
  return { message: 'Released' }
}

function selectSql() {
  return `
    ce.id,
    ce.numero_contrato_empresa,
    ce.codigo_contrato_empresa,
    ce.rut_empresa,
    emp.razon_social AS empresa,
    ce.id_categoria,
    cat.categoria,
    ce.id_tipo_servicio,
    ts.tipo_servicio,
    ce.id_estado_vital,
    ev.estado_vital,
    ce.id_estado_ctr,
    ectr.estado_ctr,
    ce.titulo,
    ce.fecha_firma,
    ce.fecha_inicio,
    ce.fecha_termino,
    ce.fecha_facturacion,
    ce.medio_pago,
    ce.reajustable,
    ce.multa,
    ce.requiere_orden_compra,
    ce.id_frecuencia,
    ff.frecuencia,
    ce.id_tipo_tarifa,
    tt.tipo_tarifa,
    ce.id_contacto,
    co.nombre AS contacto,
    co.rut AS contacto_rut,
    co.email AS contacto_email,
    co.telefono AS contacto_telefono,
    co.autoriza_comunicaciones AS contacto_autoriza_comunicaciones,
    ce.id_tipo_contacto,
    tc.tipo AS tipo_contacto,
    ce.id_estado_contacto,
    ec.estado_contacto,
    ce.activo,
    ce.created_at,
    ce.updated_at,
    ce.created_by,
    COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(creator.FirstName, ' ', creator.LastName))), ''), creator.Username, creator.Email) AS usuario_creador,
    ce.updated_by,
    COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(updater.FirstName, ' ', updater.LastName))), ''), updater.Username, updater.Email) AS usuario_modificador
  `
}

async function create(body, actor = {}) {
  await ensureSchema()
  const payload = buildPayload(body)
  const reserved = parseContractCode(body.codigo_contrato_empresa)
  const params = {
    ...payload,
    created_by: actor.userId ?? null,
    updated_by: actor.userId ?? null,
    numero_contrato_empresa: reserved?.number ?? null,
    codigo_contrato_empresa: reserved?.code ?? null,
  }

  const fields = [
    'numero_contrato_empresa',
    'codigo_contrato_empresa',
    ...mainFields,
    'created_by',
    'updated_by',
  ]
  const result = await query(
    `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @lockContratos INT;
    DECLARE @lockReservas INT;
    DECLARE @nextNumeroContratoEmpresa INT = @numero_contrato_empresa;
    DECLARE @nextCodigoContratoEmpresa NVARCHAR(12) = @codigo_contrato_empresa;
    DECLARE @baseNumeroContratoEmpresa INT;

    SELECT @lockContratos = COUNT(1)
    FROM dbo.contratos_empresa WITH (TABLOCKX, HOLDLOCK);

    SELECT @lockReservas = COUNT(1)
    FROM dbo.contrato_empresa_codigo_reservas WITH (TABLOCKX, HOLDLOCK);

    IF @nextNumeroContratoEmpresa IS NOT NULL AND @nextCodigoContratoEmpresa IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM dbo.contrato_empresa_codigo_reservas
        WHERE numero_contrato_empresa = @nextNumeroContratoEmpresa
          AND codigo_contrato_empresa = @nextCodigoContratoEmpresa
          AND (user_id = @created_by OR user_id IS NULL OR @created_by IS NULL)
      )
    BEGIN
      SET @nextNumeroContratoEmpresa = NULL;
      SET @nextCodigoContratoEmpresa = NULL;
    END

    IF @nextNumeroContratoEmpresa IS NULL OR @nextCodigoContratoEmpresa IS NULL
    BEGIN
      ;WITH used_numbers AS (
        SELECT MAX(numero) AS max_numero
        FROM (
          SELECT numero_contrato_empresa AS numero
          FROM dbo.contratos_empresa
          WHERE numero_contrato_empresa IS NOT NULL
          UNION ALL
          SELECT numero_contrato_empresa
          FROM dbo.contrato_empresa_codigo_reservas
        ) used_numbers
      )
      SELECT @baseNumeroContratoEmpresa = ISNULL(max_numero, 0)
      FROM used_numbers;

      SET @nextNumeroContratoEmpresa = ISNULL(@baseNumeroContratoEmpresa, 0) + 1;
      SET @nextCodigoContratoEmpresa = CONCAT('CEMP', RIGHT(CONCAT('00000000', @nextNumeroContratoEmpresa), 8));
    END

    DELETE FROM dbo.contrato_empresa_codigo_reservas
    WHERE numero_contrato_empresa = @nextNumeroContratoEmpresa
      AND codigo_contrato_empresa = @nextCodigoContratoEmpresa
      AND (user_id = @created_by OR user_id IS NULL OR @created_by IS NULL);

    INSERT INTO dbo.contratos_empresa (${fields.join(', ')})
    OUTPUT INSERTED.id
    VALUES (${fields
      .map((field) => {
        if (field === 'numero_contrato_empresa') return '@nextNumeroContratoEmpresa'
        if (field === 'codigo_contrato_empresa') return '@nextCodigoContratoEmpresa'
        return `@${field}`
      })
      .join(', ')})

    COMMIT;
    `,
    params,
  )
  const id = result.recordset[0]?.id
  await syncAssociations(id, 'lineas', body.lineas || [], actor)
  await syncAssociations(id, 'casos', body.casos || [], actor)
  await syncAssociations(id, 'documentos', body.documentos || [], actor)
  const created = await get(id)
  await logChange(
    id,
    'CREATE',
    [{ field: null, oldValue: null, newValue: created }],
    actor,
  )
  return created
}

function joinsSql() {
  return `
    INNER JOIN dbo.empresa emp ON emp.rut = ce.rut_empresa
    INNER JOIN dbo.categoria cat ON cat.id_categoria = ce.id_categoria
    INNER JOIN dbo.tipo_servicio ts ON ts.id_tipo_servicio = ce.id_tipo_servicio
    INNER JOIN dbo.estado_vital ev ON ev.id_estado_vital = ce.id_estado_vital
    INNER JOIN dbo.estado_ctr ectr ON ectr.id_estado_ctr = ce.id_estado_ctr
    INNER JOIN dbo.frecuencia_facturacion ff ON ff.id_frecuencia = ce.id_frecuencia
    INNER JOIN dbo.tipo_tarifa tt ON tt.id_tipo_tarifa = ce.id_tipo_tarifa
    INNER JOIN dbo.contacto co ON co.id_contacto = ce.id_contacto
    INNER JOIN dbo.tipo_contacto tc ON tc.id_tipo_contacto = ce.id_tipo_contacto
    INNER JOIN dbo.estado_contacto ec ON ec.id_estado_contacto = ce.id_estado_contacto
    LEFT JOIN dbo.Users creator ON creator.UserId = ce.created_by
    LEFT JOIN dbo.Users updater ON updater.UserId = ce.updated_by
  `
}

async function list({
  page = 1,
  pageSize = 20,
  q = '',
  searchMode = '',
  sortBy = 'id',
  sortDir = 'desc',
  dateFrom = '',
  dateTo = '',
} = {}) {
  await ensureSchema()
  const safePage = Math.max(1, Number(page || 1))
  const safePageSize = Math.min(100, Math.max(10, Number(pageSize || 20)))
  const offset = (safePage - 1) * safePageSize
  const direction = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC'
  const sortColumns = {
    id: 'ce.id',
    codigo_contrato_empresa: 'ce.codigo_contrato_empresa',
    titulo: 'ce.titulo',
    empresa: 'emp.razon_social',
    estado_ctr: 'ectr.estado_ctr',
    fecha_inicio: 'ce.fecha_inicio',
    updated_at: 'ce.updated_at',
  }
  const orderBy = sortColumns[sortBy] || sortColumns.id
  const params = { offset, pageSize: safePageSize }
  const where = []
  const searchText = normalizeSearchText(q)
  if (searchText) {
    const rutText = normalizeRutSearch(searchText)
    const codeText = normalizeCodeSearch(searchText)
    const headerMode = String(searchMode).toLowerCase() === 'header'
    const searchParts = headerMode
      ? [
          `ce.codigo_contrato_empresa COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
          `emp.razon_social COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
          `emp.rut COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
        ]
      : [
          `ce.codigo_contrato_empresa COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
          `ce.titulo COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
          `emp.razon_social COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
          `emp.rut COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
          `co.nombre COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
          `ectr.estado_ctr COLLATE Latin1_General_100_CI_AI LIKE @q ESCAPE '~'`,
        ]
    params.q = `%${escapeLike(searchText)}%`
    if (codeText) {
      searchParts.push(
        `ce.codigo_contrato_empresa COLLATE Latin1_General_100_CI_AI LIKE @qCode ESCAPE '~'`,
        `RIGHT(CONCAT('00000000', CONVERT(NVARCHAR(20), ce.numero_contrato_empresa)), 8) LIKE @qCode ESCAPE '~'`,
      )
      params.qCode = `%${escapeLike(codeText)}%`
    }
    if (rutText) {
      searchParts.push(
        `REPLACE(REPLACE(REPLACE(UPPER(emp.rut), '.', ''), '-', ''), ' ', '') LIKE @qRut ESCAPE '~'`,
        `REPLACE(REPLACE(REPLACE(UPPER(ce.rut_empresa), '.', ''), '-', ''), ' ', '') LIKE @qRut ESCAPE '~'`,
      )
      params.qRut = `%${escapeLike(rutText)}%`
    }
    where.push(`(${searchParts.join(' OR ')})`)
  }
  if (dateFrom) {
    where.push('ce.created_at >= @dateFrom')
    params.dateFrom = dateFrom
  }
  if (dateTo) {
    where.push('ce.created_at <= @dateTo')
    params.dateTo = dateTo
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const totalResult = await query(
    `
    SELECT COUNT(1) AS Total
    FROM dbo.contratos_empresa ce
    ${joinsSql()}
    ${whereSql}
    `,
    params,
  )
  const result = await query(
    `
    SELECT ${selectSql()}
    FROM dbo.contratos_empresa ce
    ${joinsSql()}
    ${whereSql}
    ORDER BY ${orderBy} ${direction}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
    params,
  )
  return { page: safePage, pageSize: safePageSize, total: Number(totalResult.recordset[0]?.Total || 0), items: result.recordset }
}

async function metrics({ weeks = 12, months = 12 } = {}) {
  await ensureSchema()
  const safeWeeks = Math.min(26, Math.max(4, Number(weeks || 12)))
  const safeMonths = Math.min(24, Math.max(3, Number(months || 12)))

  const byUser = await query(
    `
    SELECT
      ce.created_by AS user_id,
      COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(u.FirstName, ' ', u.LastName))), ''), u.Username, u.Email, '(Sin usuario)') AS usuario,
      COUNT(1) AS total
    FROM dbo.contratos_empresa ce
    LEFT JOIN dbo.Users u ON u.UserId = ce.created_by
    WHERE ce.activo = 1
    GROUP BY ce.created_by, u.FirstName, u.LastName, u.Username, u.Email
    ORDER BY total DESC
    `,
  )

  const weekly = await query(
    `
    ;WITH w AS (
      SELECT TOP (@weeks)
        DATEADD(DAY, -7 * (ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1), CAST(SYSUTCDATETIME() AS DATE)) AS week_start
      FROM sys.all_objects
    )
    SELECT
      w.week_start,
      COUNT(ce.id) AS total
    FROM w
    LEFT JOIN dbo.contratos_empresa ce
      ON ce.created_at >= w.week_start
     AND ce.created_at < DATEADD(DAY, 7, w.week_start)
     AND ce.activo = 1
    GROUP BY w.week_start
    ORDER BY w.week_start ASC
    `,
    { weeks: safeWeeks },
  )

  const monthly = await query(
    `
    ;WITH m AS (
      SELECT TOP (@months)
        DATEFROMPARTS(
          YEAR(DATEADD(MONTH, -(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1), SYSUTCDATETIME())),
          MONTH(DATEADD(MONTH, -(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1), SYSUTCDATETIME())),
          1
        ) AS month_start
      FROM sys.all_objects
    )
    SELECT
      m.month_start,
      COUNT(ce.id) AS total
    FROM m
    LEFT JOIN dbo.contratos_empresa ce
      ON ce.created_at >= m.month_start
     AND ce.created_at < DATEADD(MONTH, 1, m.month_start)
     AND ce.activo = 1
    GROUP BY m.month_start
    ORDER BY m.month_start ASC
    `,
    { months: safeMonths },
  )

  return {
    byUser: byUser.recordset,
    weekly: weekly.recordset,
    monthly: monthly.recordset,
  }
}

async function getBase(id) {
  const result = await query(
    `
    SELECT TOP 1 ${selectSql()}
    FROM dbo.contratos_empresa ce
    ${joinsSql()}
    WHERE ce.id = @id
    `,
    { id },
  )
  return result.recordset[0] || null
}

async function lineas(id) {
  const result = await query(
    `
    SELECT l.id_linea, l.titulo, ce.titulo AS contrato, ts.tipo_servicio, tt.tipo_tarifa, ff.frecuencia,
           l.divisa, l.tarifa_fija, l.tarifa_variable, l.moneda_fijo, l.moneda_variable, rel.created_at
    FROM dbo.contrato_empresa_lineas rel
    INNER JOIN dbo.linea l ON l.id_linea = rel.linea_id
    INNER JOIN dbo.contratos_empresa ce ON ce.id = l.contrato_empresa_id
    INNER JOIN dbo.tipo_servicio ts ON ts.id_tipo_servicio = l.id_tipo_servicio
    INNER JOIN dbo.tipo_tarifa tt ON tt.id_tipo_tarifa = l.id_tipo_tarifa
    INNER JOIN dbo.frecuencia_facturacion ff ON ff.id_frecuencia = l.id_frecuencia
    WHERE rel.contrato_empresa_id = @id
    ORDER BY rel.id ASC
    `,
    { id },
  )
  return result.recordset
}

async function casos(id) {
  const result = await query(
    `
    SELECT c.id_caso, c.titulo, co.nombre AS contacto, ce.titulo AS contrato, c.texto, c.relato, c.adjuntos, rel.created_at
    FROM dbo.contrato_empresa_casos rel
    INNER JOIN dbo.caso c ON c.id_caso = rel.caso_id
    INNER JOIN dbo.contacto co ON co.id_contacto = c.id_contacto
    INNER JOIN dbo.contratos_empresa ce ON ce.id = c.contrato_empresa_id
    WHERE rel.contrato_empresa_id = @id
    ORDER BY rel.id ASC
    `,
    { id },
  )
  return result.recordset
}

async function documentos(id) {
  const result = await query(
    `
    SELECT d.id_documento, d.nombre, d.tipo_documento, d.version, d.estado, d.responsable, ce.titulo AS contrato, rel.created_at
    FROM dbo.contrato_empresa_documentos rel
    INNER JOIN dbo.documentos d ON d.id_documento = rel.documento_id
    INNER JOIN dbo.contratos_empresa ce ON ce.id = d.contrato_empresa_id
    WHERE rel.contrato_empresa_id = @id
    ORDER BY rel.id ASC
    `,
    { id },
  )
  return result.recordset
}

async function get(id) {
  await ensureSchema()
  const parsedId = parseId(id)
  if (!parsedId) throw httpError(400, 'Identificador invalido', 'VALIDATION')
  const item = await getBase(parsedId)
  if (!item) throw httpError(404, 'Contrato empresa no encontrado', 'NOT_FOUND')
  return {
    ...item,
    lineas: await lineas(parsedId),
    casos: await casos(parsedId),
    documentos: await documentos(parsedId),
  }
}

async function update(id, body, actor = {}) {
  await ensureSchema()
  const parsedId = parseId(id)
  if (!parsedId) throw httpError(400, 'Identificador invalido', 'VALIDATION')
  const existing = await getBase(parsedId)
  if (!existing) throw httpError(404, 'Contrato empresa no encontrado', 'NOT_FOUND')
  const payload = buildPayload(body, { existing })
  const params = { ...payload, id: parsedId, updated_by: actor.userId ?? null }
  await query(
    `
    UPDATE dbo.contratos_empresa
    SET ${mainFields.map((field) => `${field} = @${field}`).join(', ')},
        updated_by = @updated_by,
        updated_at = SYSUTCDATETIME()
    WHERE id = @id
    `,
    params,
  )
  await syncAssociations(parsedId, 'lineas', body.lineas || [], actor)
  await syncAssociations(parsedId, 'casos', body.casos || [], actor)
  await syncAssociations(parsedId, 'documentos', body.documentos || [], actor)
  const updated = await get(parsedId)
  await logChange(parsedId, 'UPDATE', buildFieldChanges(existing, updated, mainFields), actor)
  return updated
}

async function remove(id, actor = {}) {
  const parsedId = parseId(id)
  if (!parsedId) throw httpError(400, 'Identificador invalido', 'VALIDATION')
  const existing = await get(parsedId)
  await query(
    `
    DELETE FROM dbo.contrato_empresa_lineas WHERE contrato_empresa_id = @id;
    DELETE FROM dbo.contrato_empresa_casos WHERE contrato_empresa_id = @id;
    DELETE FROM dbo.contrato_empresa_documentos WHERE contrato_empresa_id = @id;
    DELETE FROM dbo.linea WHERE contrato_empresa_id = @id;
    DELETE FROM dbo.caso WHERE contrato_empresa_id = @id;
    DELETE FROM dbo.documentos WHERE contrato_empresa_id = @id;
    DELETE FROM dbo.contratos_empresa WHERE id = @id;
    `,
    { id: parsedId },
  )
  await logChange(
    parsedId,
    'DELETE',
    [{ field: null, oldValue: existing, newValue: null }],
    actor,
  )
  return { message: 'Deleted' }
}

async function ensureParentAndTarget(contractId, type, targetId) {
  const parsedContractId = parseId(contractId)
  const parsedTargetId = parseId(targetId)
  if (!parsedContractId || !parsedTargetId) throw httpError(400, 'Identificador invalido', 'VALIDATION')

  const parent = await getBase(parsedContractId)
  if (!parent) throw httpError(404, 'Contrato empresa no encontrado', 'NOT_FOUND')
  const config = associationConfig[type]
  if (!config) throw httpError(404, 'Relacion no encontrada', 'NOT_FOUND')

  const target = await query(
    `SELECT TOP 1 ${config.targetId}, contrato_empresa_id FROM ${config.targetTable} WHERE ${config.targetId} = @targetId`,
    { targetId: parsedTargetId },
  )
  const targetRow = target.recordset[0]
  if (!targetRow) throw httpError(404, 'Registro relacionado no encontrado', 'NOT_FOUND')
  if (targetRow.contrato_empresa_id && Number(targetRow.contrato_empresa_id) !== parsedContractId) {
    throw httpError(
      409,
      'El registro relacionado pertenece a otro contrato empresa',
      'RELATED_RECORDS',
    )
  }
  return { contractId: parsedContractId, targetId: parsedTargetId, config }
}

async function addAssociation(contractId, type, targetId, actor = {}) {
  const { contractId: parsedContractId, targetId: parsedTargetId, config } = await ensureParentAndTarget(contractId, type, targetId)
  const existing = await query(
    `SELECT TOP 1 id FROM ${config.table} WHERE contrato_empresa_id = @contractId AND ${config.idField} = @targetId`,
    { contractId: parsedContractId, targetId: parsedTargetId },
  )
  if (existing.recordset[0]) {
    throw httpError(409, 'El registro ya esta asociado a este contrato empresa', 'RELATED_RECORDS')
  }
  await query(
    `
    UPDATE ${config.targetTable}
    SET contrato_empresa_id = @contractId
    WHERE ${config.targetId} = @targetId
      AND contrato_empresa_id IS NULL
    `,
    { contractId: parsedContractId, targetId: parsedTargetId },
  )
  await query(
    `
    IF NOT EXISTS (
      SELECT 1 FROM ${config.table}
      WHERE contrato_empresa_id = @contractId AND ${config.idField} = @targetId
    )
    BEGIN
      INSERT INTO ${config.table} (contrato_empresa_id, ${config.idField})
      VALUES (@contractId, @targetId)
    END
    `,
    { contractId: parsedContractId, targetId: parsedTargetId },
  )
  if (!existing.recordset[0]) {
    await logChange(
      parsedContractId,
      'UPDATE',
      [{ field: type, oldValue: null, newValue: parsedTargetId }],
      actor,
    )
  }
  return get(parsedContractId)
}

async function removeAssociation(contractId, type, targetId, actor = {}) {
  const { contractId: parsedContractId, targetId: parsedTargetId, config } = await ensureParentAndTarget(
    contractId,
    type,
    targetId,
  )
  const existing = await query(
    `SELECT TOP 1 id FROM ${config.table} WHERE contrato_empresa_id = @contractId AND ${config.idField} = @targetId`,
    { contractId: parsedContractId, targetId: parsedTargetId },
  )
  await query(
    `DELETE FROM ${config.table} WHERE contrato_empresa_id = @contractId AND ${config.idField} = @targetId`,
    { contractId: parsedContractId, targetId: parsedTargetId },
  )
  // Libera el registro para que pueda asociarse a otro contrato empresa.
  await query(
    `
    UPDATE ${config.targetTable}
    SET contrato_empresa_id = NULL
    WHERE ${config.targetId} = @targetId
      AND contrato_empresa_id = @contractId
    `,
    { contractId: parsedContractId, targetId: parsedTargetId },
  )
  if (existing.recordset[0]) {
    await logChange(
      parsedContractId,
      'UPDATE',
      [{ field: type, oldValue: parsedTargetId, newValue: null }],
      actor,
    )
  }
  return get(parsedContractId)
}

async function syncAssociations(contractId, type, values, actor = {}) {
  const config = associationConfig[type]
  const ids = [...new Set((values || []).map(parseId).filter(Boolean))]
  if (ids.length) {
    const validation = await query(
      `
      SELECT COUNT(1) AS invalid_count
      FROM ${config.targetTable}
      WHERE ${config.targetId} IN (${ids.map((_, index) => `@targetId${index}`).join(', ')})
        AND contrato_empresa_id IS NOT NULL
        AND contrato_empresa_id <> @contractId
      `,
      ids.reduce(
        (params, targetId, index) => ({ ...params, [`targetId${index}`]: targetId }),
        { contractId },
      ),
    )
    if (Number(validation.recordset[0]?.invalid_count || 0) > 0) {
      throw httpError(
        409,
        'Uno o mas registros relacionados pertenecen a otro contrato empresa',
        'RELATED_RECORDS',
      )
    }
  }
  const previous = await query(
    `SELECT ${config.idField} AS id FROM ${config.table} WHERE contrato_empresa_id = @contractId`,
    { contractId },
  )
  const previousIds = previous.recordset.map((row) => Number(row.id)).filter(Boolean)
  const previousSet = new Set(previousIds)
  const nextSet = new Set(ids)

  // Libera registros que ya no estaran asociados.
  const removedIds = previousIds.filter((targetId) => !nextSet.has(targetId))
  if (removedIds.length) {
    await query(
      `
      UPDATE ${config.targetTable}
      SET contrato_empresa_id = NULL
      WHERE contrato_empresa_id = @contractId
        AND ${config.targetId} IN (${removedIds.map((_, index) => `@removedId${index}`).join(', ')})
      `,
      removedIds.reduce(
        (params, targetId, index) => ({ ...params, [`removedId${index}`]: targetId }),
        { contractId },
      ),
    )
  }

  await query(`DELETE FROM ${config.table} WHERE contrato_empresa_id = @contractId`, { contractId })
  for (const targetId of ids) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      `
      UPDATE ${config.targetTable}
      SET contrato_empresa_id = @contractId
      WHERE ${config.targetId} = @targetId
        AND contrato_empresa_id IS NULL
      `,
      { contractId, targetId },
    )
    // eslint-disable-next-line no-await-in-loop
    await query(
      `
      IF NOT EXISTS (
        SELECT 1 FROM ${config.table}
        WHERE contrato_empresa_id = @contractId AND ${config.idField} = @targetId
      )
      BEGIN
        INSERT INTO ${config.table} (contrato_empresa_id, ${config.idField})
        VALUES (@contractId, @targetId)
      END
      `,
      { contractId, targetId },
    )
  }
  const changes = [
    ...previousIds
      .filter((targetId) => !nextSet.has(targetId))
      .map((targetId) => ({ field: type, oldValue: targetId, newValue: null })),
    ...ids
      .filter((targetId) => !previousSet.has(targetId))
      .map((targetId) => ({ field: type, oldValue: null, newValue: targetId })),
  ]
  await logChange(contractId, 'UPDATE', changes, actor)
}

async function lookupRows(table, id, label, extra = '') {
  const result = await query(`
    SELECT ${id} AS id, ${label} AS label${extra ? `, ${extra}` : ''}
    FROM ${table}
    ORDER BY ${label} ASC
  `)
  return result.recordset
}

async function lookups() {
  await ensureSchema()
  const [
    empresas,
    categorias,
    tipoServicios,
    estadoVitales,
    estadosCtr,
    contactos,
    contratosEmpresa,
    tipoContactos,
    estadoContactos,
    frecuencias,
    tipoTarifas,
    lineasLookup,
    casosLookup,
    documentosLookup,
  ] = await Promise.all([
    query(`
      SELECT
        rut AS id,
        razon_social AS label,
        id_categoria,
        giro,
        rubro,
        direccion,
        ciudad,
        comuna
      FROM dbo.empresa
      ORDER BY razon_social ASC
    `),
    lookupRows('dbo.categoria', 'id_categoria', 'categoria'),
    lookupRows('dbo.tipo_servicio', 'id_tipo_servicio', 'tipo_servicio'),
    lookupRows('dbo.estado_vital', 'id_estado_vital', 'estado_vital'),
    lookupRows('dbo.estado_ctr', 'id_estado_ctr', 'estado_ctr'),
    query(`
      SELECT
        id_contacto AS id,
        nombre AS label,
        id_tipo_contacto,
        id_estado_contacto,
        rut,
        email,
        telefono,
        autoriza_comunicaciones
      FROM dbo.contacto
      ORDER BY nombre ASC
    `),
    query('SELECT id AS id, titulo AS label, rut_empresa FROM dbo.contratos_empresa WHERE activo = 1 ORDER BY titulo ASC'),
    lookupRows('dbo.tipo_contacto', 'id_tipo_contacto', 'tipo'),
    lookupRows('dbo.estado_contacto', 'id_estado_contacto', 'estado_contacto'),
    lookupRows('dbo.frecuencia_facturacion', 'id_frecuencia', 'frecuencia'),
    lookupRows('dbo.tipo_tarifa', 'id_tipo_tarifa', 'tipo_tarifa'),
    query(`
      SELECT id_linea AS id, titulo AS label, contrato_empresa_id
      FROM dbo.linea
      WHERE contrato_empresa_id IS NULL
      ORDER BY titulo ASC
    `),
    query(`
      SELECT id_caso AS id, titulo AS label, id_contacto, contrato_empresa_id, adjuntos
      FROM dbo.caso
      WHERE contrato_empresa_id IS NULL
      ORDER BY titulo ASC
    `),
    query(`
      SELECT id_documento AS id, nombre AS label, contrato_empresa_id
      FROM dbo.documentos
      WHERE contrato_empresa_id IS NULL
      ORDER BY nombre ASC
    `),
  ])

  return {
    empresas: empresas.recordset,
    categorias,
    tipo_servicios: tipoServicios,
    estado_vitales: estadoVitales,
    estados_ctr: estadosCtr,
    contactos: contactos.recordset,
    contratos_empresa_lookup: contratosEmpresa.recordset,
    tipo_contactos: tipoContactos,
    estado_contactos: estadoContactos,
    frecuencias,
    tipo_tarifas: tipoTarifas,
    lineas: lineasLookup.recordset,
    casos: casosLookup.recordset,
    documentos: documentosLookup.recordset,
  }
}

module.exports = {
  addAssociation,
  create,
  get,
  list,
  metrics,
  lookups,
  releaseCode,
  remove,
  removeAssociation,
  reserveCode,
  update,
}
