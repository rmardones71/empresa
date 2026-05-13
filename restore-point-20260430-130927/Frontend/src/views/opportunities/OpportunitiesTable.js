import React, { useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CFormInput, CFormSelect, CRow, CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow } from '@coreui/react'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import GridColumnPicker from 'src/components/GridColumnPicker'
import OpportunityFormModal from './OpportunityFormModal'

const OpportunitiesTable = () => {
  const toast = useToast()
  const columnsStorageKey = 'crm_opportunities_grid_columns_v1'

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [stageId, setStageId] = useState('')
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const raw = localStorage.getItem(columnsStorageKey)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    return {
      opportunityCode: true,
      title: true,
      companyName: true,
      stage: true,
      estimatedValue: true,
      probability: true,
      assigned: true,
      expectedCloseDate: false,
      updatedAt: false,
      actions: true,
    }
  })

  const columns = useMemo(
    () => [
      { key: 'opportunityCode', label: 'Código' },
      { key: 'title', label: 'Título' },
      { key: 'companyName', label: 'Empresa' },
      { key: 'stage', label: 'Etapa' },
      { key: 'estimatedValue', label: 'Monto' },
      { key: 'probability', label: 'Prob.' },
      { key: 'assigned', label: 'Ejecutivo' },
      { key: 'expectedCloseDate', label: 'Cierre Est.' },
      { key: 'updatedAt', label: 'Actualización' },
      { key: 'actions', label: 'Acciones' },
    ],
    [],
  )

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const loadStages = async () => {
    const res = await api.get('/api/opportunities/stages')
    setStages(res.data)
  }

  const load = async ({ resetPage = false } = {}) => {
    if (resetPage) setPage(1)
    setLoading(true)
    try {
      const res = await api.get('/api/opportunities', {
        params: {
          page: resetPage ? 1 : page,
          pageSize,
          q,
          stageId: stageId ? Number(stageId) : undefined,
        },
      })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron cargar oportunidades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStages().catch(() => {})
  }, [])

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setModalOpen(true)
  }

  const onSaved = async () => {
    setModalOpen(false)
    await load()
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>Oportunidades (Tabla)</div>
        <div className="d-flex gap-2">
          <GridColumnPicker
            storageKey={columnsStorageKey}
            columns={columns}
            value={visibleColumns}
            onChange={setVisibleColumns}
          />
          <CButton color="primary" onClick={openCreate}>
            Nueva
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-2 mb-3">
          <CCol md={6}>
            <CFormInput placeholder="Buscar: código, título, empresa" value={q} onChange={(e) => setQ(e.target.value)} />
          </CCol>
          <CCol md={4}>
            <CFormSelect value={stageId} onChange={(e) => setStageId(e.target.value)}>
              <option value="">Todas las etapas</option>
              {stages.map((s) => (
                <option key={s.StageId} value={String(s.StageId)}>
                  {s.StageName}
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
                  if (c.key !== 'actions' && !visibleColumns[c.key]) return null
                  return <CTableHeaderCell key={c.key}>{c.label}</CTableHeaderCell>
                })}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.map((o) => (
                <CTableRow key={o.OpportunityId} onDoubleClick={() => openEdit(o)} style={{ cursor: 'pointer' }}>
                  {visibleColumns.opportunityCode && <CTableDataCell>{o.OpportunityCode}</CTableDataCell>}
                  {visibleColumns.title && <CTableDataCell>{o.Title}</CTableDataCell>}
                  {visibleColumns.companyName && <CTableDataCell>{o.CompanyName || '-'}</CTableDataCell>}
                  {visibleColumns.stage && <CTableDataCell>{o.StageName}</CTableDataCell>}
                  {visibleColumns.estimatedValue && <CTableDataCell>${o.EstimatedValue ?? '-'}</CTableDataCell>}
                  {visibleColumns.probability && (
                    <CTableDataCell>{o.ProbabilityPercent != null ? `${o.ProbabilityPercent}%` : '-'}</CTableDataCell>
                  )}
                  {visibleColumns.assigned && <CTableDataCell>{o.AssignedUsername || '-'}</CTableDataCell>}
                  {visibleColumns.expectedCloseDate && (
                    <CTableDataCell>{o.ExpectedCloseDate ? String(o.ExpectedCloseDate).slice(0, 10) : '-'}</CTableDataCell>
                  )}
                  {visibleColumns.updatedAt && (
                    <CTableDataCell>{o.UpdatedAt ? new Date(o.UpdatedAt).toLocaleString() : '-'}</CTableDataCell>
                  )}
                  <CTableDataCell className="actions-cell">
                    <CButton size="sm" color="secondary" variant="outline" onClick={() => openEdit(o)}>
                      Editar
                    </CButton>
                  </CTableDataCell>
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
            <CButton size="sm" color="secondary" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </CButton>
          </div>
        </div>
      </CCardBody>

      <OpportunityFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        stages={stages}
        initialValues={editing}
      />
    </CCard>
  )
}

export default OpportunitiesTable

