import React, { useMemo, useState, useEffect } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CFormInput, CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow } from '@coreui/react'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import GridColumnPicker from 'src/components/GridColumnPicker'

const RolesManagement = () => {
  const toast = useToast()
  const columnsStorageKey = 'crm_roles_grid_columns_v1'
  const [roles, setRoles] = useState([])
  const [roleName, setRoleName] = useState('')
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
    }
  })

  const columns = useMemo(
    () => [
      { key: 'roleId', label: 'ID' },
      { key: 'roleName', label: 'Nombre' },
      { key: 'isActive', label: 'Activo' },
      { key: 'createdAt', label: 'Creado' },
    ],
    [],
  )

  const load = async () => {
    const res = await api.get('/api/roles')
    setRoles(res.data)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const create = async () => {
    try {
      await api.post('/api/roles', { roleName })
      setRoleName('')
      toast.success('Rol creado')
      await load()
    } catch (e) {
      const data = e.response?.data
      if (data?.code === 'DUPLICATE') {
        toast.error(data.message || 'Rol duplicado')
      } else {
        toast.error(data?.message || 'No se pudo crear rol')
      }
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>Roles</div>
        <GridColumnPicker
          storageKey={columnsStorageKey}
          columns={columns}
          value={visibleColumns}
          onChange={setVisibleColumns}
        />
      </CCardHeader>
      <CCardBody>
        <div className="d-flex gap-2 mb-3">
          <CFormInput placeholder="Nuevo rol" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
          <CButton color="primary" onClick={create} disabled={!roleName.trim()}>
            Crear
          </CButton>
        </div>
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
              {roles.map((r) => (
                <CTableRow key={r.RoleId}>
                  {visibleColumns.roleId && <CTableDataCell>{r.RoleId}</CTableDataCell>}
                  {visibleColumns.roleName && <CTableDataCell>{r.RoleName}</CTableDataCell>}
                  {visibleColumns.isActive && <CTableDataCell>{r.IsActive ? 'Sí' : 'No'}</CTableDataCell>}
                  {visibleColumns.createdAt && (
                    <CTableDataCell>{r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString() : '-'}</CTableDataCell>
                  )}
                </CTableRow>
              ))}
              {roles.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={columns.length} className="text-center text-body-secondary">
                    Sin resultados
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default RolesManagement
