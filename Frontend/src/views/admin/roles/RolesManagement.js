import React, { useMemo, useState, useEffect } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormSwitch,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilCloudDownload,
  cilPencil,
  cilPlus,
  cilShieldAlt,
  cilTrash,
  cilXCircle,
} from '@coreui/icons'
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
import { isSecurityAdmin, permissionActions } from 'src/utils/permissions'

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
  const [permissionModalOpen, setPermissionModalOpen] = useState(false)
  const [permissionRole, setPermissionRole] = useState(null)
  const [permissionRows, setPermissionRows] = useState([])
  const [activePermissionGroup, setActivePermissionGroup] = useState('')
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [savingPermissions, setSavingPermissions] = useState(false)
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
  const canManagePermissions = isSecurityAdmin(role)

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
    if (canManageRoles || canManagePermissions) {
      cols.push({ key: 'actions', label: 'Acciones', sortable: false })
    }
    return cols
  }, [canManagePermissions, canManageRoles])

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

  const toggleRoleStatus = async (row) => {
    if (!canManageRoles) return
    try {
      await api.put(`/api/roles/${row.RoleId}`, {
        roleName: row.RoleName,
        isActive: !row.IsActive,
      })
      toast.success('Estado del rol actualizado')
      await load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar estado del rol')
    }
  }

  const deleteRole = async (row) => {
    if (!canManageRoles) return
    const label = row.RoleName || `ID ${row.RoleId}`
    if (
      !window.confirm(
        `Â¿Seguro que deseas eliminar el rol "${label}"? Esta acciÃ³n no se puede deshacer.`,
      )
    ) {
      return
    }

    try {
      await api.delete(`/api/roles/${row.RoleId}`)
      toast.success('Rol eliminado')
      await load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar el rol')
    }
  }

  const openPermissions = async (row) => {
    if (!canManagePermissions) return
    setPermissionRole({ roleId: row.RoleId, roleName: row.RoleName })
    setPermissionRows([])
    setActivePermissionGroup('')
    setPermissionModalOpen(true)
    setLoadingPermissions(true)
    try {
      const res = await api.get(`/api/roles/${row.RoleId}/permissions`)
      const rows = res.data.items || []
      setPermissionRole(res.data.role)
      setPermissionRows(rows)
      setActivePermissionGroup(rows[0]?.moduleGroup || 'Otros')
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar matriz de permisos')
      setPermissionModalOpen(false)
    } finally {
      setLoadingPermissions(false)
    }
  }

  const closePermissions = () => {
    if (savingPermissions) return
    setPermissionModalOpen(false)
    setPermissionRole(null)
    setPermissionRows([])
    setActivePermissionGroup('')
  }

  const togglePermission = (moduleKey, action) => {
    if (permissionRole?.roleName === 'Super Admin') return
    setPermissionRows((prev) =>
      prev.map((item) =>
        item.moduleKey === moduleKey ? { ...item, [action]: !item[action] } : item,
      ),
    )
  }

  const savePermissions = async () => {
    if (!permissionRole?.roleId) return
    setSavingPermissions(true)
    try {
      const payload = {
        permissions: permissionRows.map((item) => ({
          moduleKey: item.moduleKey,
          create: !!item.create,
          read: !!item.read,
          write: !!item.write,
          delete: !!item.delete,
        })),
      }
      const res = await api.put(`/api/roles/${permissionRole.roleId}/permissions`, payload)
      setPermissionRows(res.data.items || [])
      toast.success('Matriz de permisos actualizada')
      setPermissionModalOpen(false)
      setPermissionRole(null)
      setPermissionRows([])
      setActivePermissionGroup('')
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar matriz de permisos')
    } finally {
      setSavingPermissions(false)
    }
  }

  const groupedPermissionRows = useMemo(() => {
    const groups = new Map()
    permissionRows.forEach((item) => {
      const group = item.moduleGroup || 'Otros'
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group).push(item)
    })
    return Array.from(groups.entries())
  }, [permissionRows])

  const activePermissionRows = useMemo(() => {
    const selected = groupedPermissionRows.find(([group]) => group === activePermissionGroup)
    return selected?.[1] || groupedPermissionRows[0]?.[1] || []
  }, [activePermissionGroup, groupedPermissionRows])

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
                    <CTableDataCell>
                      <span
                        className={`grid-status-pill ${r.IsActive ? 'is-active' : 'is-inactive'}`}
                      >
                        {r.IsActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </CTableDataCell>
                  )}
                  {visibleColumns.createdAt && (
                    <CTableDataCell>
                      {r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString() : '-'}
                    </CTableDataCell>
                  )}
                  {(canManageRoles || canManagePermissions) && (
                    <CTableDataCell className="d-flex gap-2 actions-cell">
                      {canManagePermissions && (
                        <CButton
                          size="sm"
                          color="primary"
                          variant="outline"
                          onClick={() => openPermissions(r)}
                        >
                          <CIcon icon={cilShieldAlt} className="me-1" /> Matriz
                        </CButton>
                      )}
                      {canManageRoles && (
                        <>
                          <CButton
                            size="sm"
                            color="secondary"
                            variant="outline"
                            onClick={() => openEdit(r)}
                          >
                            <CIcon icon={cilPencil} className="me-1" /> Editar
                          </CButton>
                          <CButton
                            className="grid-action-status"
                            size="sm"
                            color={r.IsActive ? 'success' : 'danger'}
                            variant="outline"
                            onClick={() => toggleRoleStatus(r)}
                          >
                            <CIcon
                              icon={r.IsActive ? cilCheckCircle : cilXCircle}
                              className="me-1"
                            />{' '}
                            {r.IsActive ? 'Activo' : 'Inactivo'}
                          </CButton>
                          <CButton
                            size="sm"
                            color="danger"
                            variant="outline"
                            onClick={() => deleteRole(r)}
                          >
                            <CIcon icon={cilTrash} className="me-1" /> Eliminar
                          </CButton>
                        </>
                      )}
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

        <CModal
          size="xl"
          alignment="center"
          visible={permissionModalOpen}
          onClose={closePermissions}
          backdrop="static"
        >
          <CModalHeader>
            <CModalTitle className="d-flex align-items-center gap-2">
              <CIcon icon={cilShieldAlt} />
              Matriz de permisos
              {permissionRole?.roleName && (
                <CBadge color="secondary">{permissionRole.roleName}</CBadge>
              )}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="permission-matrix-toolbar">
              <span>Selecciona las acciones permitidas por rol y modulo.</span>
              {permissionRole?.roleName === 'Super Admin' && (
                <CBadge color="success">Acceso total protegido</CBadge>
              )}
            </div>
            <div className="permission-matrix-menu">
              {groupedPermissionRows.map(([group, rows]) => (
                <CButton
                  key={group}
                  color={group === activePermissionGroup ? 'primary' : 'secondary'}
                  variant={group === activePermissionGroup ? undefined : 'outline'}
                  size="sm"
                  onClick={() => setActivePermissionGroup(group)}
                  disabled={loadingPermissions}
                >
                  {group}
                  <CBadge
                    color={group === activePermissionGroup ? 'light' : 'secondary'}
                    className="ms-2"
                  >
                    {rows.length}
                  </CBadge>
                </CButton>
              ))}
            </div>
            <div className="macos-grid permission-matrix-grid">
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableDataCell as="th">Modulo</CTableDataCell>
                    {permissionActions.map((action) => (
                      <CTableDataCell as="th" key={action.key} className="text-center">
                        {action.label}
                      </CTableDataCell>
                    ))}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {loadingPermissions && (
                    <CTableRow>
                      <CTableDataCell
                        colSpan={permissionActions.length + 1}
                        className="text-center"
                      >
                        Cargando permisos...
                      </CTableDataCell>
                    </CTableRow>
                  )}
                  {!loadingPermissions &&
                    activePermissionRows.map((item) => (
                      <CTableRow key={item.moduleKey}>
                        <CTableDataCell>
                          <div className="permission-module-name">
                            <strong>{item.moduleName}</strong>
                            <span>{item.menuPath || item.moduleKey}</span>
                          </div>
                        </CTableDataCell>
                        {permissionActions.map((action) => (
                          <CTableDataCell key={action.key} className="text-center">
                            <CFormSwitch
                              className="permission-switch"
                              checked={!!item[action.key]}
                              disabled={
                                savingPermissions ||
                                loadingPermissions ||
                                permissionRole?.roleName === 'Super Admin'
                              }
                              onChange={() => togglePermission(item.moduleKey, action.key)}
                            />
                          </CTableDataCell>
                        ))}
                      </CTableRow>
                    ))}
                  {!loadingPermissions && activePermissionRows.length === 0 && (
                    <CTableRow>
                      <CTableDataCell
                        colSpan={permissionActions.length + 1}
                        className="text-center text-body-secondary"
                      >
                        Sin modulos para este grupo
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={closePermissions}
              disabled={savingPermissions}
            >
              Cancelar
            </CButton>
            <CButton
              color="primary"
              onClick={savePermissions}
              disabled={
                savingPermissions ||
                loadingPermissions ||
                permissionRole?.roleName === 'Super Admin'
              }
            >
              {savingPermissions ? 'Guardando...' : 'Guardar permisos'}
            </CButton>
          </CModalFooter>
        </CModal>
      </CCardBody>
    </CCard>
  )
}

export default RolesManagement
