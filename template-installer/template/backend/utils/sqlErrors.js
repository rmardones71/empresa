function parseSqlServerError(err) {
  const number = err?.number ?? err?.originalError?.number
  const message = err?.message || err?.originalError?.message || ''

  const isSspiIssue =
    /sspi/i.test(message) ||
    /El nombre principal no es correcto/i.test(message) ||
    /No se puede generar contexto SSPI/i.test(message)

  const isConnectionIssue =
    /Encryption not supported on the client/i.test(message) ||
    /SSL Provider/i.test(message) ||
    /Client unable to establish connection/i.test(message) ||
    /server is not found or not accessible/i.test(message) ||
    /Server is not found or not accessible/i.test(message) ||
    /network-related or instance-specific error/i.test(message)

  if (isSspiIssue || isConnectionIssue) {
    return {
      httpStatus: 503,
      code: 'DB_CONNECTION',
      field: null,
      message: isSspiIssue
        ? 'No fue posible conectar con SQL Server usando autenticacion integrada de Windows. Se detecto un problema SSPI/Kerberos. Solucion recomendada: configurar DB_INTEGRATED=false con DB_USER/DB_PASSWORD, o corregir el SPN/autenticacion del servicio SQL Server.'
        : 'No fue posible conectar con SQL Server. Revisa servidor, puerto, cifrado y credenciales de la conexion.',
    }
  }

  const permissionDeniedMatch = message.match(
    /The\s+(SELECT|INSERT|UPDATE|DELETE|EXECUTE|ALTER|REFERENCES)\s+permission was denied on the object '([^']+)'/i,
  )
  if (permissionDeniedMatch) {
    const [, permission, objectName] = permissionDeniedMatch
    return {
      httpStatus: 503,
      code: 'DB_PERMISSION',
      field: null,
      message: `El usuario configurado para la base de datos no tiene permiso ${String(permission).toUpperCase()} sobre ${objectName}. Debes otorgar permisos al usuario SQL de la aplicacion.`,
    }
  }

  // SQL Server unique constraint violations:
  // - 2627: Violation of PRIMARY KEY or UNIQUE constraint
  // - 2601: Cannot insert duplicate key row in object with unique index
  const isUnique = number === 2627 || number === 2601 || /duplicate/i.test(message)
  if (!isUnique) return null

  const constraintMatch = message.match(/constraint\s+'([^']+)'/i)
  const constraint = constraintMatch?.[1] || null
  const dupValueMatch = message.match(/duplicate key value is\s*\(([^)]+)\)/i)
  const dupValue = dupValueMatch?.[1]?.trim() || null

  let field = null
  let label = null

  // Known constraints -> friendly field + label (used across the app)
  if (/UQ_Users_Username/i.test(message)) {
    field = 'username'
    label = 'Username'
  } else if (/UQ_Users_Email/i.test(message)) {
    field = 'email'
    label = 'Email'
  } else if (/UQ_Roles_RoleName/i.test(message)) {
    field = 'roleName'
    label = 'Nombre de rol'
  } else if (/PK_empresa/i.test(message) || /UQ_empresa/i.test(message)) {
    field = 'rut'
    label = 'RUT Empresa'
  } else if (/UX_contacto_rut/i.test(message)) {
    field = 'rut'
    label = 'RUT contacto'
  }

  return {
    httpStatus: 409,
    code: 'DUPLICATE',
    field,
    message: (() => {
      if (label) {
        if (dupValue) return `${label} ya existe: ${dupValue}.`
        return `${label} ya existe.`
      }

      // Fallback generic but still informative
      if (constraint) {
        return `Registro duplicado: ya existe un registro con la misma clave (constraint ${constraint}).`
      }
      return 'Registro duplicado: ya existe un registro con el mismo valor en un campo unico.'
    })(),
  }
}

module.exports = { parseSqlServerError }
