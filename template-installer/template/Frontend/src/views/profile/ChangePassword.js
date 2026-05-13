import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CFormInput, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilSave } from '@coreui/icons'
import { useToast } from 'src/components/ToastProvider'
import { changePassword } from 'src/services/authService'

const ChangePassword = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const onChange = (key, val) => setValues((p) => ({ ...p, [key]: val }))

  const onSave = async () => {
    if (!values.currentPassword || !values.newPassword) {
      toast.error('Completa todos los campos')
      return
    }
    if (values.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (values.newPassword !== values.confirmPassword) {
      toast.error('La confirmación no coincide')
      return
    }

    setSaving(true)
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      toast.success('Contraseña actualizada')
      navigate('/profile')
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex align-items-center">
        <CIcon icon={cilLockLocked} className="me-2" />
        <span className="fw-semibold">Cambiar contraseña</span>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={6}>
            <CFormInput
              type="password"
              label="Contraseña actual"
              value={values.currentPassword}
              onChange={(e) => onChange('currentPassword', e.target.value)}
              disabled={saving}
              autoComplete="current-password"
            />
          </CCol>
          <CCol md={6} />
          <CCol md={6}>
            <CFormInput
              type="password"
              label="Nueva contraseña"
              value={values.newPassword}
              onChange={(e) => onChange('newPassword', e.target.value)}
              disabled={saving}
              autoComplete="new-password"
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="password"
              label="Confirmar nueva contraseña"
              value={values.confirmPassword}
              onChange={(e) => onChange('confirmPassword', e.target.value)}
              disabled={saving}
              autoComplete="new-password"
            />
          </CCol>
          <CCol md={12} className="d-flex justify-content-end">
            <CButton color="primary" onClick={onSave} disabled={saving}>
              <CIcon icon={cilSave} className="me-1" />
              Guardar
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default ChangePassword
