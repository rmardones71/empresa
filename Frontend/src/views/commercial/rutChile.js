export const cleanRut = (value) =>
  String(value || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()

export const isRutValid = (value) => {
  const rut = cleanRut(value)
  if (rut.length < 2) return false

  const body = rut.slice(0, -1)
  const verifier = rut.slice(-1)
  if (!/^\d+$/.test(body)) return false

  let sum = 0
  let factor = 2

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }

  const rest = 11 - (sum % 11)
  const expected = rest === 11 ? '0' : rest === 10 ? 'K' : String(rest)
  return verifier === expected
}

export const formatRut = (value) => {
  const rut = cleanRut(value)
  if (rut.length < 2) return rut

  const body = rut.slice(0, -1)
  const verifier = rut.slice(-1)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedBody}-${verifier}`
}

export const getRutStatus = (value, { required = false } = {}) => {
  const rut = cleanRut(value)
  if (!rut) return required ? 'empty' : 'idle'
  return isRutValid(rut) ? 'valid' : 'invalid'
}
