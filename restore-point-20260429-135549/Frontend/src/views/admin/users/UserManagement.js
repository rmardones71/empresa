import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
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
import { cilCheckCircle, cilPencil, cilXCircle } from '@coreui/icons'
import api from 'src/services/api'
import UserFormModal from './UserFormModal'
import { useToast } from 'src/components/ToastProvider'

const UserManagement = () => {
  const toast = useToast()
  const columnsStorageKey = 'crm_users_grid_columns_v1'
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
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    // Default set that fits better on one screen
    return {
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
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const columns = useMemo(
    () => [
      { key: 'userId', label: 'ID' },
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
      { key: 'actions', label: 'Acciones' },
    ],
    [],
  )

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

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/users', { params: { page, pageSize, q, role } })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoles().catch(() => {})
  }, [])

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const onSearch = () => {
    setPage(1)
    load().catch(() => {})
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing({
      userId: row.UserId,
      username: row.Username,
      email: row.Email,
      firstName: row.FirstName,
      lastName: row.LastName,
      phone: row.Phone,
      isActive: row.IsActive,
      twoFactorEnabled: row.TwoFactorEnabled,
      roleId: roles.find((r) => r.RoleName === row.Role)?.RoleId,
    })
    setModalOpen(true)
  }

  const submitModal = async (values) => {
    setSaving(true)
    try {
      const payload = {
        username: values.username,
        email: values.email,
        firstName: values.firstName || null,
        lastName: values.lastName || null,
        phone: values.phone || null,
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
    try {
      await api.patch(`/api/users/${id}/toggle-2fa`)
      toast.success('2FA actualizado')
      load().catch(() => {})
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar 2FA')
    }
  }

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/api/users/${id}/toggle-status`)
      toast.success('Estado actualizado')
      load().catch(() => {})
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar estado')
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>Gestión de usuarios</div>
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
          <CButton color="primary" onClick={openCreate}>
            Nuevo
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-2 mb-3">
          <CCol md={6}>
            <CFormInput
              placeholder="Buscar: username, email, nombre, apellido"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </CCol>
          <CCol md={3}>
            <CFormSelect value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Todos los roles</option>
              {roles.map((r) => (
                <option key={r.RoleId} value={r.RoleName}>
                  {r.RoleName}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={3} className="d-grid">
            <CButton color="secondary" variant="outline" onClick={onSearch} disabled={loading}>
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
              {items.map((u) => (
                <CTableRow key={u.UserId}>
                  {visibleColumns.userId && <CTableDataCell>{u.UserId}</CTableDataCell>}
                  {visibleColumns.username && <CTableDataCell>{u.Username}</CTableDataCell>}
                  {visibleColumns.email && <CTableDataCell>{u.Email}</CTableDataCell>}
                  {visibleColumns.firstName && <CTableDataCell>{u.FirstName || '-'}</CTableDataCell>}
                  {visibleColumns.lastName && <CTableDataCell>{u.LastName || '-'}</CTableDataCell>}
                  {visibleColumns.phone && <CTableDataCell>{u.Phone || '-'}</CTableDataCell>}
                  {visibleColumns.role && <CTableDataCell>{u.Role}</CTableDataCell>}
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
                  <CTableDataCell className="d-flex gap-2 actions-cell">
                    <CButton size="sm" color="secondary" variant="outline" onClick={() => openEdit(u)}>
                      <CIcon icon={cilPencil} className="me-1" /> Editar
                    </CButton>
                    <CButton
                      size="sm"
                      color={u.TwoFactorEnabled ? 'success' : 'danger'}
                      variant="outline"
                      onClick={() => toggle2fa(u.UserId)}
                    >
                      <CIcon icon={u.TwoFactorEnabled ? cilCheckCircle : cilXCircle} className="me-1" /> 2FA
                    </CButton>
                    <CButton
                      size="sm"
                      color={u.IsActive ? 'success' : 'danger'}
                      variant="outline"
                      onClick={() => toggleStatus(u.UserId)}
                    >
                      <CIcon icon={u.IsActive ? cilCheckCircle : cilXCircle} className="me-1" /> Estado
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

      <UserFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={submitModal}
        roles={roles}
        initialValues={editing}
        submitting={saving}
      />
    </CCard>
  )
}

export default UserManagement
