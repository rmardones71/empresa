function parseSqlServerError(err) {
  const number = err?.number ?? err?.originalError?.number
  const message = err?.message || err?.originalError?.message || ''

  // SQL Server unique constraint violations:
  // - 2627: Violation of PRIMARY KEY or UNIQUE constraint
  // - 2601: Cannot insert duplicate key row in object with unique index
  const isUnique = number === 2627 || number === 2601 || /duplicate/i.test(message)
  if (!isUnique) return null

  let field = null
  if (/UQ_Users_Username/i.test(message)) field = 'username'
  else if (/UQ_Users_Email/i.test(message)) field = 'email'
  else if (/UQ_Roles_RoleName/i.test(message)) field = 'roleName'

  return {
    httpStatus: 409,
    code: 'DUPLICATE',
    field,
    message:
      field === 'username'
        ? 'El username ya existe.'
        : field === 'email'
          ? 'El email ya existe.'
          : field === 'roleName'
            ? 'El nombre de rol ya existe.'
            : 'Registro duplicado (constraint UNIQUE).',
  }
}

module.exports = { parseSqlServerError }

