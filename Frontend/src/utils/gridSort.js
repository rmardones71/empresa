export const toggleSort = ({ key, sortBy, sortDir }) => {
  if (sortBy !== key) return { sortBy: key, sortDir: 'asc' }
  return { sortBy: key, sortDir: sortDir === 'asc' ? 'desc' : 'asc' }
}

const normalizeSortValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 1 : 0
  const date = value instanceof Date ? value : new Date(value)
  if (typeof value === 'string' && value.trim() && !Number.isNaN(date.getTime())) return date.getTime()
  if (typeof value === 'number') return value
  return String(value).toLocaleLowerCase()
}

export const sortRows = (rows, sortBy, sortDir, accessors = {}) => {
  const direction = sortDir === 'desc' ? -1 : 1
  const getValue = accessors[sortBy] || ((row) => row?.[sortBy])

  return [...rows].sort((left, right) => {
    const leftValue = normalizeSortValue(getValue(left))
    const rightValue = normalizeSortValue(getValue(right))
    if (leftValue < rightValue) return -1 * direction
    if (leftValue > rightValue) return 1 * direction
    return 0
  })
}
