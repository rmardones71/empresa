import React, { useMemo, useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilPencil, cilPlus, cilShieldAlt } from '@coreui/icons'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import GridColumnPicker from 'src/components/GridColumnPicker'
import RoleFormModal from './RoleFormModal'
import { buildDateRangeParams, exportToPdf, exportToXlsx, isPrivilegedRole } from 'src/utils/export'
import { useSelector } from 'react-redux'
import ExportModal from 'src/components/ExportModal'
import GridPaginationBar from 'src/components/GridPaginationBar'
import SortableTableHeader from 'src/components/SortableTableHeader'
import { sortRows, toggleSort } from 'src/utils/gridSort'

const RolesManagement = () => {
  const toast = useToast()
  const columnsStorageKey = 'crm_roles_grid_columns_v1'
  const [roles, setRoles] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [editing, setEditing] = useState(null)
  const [sortBy, setSortBy] = useState('roleId')
  const [sortDir, setSortDir] = useState('asc')
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const raw = localStorage.getItem(columnsStorageKey)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    return {
      roleId: true,
      roleName: true,
      isActive: true,
      createdAt: false,
      actions: true,
    }
  })

  const role = useSelector((s) => s.auth.user?.role)
  const canExport = isPrivilegedRole(role)
  const canManageRoles = role === 'Super Admin'

  const total = roles.length
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const sortedRoles = useMemo(
    () =>
      sortRows(roles, sortBy, sortDir, {
        roleId: (row) => row.RoleId,
        roleName: (row) => row.RoleName,
        isActive: (row) => row.IsActive,
        createdAt: (row) => row.CreatedAt,
      }),
    [roles, sortBy, sortDir],
  )
  const pagedRoles = useMemo(() => {
    const offset = (page - 1) * pageSize
    return sortedRoles.slice(offset, offset + pageSize)
  }, [sortedRoles, page, pageSize])

  useEffect(() => {
    if (page <= totalPages) return undefined
    const timeoutId = window.setTimeout(() => setPage(totalPages), 0)
    return () => window.clearTimeout(timeoutId)
  }, [page, totalPages])

  const columns = useMemo(() => {
    const cols = [
      { key: 'roleId', label: 'ID' },
      { key: 'roleName', label: 'Nombre' },
      { key: 'isActive', label: 'Activo' },
      { key: 'createdAt', label: 'Creado' },
    ]
    if (canManageRoles) cols.push({ key: 'actions', label: 'Acciones', sortable: false })
    return cols
  }, [canManageRoles])

  const handleSort = (key) => {
    const next = toggleSort({ key, sortBy, sortDir })
    setSortBy(next.sortBy)
    setSortDir(next.sortDir)
    setPage(1)
  }

  const load = async () => {
    const res = await api.get('/api/roles')
    setRoles(res.data)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing({
      roleId: row.RoleId,
      roleName: row.RoleName,
      isActive: row.IsActive,
    })
    setModalOpen(true)
  }

  const submitModal = async (values) => {
    const name = String(values?.roleName || '').trim()
    if (!name) return

    setSaving(true)
    try {
      if (editing?.roleId) {
        await api.put(`/api/roles/${editing.roleId}`, {
          roleName: name,
          isActive: !!values?.isActive,
        })
        toast.success('Rol actualizado')
      } else {
        await api.post('/api/roles', { roleName: name, isActive: !!values?.isActive })
        toast.success('Rol creado')
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (e) {
      const data = e.response?.data
      if (data?.code === 'DUPLICATE') {
        toast.error(data.message || 'Rol duplicado')
      } else {
        toast.error(data?.message || 'No se pudo guardar rol')
      }
    } finally {
      setSaving(false)
    }
  }

  const exportExcel = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    setExporting(true)
    try {
      const dateParams = allRecords
        ? {}
        : buildDateRangeParams({ dateFrom: dateFromOverride, dateTo: dateToOverride })
      const res = await api.get('/api/roles', { params: { ...dateParams } })
      const all = res.data || []
      const rows = all.map((r) => ({
        ID: r.RoleId,
        Nombre: r.RoleName,
        Activo: r.IsActive ? 'Si' : 'No',
        Creado: r.CreatedAt ? new Date(r.CreatedAt).toLocaleString() : '',
      }))
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToXlsx({ fileName: `roles_${dateTag}.xlsx`, sheetName: 'Roles', rows })
    } catch (e) {
      toast.error(e?.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const exportPdf = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    setExporting(true)
    try {
      const dateParams = allRecords
        ? {}
        : buildDateRangeParams({ dateFrom: dateFromOverride, dateTo: dateToOverride })
      const res = await api.get('/api/roles', { params: { ...dateParams } })
      const all = res.data || []
      const head = ['ID', 'Nombre', 'Activo', 'Creado']
      const body = all.map((r) => [
        String(r.RoleId ?? ''),
        r.RoleName || '',
        r.IsActive ? 'Si' : 'No',
        r.CreatedAt ? new Date(r.CreatedAt).toLocaleString() : '',
      ])
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToPdf({ fileName: `roles_${dateTag}.pdf`, title: 'Roles', head, body })
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

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <CIcon icon={cilShieldAlt} className="me-2" />
          <span>Roles</span>
        </div>
        <div className="d-flex gap-2">
          {canExport && (
            <>
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => openExport('xlsx')}
                disabled={exporting}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> Excel
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => openExport('pdf')}
                disabled={exporting}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> PDF
              </CButton>
            </>
          )}
          {canManageRoles && (
            <CButton color="primary" onClick={openCreate} disabled={saving}>
              <CIcon icon={cilPlus} className="me-1" /> Nuevo rol
            </CButton>
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
        <div className="macos-grid">
          <CTable hover>
            <CTableHead>
              <CTableRow>
                {columns.map((c) => {
                  if (c.key !== 'actions' && !visibleColumns[c.key]) return null
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
              {pagedRoles.map((r) => (
                <CTableRow key={r.RoleId}>
                  {visibleColumns.roleId && <CTableDataCell>{r.RoleId}</CTableDataCell>}
                  {visibleColumns.roleName && <CTableDataCell>{r.RoleName}</CTableDataCell>}
                  {visibleColumns.isActive && (
                    <CTableDataCell>{r.IsActive ? 'Sí' : 'No'}</CTableDataCell>
                  )}
                  {visibleColumns.createdAt && (
                    <CTableDataCell>
                      {r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString() : '-'}
                    </CTableDataCell>
                  )}
                  {canManageRoles && (
                    <CTableDataCell className="d-flex gap-2 actions-cell">
                      <CButton
                        size="sm"
                        color="secondary"
                        variant="outline"
                        onClick={() => openEdit(r)}
                      >
                        <CIcon icon={cilPencil} className="me-1" /> Editar
                      </CButton>
                    </CTableDataCell>
                  )}
                </CTableRow>
              ))}
              {pagedRoles.length === 0 && (
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
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(Number(next))
            setPage(1)
          }}
        />

        <RoleFormModal
          visible={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onSubmit={submitModal}
          submitting={saving}
          initialValues={editing}
        />

        <ExportModal
          visible={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          onConfirm={confirmExport}
          submitting={exporting}
          format={exportFormat}
        />
      </CCardBody>
    </CCard>
  )
}

export default RolesManagement
