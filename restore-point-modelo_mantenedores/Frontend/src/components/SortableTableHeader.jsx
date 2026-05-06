import React from 'react'
import { CTableHeaderCell } from '@coreui/react'

const SortableTableHeader = ({ column, sortBy, sortDir, onSort, className }) => {
  const sortable = column.sortable !== false
  const active = sortBy === column.key
  const indicator = active ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'

  if (!sortable) {
    return <CTableHeaderCell className={className}>{column.label}</CTableHeaderCell>
  }

  return (
    <CTableHeaderCell className={className}>
      <button
        type="button"
        className={`grid-sort-button ${active ? 'active' : ''}`}
        onClick={() => onSort(column.key)}
        aria-label={`Ordenar por ${column.label}`}
      >
        <span>{column.label}</span>
        <span className="grid-sort-indicator">{indicator}</span>
      </button>
    </CTableHeaderCell>
  )
}

export default SortableTableHeader
