import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CAvatar,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormCheck,
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
import {
  cilCheckCircle,
  cilCloudDownload,
  cilPencil,
  cilTrash,
  cilXCircle,
  cilPeople,
} from '@coreui/icons'
import api from 'src/services/api'
import UserFormModal from './UserFormModal'
import { useToast } from 'src/components/ToastProvider'
import { buildDateRangeParams, exportToPdf, exportToXlsx, isPrivilegedRole } from 'src/utils/export'
import { useSelector } from 'react-redux'
import ExportModal from 'src/components/ExportModal'
import GridPaginationBar from 'src/components/GridPaginationBar'
import SortableTableHeader from 'src/components/SortableTableHeader'
import { sortRows, toggleSort } from 'src/utils/gridSort'
import { runOnEnter } from 'src/utils/gridKeyboard'
import { hasPermission } from 'src/utils/permissions'

const UserManagement = () => {
  const toast = useToast()
  const columnsStorageKey = 'crm_users_grid_columns_v1'
  const defaultVisibleColumns = {
    photo: true,
    userId: true,
    username: true,
    email: true,
    role: true,
    isActive: true,
    twoFactorEnabled: true,
    lastLogin: false,
    createdAt: false,
    firstName: false,
    lastName: false,
    phone: false,
    actions: true,
  }
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState([])
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const raw = localStorage.getItem(columnsStorageKey)
      if (raw) return { ...defaultVisibleColumns, ...JSON.parse(raw), photo: true }
    } catch {
      // ignore
    }
    return defaultVisibleColumns
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [sortBy, setSortBy] = useState('userId')
  const [sortDir, setSortDir] = useState('desc')

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const userRole = useSelector((s) => s.auth.user?.role)
  const currentUser = useSelector((s) => s.auth.user)
  const canExport = isPrivilegedRole(userRole)
  const canCreateUsers = hasPermission(currentUser, 'admin.users', 'create')
  const canReadUsers = hasPermission(currentUser, 'admin.users', 'read')
  const canWriteUsers = hasPermission(currentUser, 'admin.users', 'write')
  const canDeleteUsers = hasPermission(currentUser, 'admin.users', 'delete')
  const sortedItems = useMemo(
    () =>
      sortRows(items, sortBy, sortDir, {
        userId: (row) => row.UserId,
        username: (row) => row.Username,
        email: (row) => row.Email,
        firstName: (row) => row.FirstName,
        lastName: (row) => row.LastName,
        phone: (row) => row.Phone,
        role: (row) => row.Role,
        isActive: (row) => row.IsActive,
        twoFactorEnabled: (row) => row.TwoFactorEnabled,
        lastLogin: (row) => row.LastLogin,
        createdAt: (row) => row.CreatedAt,
      }),
    [items, sortBy, sortDir],
  )

  const columns = useMemo(
    () => [
      { key: 'userId', label: 'ID' },
      { key: 'photo', label: 'Foto', sortable: false },
      { key: 'username', label: 'Username' },
      { key: 'email', label: 'Email' },
      { key: 'firstName', label: 'Nombre' },
      { key: 'lastName', label: 'Apellido' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'role', label: 'Rol' },
      { key: 'isActive', label: 'Estado' },
      { key: 'twoFactorEnabled', label: '2FA' },
      { key: 'lastLogin', label: 'Último Login' },
      { key: 'createdAt', label: 'Creación' },
      { key: 'actions', label: 'Acciones', sortable: false },
    ],
    [],
  )

  const getRolePillClass = (roleName) => {
    const normalized = String(roleName || '')
      .trim()
      .toLowerCase()

    if (normalized === 'admin') return 'bg-warning-subtle text-dark fw-semibold'
    if (normalized === 'super admin' || normalized === 'superadmin')
      return 'bg-success-subtle text-dark fw-semibold'
    return 'bg-info-subtle text-dark fw-semibold'
  }

  const setColumnVisible = (key, value) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem(columnsStorageKey, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const loadRoles = async () => {
    const res = await api.get('/api/roles')
    setRoles(res.data)
  }

  const load = async ({ qOverride, roleOverride, pageOverride } = {}) => {
    setLoading(true)
    try {
      const effectivePage = pageOverride ?? page
      const res = await api.get('/api/users', {
        params: {
          page: effectivePage,
          pageSize,
          q: qOverride ?? q,
          role: roleOverride ?? role,
          sortBy,
          sortDir,
        },
      })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canReadUsers) return undefined
    const timeoutId = window.setTimeout(() => {
      loadRoles().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!canReadUsers) return undefined
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
    setPage(1)
    load({ pageOverride: 1 }).catch(() => {})
  }

  const onRoleFilterChange = (event) => {
    const nextRole = event.target.value
    setRole(nextRole)
    setPage(1)
    load({ pageOverride: 1, roleOverride: nextRole }).catch(() => {})
  }

  const fetchAllUsers = async ({ dateFromOverride, dateToOverride, allRecords } = {}) => {
    const pageSizeAll = 100
    const dateParams = allRecords
      ? {}
      : buildDateRangeParams({ dateFrom: dateFromOverride, dateTo: dateToOverride })
    const all = []
    let pageAll = 1
    while (true) {
      const res = await api.get('/api/users', {
        params: { page: pageAll, pageSize: pageSizeAll, q, role, sortBy, sortDir, ...dateParams },
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
      const all = await fetchAllUsers({ allRecords, dateFromOverride, dateToOverride })
      const rows = all.map((u) => ({
        ID: u.UserId,
        Username: u.Username,
        Email: u.Email,
        Nombre: u.FirstName || '',
        Apellido: u.LastName || '',
        Telefono: u.Phone || '',
        Rol: u.Role || '',
        Activo: u.IsActive ? 'Si' : 'No',
        '2FA': u.TwoFactorEnabled ? 'Si' : 'No',
        'Ultimo Login': u.LastLogin ? new Date(u.LastLogin).toLocaleString() : '',
        Creado: u.CreatedAt ? new Date(u.CreatedAt).toLocaleString() : '',
      }))
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToXlsx({ fileName: `usuarios_${dateTag}.xlsx`, sheetName: 'Usuarios', rows })
    } catch (e) {
      toast.error(e?.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const exportPdf = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    setExporting(true)
    try {
      const all = await fetchAllUsers({ allRecords, dateFromOverride, dateToOverride })
      const head = ['ID', 'Username', 'Email', 'Rol', 'Activo', '2FA', 'Creado']
      const body = all.map((u) => [
        String(u.UserId ?? ''),
        u.Username || '',
        u.Email || '',
        u.Role || '',
        u.IsActive ? 'Si' : 'No',
        u.TwoFactorEnabled ? 'Si' : 'No',
        u.CreatedAt ? new Date(u.CreatedAt).toLocaleString() : '',
      ])
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToPdf({ fileName: `usuarios_${dateTag}.pdf`, title: 'Usuarios', head, body })
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

  const openCreate = () => {
    if (!canCreateUsers) return
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    if (!canWriteUsers) return
    setEditing({
      userId: row.UserId,
      username: row.Username,
      email: row.Email,
      firstName: row.FirstName,
      lastName: row.LastName,
      phone: row.Phone,
      photoDataUrl: row.PhotoDataUrl,
      isActive: row.IsActive,
      twoFactorEnabled: row.TwoFactorEnabled,
      roleId: roles.find((r) => r.RoleName === row.Role)?.RoleId,
    })
    setModalOpen(true)
  }

  const submitModal = async (values) => {
    if (editing?.userId && !canWriteUsers) return
    if (!editing?.userId && !canCreateUsers) return
    setSaving(true)
    try {
      const payload = {
        username: values.username,
        email: values.email,
        firstName: values.firstName || null,
        lastName: values.lastName || null,
        phone: values.phone || null,
        photoDataUrl: values.photoDataUrl || null,
        roleId: Number(values.roleId),
        isActive: !!values.isActive,
        twoFactorEnabled: !!values.twoFactorEnabled,
      }

      if (editing?.userId) {
        await api.put(`/api/users/${editing.userId}`, payload)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/api/users', { ...payload, password: values.password })
        toast.success('Usuario creado')
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      const data = e.response?.data
      if (data?.code === 'DUPLICATE') {
        toast.error(data.message || 'Registro duplicado')
      } else {
        toast.error(data?.message || 'No se pudo guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const toggle2fa = async (id) => {
    if (!canWriteUsers) return
    try {
      await api.patch(`/api/users/${id}/toggle-2fa`)
      toast.success('2FA actualizado')
      load().catch(() => {})
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar 2FA')
    }
  }

  const toggleStatus = async (id) => {
    if (!canWriteUsers) return
    try {
      await api.patch(`/api/users/${id}/toggle-status`)
      toast.success('Estado actualizado')
      load().catch(() => {})
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar estado')
    }
  }

  const deleteUser = async (user) => {
    if (!canDeleteUsers) return
    const label = user.Username || user.Email || `ID ${user.UserId}`
    if (
      !window.confirm(
        `¿Seguro que deseas eliminar el usuario "${label}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }

    try {
      await api.delete(`/api/users/${user.UserId}`)
      toast.success('Usuario eliminado')
      load().catch(() => {})
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar el usuario')
    }
  }

  if (!canReadUsers) {
    return <CAlert color="warning">No tienes permisos para leer gestion de usuarios.</CAlert>
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <CIcon icon={cilPeople} className="me-2" />
          <span>Gestión de usuarios</span>
        </div>
        <div className="d-flex gap-2">
          <CDropdown>
            <CDropdownToggle color="secondary" variant="outline">
              Filtrar Columnas
            </CDropdownToggle>
            <CDropdownMenu style={{ minWidth: 260 }}>
              {columns
                .filter((c) => c.key !== 'actions')
                .map((c) => (
                  <CDropdownItem as="div" key={c.key} className="py-2">
                    <CFormCheck
                      label={c.label}
                      checked={!!visibleColumns[c.key]}
                      onChange={(e) => setColumnVisible(c.key, e.target.checked)}
                    />
                  </CDropdownItem>
                ))}
            </CDropdownMenu>
          </CDropdown>
          {canExport && (
            <>
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => openExport('xlsx')}
                disabled={exporting || loading}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> Excel
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => openExport('pdf')}
                disabled={exporting || loading}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> PDF
              </CButton>
            </>
          )}
          {canCreateUsers && (
            <CButton color="primary" onClick={openCreate}>
              Nuevo
            </CButton>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-2 mb-3">
          <CCol md={4}>
            <CFormInput
              placeholder="Buscar: username, email, nombre, apellido"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={runOnEnter(onSearch)}
            />
          </CCol>
          <CCol md={3}>
            <CFormSelect value={role} onChange={onRoleFilterChange}>
              <option value="">Todos los roles</option>
              {roles.map((r) => (
                <option key={r.RoleId} value={r.RoleName}>
                  {r.RoleName}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={5} className="d-flex gap-2">
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
                setRole('')
                setQ('')
                setPage(1)
                load({ pageOverride: 1, qOverride: '', roleOverride: '' }).catch(() => {})
              }}
              disabled={loading}
            >
              Todo
            </CButton>
          </CCol>
        </CRow>

        <div className="macos-grid users-grid">
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
                      className={c.key === 'actions' ? 'actions-cell' : undefined}
                    />
                  )
                })}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {sortedItems.map((u) => (
                <CTableRow key={u.UserId}>
                  {visibleColumns.userId && <CTableDataCell>{u.UserId}</CTableDataCell>}
                  {visibleColumns.photo && (
                    <CTableDataCell>
                      <CAvatar
                        size="md"
                        src={u.PhotoDataUrl || undefined}
                        color={u.PhotoDataUrl ? undefined : 'primary'}
                        textColor="white"
                      >
                        {!u.PhotoDataUrl &&
                          String(u.Username || '?')
                            .slice(0, 1)
                            .toUpperCase()}
                      </CAvatar>
                    </CTableDataCell>
                  )}
                  {visibleColumns.username && <CTableDataCell>{u.Username}</CTableDataCell>}
                  {visibleColumns.email && <CTableDataCell>{u.Email}</CTableDataCell>}
                  {visibleColumns.firstName && (
                    <CTableDataCell>{u.FirstName || '-'}</CTableDataCell>
                  )}
                  {visibleColumns.lastName && <CTableDataCell>{u.LastName || '-'}</CTableDataCell>}
                  {visibleColumns.phone && <CTableDataCell>{u.Phone || '-'}</CTableDataCell>}
                  {visibleColumns.role && (
                    <CTableDataCell>
                      <span
                        className={`d-inline-block px-2 py-1 ${getRolePillClass(u.Role)}`}
                        style={{ borderRadius: '20%' }}
                      >
                        {u.Role || '-'}
                      </span>
                    </CTableDataCell>
                  )}
                  {visibleColumns.isActive && (
                    <CTableDataCell>{u.IsActive ? 'Activo' : 'Inactivo'}</CTableDataCell>
                  )}
                  {visibleColumns.twoFactorEnabled && (
                    <CTableDataCell>{u.TwoFactorEnabled ? 'Sí' : 'No'}</CTableDataCell>
                  )}
                  {visibleColumns.lastLogin && (
                    <CTableDataCell>
                      {u.LastLogin ? new Date(u.LastLogin).toLocaleString() : '-'}
                    </CTableDataCell>
                  )}
                  {visibleColumns.createdAt && (
                    <CTableDataCell>
                      {u.CreatedAt ? new Date(u.CreatedAt).toLocaleDateString() : '-'}
                    </CTableDataCell>
                  )}
                  <CTableDataCell className="actions-cell">
                    <div className="d-flex gap-2 justify-content-end">
                      {canWriteUsers && (
                        <>
                          <CButton
                            size="sm"
                            color="secondary"
                            variant="outline"
                            onClick={() => openEdit(u)}
                          >
                            <CIcon icon={cilPencil} className="me-1" /> Editar
                          </CButton>
                          <CButton
                            className="grid-action-2fa"
                            size="sm"
                            color={u.TwoFactorEnabled ? 'success' : 'danger'}
                            variant="outline"
                            onClick={() => toggle2fa(u.UserId)}
                          >
                            <CIcon
                              icon={u.TwoFactorEnabled ? cilCheckCircle : cilXCircle}
                              className="me-1"
                            />{' '}
                            2FA
                          </CButton>
                          <CButton
                            className="grid-action-status"
                            size="sm"
                            color={u.IsActive ? 'success' : 'danger'}
                            variant="outline"
                            onClick={() => toggleStatus(u.UserId)}
                          >
                            <CIcon
                              icon={u.IsActive ? cilCheckCircle : cilXCircle}
                              className="me-1"
                            />{' '}
                            {u.IsActive ? 'Activo' : 'Inactivo'}
                          </CButton>
                        </>
                      )}
                      {canDeleteUsers && (
                        <CButton
                          size="sm"
                          color="danger"
                          variant="outline"
                          onClick={() => deleteUser(u)}
                        >
                          <CIcon icon={cilTrash} className="me-1" /> Eliminar
                        </CButton>
                      )}
                    </div>
                  </CTableDataCell>
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
            setPageSize(next)
            setPage(1)
          }}
        />
      </CCardBody>

      <UserFormModal
        key={editing?.userId || 'new-user'}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={submitModal}
        roles={roles}
        initialValues={editing}
        submitting={saving}
      />

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

export default UserManagement
