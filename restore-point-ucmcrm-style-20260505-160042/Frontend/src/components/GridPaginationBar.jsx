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
    <div className="d-flex justify-content-between align-items-center mt-3">
      <div className="text-body-secondary">
        Total: {total} · Página {page} / {totalPages}
      </div>
      <div className="d-flex gap-2 align-items-center">
        <CFormSelect
          size="sm"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ width: 110 }}
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
