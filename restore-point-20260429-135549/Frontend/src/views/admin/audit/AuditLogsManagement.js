import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import GridColumnPicker from 'src/components/GridColumnPicker'

const AuditLogsManagement = () => {
  const toast = useToast()
  const columnsStorageKey = 'crm_audit_grid_columns_v1'
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [actionType, setActionType] = useState('')
  const [actionTypes, setActionTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const raw = localStorage.getItem(columnsStorageKey)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    return {
      auditId: true,
      createdAt: true,
      actionType: true,
      username: true,
      email: false,
      ipAddress: false,
      description: true,
    }
  })

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const columns = useMemo(
    () => [
      { key: 'auditId', label: 'ID' },
      { key: 'createdAt', label: 'Fecha' },
      { key: 'actionType', label: 'Acción' },
      { key: 'username', label: 'Usuario' },
      { key: 'email', label: 'Email' },
      { key: 'ipAddress', label: 'IP' },
      { key: 'description', label: 'Detalle' },
    ],
    [],
  )

  const loadActionTypes = async () => {
    const res = await api.get('/api/audit/action-types')
    setActionTypes(res.data)
  }

  const load = async ({ resetPage = false } = {}) => {
    if (resetPage) setPage(1)
    setLoading(true)
    try {
      const res = await api.get('/api/audit', { params: { page: resetPage ? 1 : page, pageSize, q, actionType } })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar auditoría')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActionTypes().catch(() => {})
  }, [])

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>Auditoría</div>
        <GridColumnPicker
          storageKey={columnsStorageKey}
          columns={columns}
          value={visibleColumns}
          onChange={setVisibleColumns}
        />
      </CCardHeader>
      <CCardBody>
        <CRow className="g-2 mb-3">
          <CCol md={6}>
            <CFormInput
              placeholder="Buscar: acción, descripción, username, email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </CCol>
          <CCol md={4}>
            <CFormSelect value={actionType} onChange={(e) => setActionType(e.target.value)}>
              <option value="">Todas las acciones</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={2} className="d-grid">
            <CButton color="secondary" variant="outline" onClick={() => load({ resetPage: true })} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </CButton>
          </CCol>
        </CRow>

        <div className="macos-grid">
          <CTable hover>
            <CTableHead>
              <CTableRow>
                {columns.map((c) => {
                  if (!visibleColumns[c.key]) return null
                  return <CTableHeaderCell key={c.key}>{c.label}</CTableHeaderCell>
                })}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.map((a) => (
                <CTableRow key={a.AuditId}>
                  {visibleColumns.auditId && <CTableDataCell>{a.AuditId}</CTableDataCell>}
                  {visibleColumns.createdAt && (
                    <CTableDataCell>{a.CreatedAt ? new Date(a.CreatedAt).toLocaleString() : '-'}</CTableDataCell>
                  )}
                  {visibleColumns.actionType && <CTableDataCell>{a.ActionType}</CTableDataCell>}
                  {visibleColumns.username && <CTableDataCell>{a.Username || '-'}</CTableDataCell>}
                  {visibleColumns.email && <CTableDataCell>{a.Email || '-'}</CTableDataCell>}
                  {visibleColumns.ipAddress && <CTableDataCell>{a.IPAddress || '-'}</CTableDataCell>}
                  {visibleColumns.description && (
                    <CTableDataCell style={{ maxWidth: 520 }}>{a.Description || '-'}</CTableDataCell>
                  )}
                </CTableRow>
              ))}
              {items.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={columns.length} className="text-center text-body-secondary">
                    Sin resultados
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-body-secondary">
            Total: {total} · Página {page} / {totalPages}
          </div>
          <div className="d-flex gap-2 align-items-center">
            <CFormSelect
              size="sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              style={{ width: 110 }}
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </CFormSelect>
            <CButton size="sm" color="secondary" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Prev
            </CButton>
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default AuditLogsManagement
