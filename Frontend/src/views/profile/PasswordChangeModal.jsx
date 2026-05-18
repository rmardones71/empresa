import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilSave } from '@coreui/icons'
import { useToast } from 'src/components/ToastProvider'
import { changePassword } from 'src/services/authService'

const emptyValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const PasswordChangeModal = ({ visible, onClose, onSuccess }) => {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState(emptyValues)

  useEffect(() => {
    if (visible) setValues(emptyValues)
  }, [visible])

  const onChange = (key, val) => setValues((prev) => ({ ...prev, [key]: val }))

  const close = () => {
    if (saving) return
    onClose?.()
  }

  const onSave = async () => {
    if (!values.currentPassword || !values.newPassword || !values.confirmPassword) {
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
      setValues(emptyValues)
      onClose?.()
      onSuccess?.()
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal alignment="center" visible={visible} onClose={close} backdrop="static">
      <CModalHeader>
        <CModalTitle className="fw-bold d-flex align-items-center gap-2">
          <CIcon icon={cilLockLocked} />
          Cambiar contraseña
        </CModalTitle>
      </CModalHeader>
      <CForm
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <CModalBody>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormInput
                type="password"
                label="Contraseña actual"
                value={values.currentPassword}
                onChange={(event) => onChange('currentPassword', event.target.value)}
                disabled={saving}
                autoComplete="current-password"
                autoFocus
              />
            </CCol>
            <CCol md={12}>
              <CFormInput
                type="password"
                label="Nueva contraseña"
                value={values.newPassword}
                onChange={(event) => onChange('newPassword', event.target.value)}
                disabled={saving}
                autoComplete="new-password"
              />
            </CCol>
            <CCol md={12}>
              <CFormInput
                type="password"
                label="Confirmar nueva contraseña"
                value={values.confirmPassword}
                onChange={(event) => onChange('confirmPassword', event.target.value)}
                disabled={saving}
                autoComplete="new-password"
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            onClick={close}
            disabled={saving}
          >
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={saving}>
            <CIcon icon={cilSave} className="me-1" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default PasswordChangeModal
