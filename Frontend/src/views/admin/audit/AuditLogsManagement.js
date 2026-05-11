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
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilNotes } from '@coreui/icons'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import GridColumnPicker from 'src/components/GridColumnPicker'
import { buildDateRangeParams, exportToPdf, exportToXlsx, canExportExcelPdf } from 'src/utils/export'
import { useSelector } from 'react-redux'
import ExportModal from 'src/components/ExportModal'
import GridPaginationBar from 'src/components/GridPaginationBar'
import SortableTableHeader from 'src/components/SortableTableHeader'
import { sortRows, toggleSort } from 'src/utils/gridSort'
import { runOnEnter } from 'src/utils/gridKeyboard'

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
  const [exporting, setExporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [sortBy, setSortBy] = useState('auditId')
  const [sortDir, setSortDir] = useState('desc')
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
  const sortedItems = useMemo(
    () =>
      sortRows(items, sortBy, sortDir, {
        auditId: (row) => row.AuditId,
        createdAt: (row) => row.CreatedAt,
        actionType: (row) => row.ActionType,
        username: (row) => row.Username,
        email: (row) => row.Email,
        ipAddress: (row) => row.IPAddress,
        description: (row) => row.Description,
      }),
    [items, sortBy, sortDir],
  )

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

  const load = async ({ resetPage = false, qOverride, actionTypeOverride, pageOverride } = {}) => {
    if (resetPage) setPage(1)
    setLoading(true)
    try {
      const res = await api.get('/api/audit', {
        params: {
          page: pageOverride ?? (resetPage ? 1 : page),
          pageSize,
          q: qOverride ?? q,
          actionType: actionTypeOverride ?? actionType,
          sortBy,
          sortDir,
        },
      })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar auditoría')
    } finally {
      setLoading(false)
    }
  }

  const user = useSelector((s) => s.auth.user)
  const canExport = canExportExcelPdf(user)

  const fetchAll = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    const pageSizeAll = 100
    const dateParams = allRecords
      ? {}
      : buildDateRangeParams({ dateFrom: dateFromOverride, dateTo: dateToOverride })
    const all = []
    let pageAll = 1
    while (true) {
      const res = await api.get('/api/audit', {
        params: {
          page: pageAll,
          pageSize: pageSizeAll,
          q,
          actionType,
          sortBy,
          sortDir,
          ...dateParams,
        },
      })
      const batch = res.data.items || []
      all.push(...batch)
      if (all.length >= Number(res.data.total || 0) || batch.length < pageSizeAll) break
      pageAll += 1
    }
    return all
  }

  const exportExcel = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    setExporting(true)
    try {
      const all = await fetchAll({ allRecords, dateFromOverride, dateToOverride })
      const rows = all.map((a) => ({
        ID: a.AuditId,
        Fecha: a.CreatedAt ? new Date(a.CreatedAt).toLocaleString() : '',
        Accion: a.ActionType,
        Usuario: a.Username || '',
        Email: a.Email || '',
        IP: a.IPAddress || '',
        Detalle: a.Description || '',
      }))
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToXlsx({ fileName: `auditoria_${dateTag}.xlsx`, sheetName: 'Auditoria', rows })
    } catch (e) {
      toast.error(e?.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const exportPdf = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    setExporting(true)
    try {
      const all = await fetchAll({ allRecords, dateFromOverride, dateToOverride })
      const head = ['Fecha', 'Acción', 'Usuario', 'IP', 'Detalle']
      const body = all.map((a) => [
        a.CreatedAt ? new Date(a.CreatedAt).toLocaleString() : '',
        a.ActionType || '',
        a.Username || '-',
        a.IPAddress || '-',
        (a.Description || '').slice(0, 120),
      ])
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToPdf({ fileName: `auditoria_${dateTag}.pdf`, title: 'Auditoría', head, body })
    } catch (e) {
      toast.error(e?.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const openExport = (format) => {
    if (!canExport) return
    setExportFormat(format)
    setExportModalOpen(true)
  }

  const confirmExport = async ({ allRecords, dateFrom, dateTo, format }) => {
    if (format === 'pdf') {
      await exportPdf({ allRecords, dateFromOverride: dateFrom, dateToOverride: dateTo })
    } else {
      await exportExcel({ allRecords, dateFromOverride: dateFrom, dateToOverride: dateTo })
    }
    setExportModalOpen(false)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadActionTypes().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortDir])

  const handleSort = (key) => {
    const next = toggleSort({ key, sortBy, sortDir })
    setSortBy(next.sortBy)
    setSortDir(next.sortDir)
    setPage(1)
  }

  const onSearch = () => {
    load({ resetPage: true }).catch(() => {})
  }

  const onActionTypeFilterChange = (event) => {
    const nextActionType = event.target.value
    setActionType(nextActionType)
    load({ resetPage: true, actionTypeOverride: nextActionType }).catch(() => {})
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <CIcon icon={cilNotes} className="me-2" />
          <span>Auditoría</span>
        </div>
        <div className="d-flex gap-2">
          {canExport && (
            <>
              <CButton
                className="toolbar-export-button"
                color="secondary"
                variant="outline"
                onClick={() => openExport('xlsx')}
                disabled={exporting || loading}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> Exportar a Excel
              </CButton>
              <CButton
                className="toolbar-export-button"
                color="secondary"
                variant="outline"
                onClick={() => openExport('pdf')}
                disabled={exporting || loading}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> Exportar a PDF
              </CButton>
            </>
          )}
          <GridColumnPicker
            storageKey={columnsStorageKey}
            columns={columns}
            value={visibleColumns}
            onChange={setVisibleColumns}
          />
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-2 mb-3">
          <CCol md={3}>
            <CFormInput
              placeholder="Buscar: acción, descripción, username, email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={runOnEnter(onSearch)}
            />
          </CCol>
          <CCol md={3}>
            <CFormSelect value={actionType} onChange={onActionTypeFilterChange}>
              <option value="">Todas las acciones</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={2} className="d-flex gap-2">
            <CButton
              className="flex-grow-1"
              color="secondary"
              variant="outline"
              onClick={onSearch}
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </CButton>
            <CButton
              className="flex-grow-1"
              color="secondary"
              variant="outline"
              onClick={() => {
                setQ('')
                setActionType('')
                setPage(1)
                load({
                  resetPage: true,
                  qOverride: '',
                  actionTypeOverride: '',
                  pageOverride: 1,
                }).catch(() => {})
              }}
              disabled={loading}
            >
              Todo
            </CButton>
          </CCol>
        </CRow>

        <div className="macos-grid">
          <CTable hover>
            <CTableHead>
              <CTableRow>
                {columns.map((c) => {
                  if (!visibleColumns[c.key]) return null
                  return (
                    <SortableTableHeader
                      key={c.key}
                      column={c}
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  )
                })}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {sortedItems.map((a) => (
                <CTableRow key={a.AuditId}>
                  {visibleColumns.auditId && <CTableDataCell>{a.AuditId}</CTableDataCell>}
                  {visibleColumns.createdAt && (
                    <CTableDataCell>
                      {a.CreatedAt ? new Date(a.CreatedAt).toLocaleString() : '-'}
                    </CTableDataCell>
                  )}
                  {visibleColumns.actionType && <CTableDataCell>{a.ActionType}</CTableDataCell>}
                  {visibleColumns.username && <CTableDataCell>{a.Username || '-'}</CTableDataCell>}
                  {visibleColumns.email && <CTableDataCell>{a.Email || '-'}</CTableDataCell>}
                  {visibleColumns.ipAddress && (
                    <CTableDataCell>{a.IPAddress || '-'}</CTableDataCell>
                  )}
                  {visibleColumns.description && (
                    <CTableDataCell style={{ maxWidth: 520 }}>
                      {a.Description || '-'}
                    </CTableDataCell>
                  )}
                </CTableRow>
              ))}
              {items.length === 0 && (
                <CTableRow>
                  <CTableDataCell
                    colSpan={columns.length}
                    className="text-center text-body-secondary"
                  >
                    Sin resultados
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </div>

        <GridPaginationBar
          total={total}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          disabled={loading}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(Number(next))
            setPage(1)
          }}
        />
      </CCardBody>

      <ExportModal
        visible={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onConfirm={confirmExport}
        submitting={exporting}
        format={exportFormat}
      />
    </CCard>
  )
}

export default AuditLogsManagement
