import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAvatar,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
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

const ChangePassword = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [values, setValues] = useState(emptyValues)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setModalOpen(true)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const onChange = (key, val) => setValues((p) => ({ ...p, [key]: val }))

  const openModal = () => {
    setValues(emptyValues)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
  }

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
      setValues(emptyValues)
      setModalOpen(false)
      navigate('/profile')
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <CIcon icon={cilLockLocked} className="me-2" />
            <span className="fw-semibold">Seguridad de la cuenta</span>
          </div>
          <CButton color="primary" variant="outline" onClick={openModal} disabled={saving}>
            <CIcon icon={cilLockLocked} className="me-1" />
            Cambiar contraseña
          </CButton>
        </CCardHeader>
        <CCardBody>
          <div className="profile-summary-card">
            <CAvatar size="xl" color="primary" textColor="white">
              <CIcon icon={cilLockLocked} />
            </CAvatar>
            <div>
              <div className="fw-semibold fs-5">Contraseña de acceso</div>
              <div className="text-body-secondary">
                Actualiza tu contraseña desde una ventana segura.
              </div>
              <div className="small text-body-secondary mt-1">
                Debes ingresar tu contraseña actual para confirmar el cambio.
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CModal alignment="center" visible={modalOpen} onClose={closeModal} backdrop="static">
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
                  onChange={(e) => onChange('currentPassword', e.target.value)}
                  disabled={saving}
                  autoComplete="current-password"
                />
              </CCol>
              <CCol md={12}>
                <CFormInput
                  type="password"
                  label="Nueva contraseña"
                  value={values.newPassword}
                  onChange={(e) => onChange('newPassword', e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                />
              </CCol>
              <CCol md={12}>
                <CFormInput
                  type="password"
                  label="Confirmar nueva contraseña"
                  value={values.confirmPassword}
                  onChange={(e) => onChange('confirmPassword', e.target.value)}
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
              onClick={closeModal}
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
    </>
  )
}

export default ChangePassword
