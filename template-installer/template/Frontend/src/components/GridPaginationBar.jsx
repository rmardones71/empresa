import React from 'react'
import { CButton, CFormSelect } from '@coreui/react'

const defaultSizes = [10, 20, 30, 50, 100]

const GridPaginationBar = ({
  total,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizes = defaultSizes,
  disabled = false,
}) => {
  return (
    <div className="grid-pagination-bar">
      <div className="grid-pagination-summary">
        Total: {total} · Página {page} / {totalPages}
      </div>
      <div className="grid-pagination-actions">
        <CFormSelect
          size="sm"
          className="grid-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={disabled}
        >
          {pageSizes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </CFormSelect>
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </CButton>
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </CButton>
      </div>
    </div>
  )
}

export default GridPaginationBar
