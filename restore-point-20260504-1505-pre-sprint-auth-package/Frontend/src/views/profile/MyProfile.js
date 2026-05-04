import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import {
  CAvatar,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilSave, cilUser } from '@coreui/icons'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import { setUser } from 'src/store/authSlice'

const maxPhotoBytes = 250 * 1024

const MyProfile = () => {
  const toast = useToast()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    photoDataUrl: '',
  })
  const [draft, setDraft] = useState(values)

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/users/me')
      const next = {
        firstName: res.data?.firstName || '',
        lastName: res.data?.lastName || '',
        email: res.data?.email || '',
        username: res.data?.username || '',
        photoDataUrl: res.data?.photoDataUrl || '',
      }
      setValues(next)
      setDraft(next)
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar tu perfil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadProfile()
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEdit = () => {
    setDraft(values)
    setPhotoError('')
    setModalOpen(true)
  }

  const onChange = (key, val) => setDraft((prev) => ({ ...prev, [key]: val }))

  const onPhotoChange = (event) => {
    const file = event.target.files?.[0]
    setPhotoError('')
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setPhotoError('Selecciona un archivo de imagen válido')
      return
    }

    if (file.size > maxPhotoBytes) {
      setPhotoError('La imagen no debe superar 250 KB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => onChange('photoDataUrl', String(reader.result || ''))
    reader.onerror = () => setPhotoError('No se pudo leer la imagen')
    reader.readAsDataURL(file)
  }

  const onSave = async () => {
    const email = String(draft.email || '').trim()
    if (!email) {
      toast.error('Email es requerido')
      return
    }

    setSaving(true)
    try {
      const res = await api.put('/api/users/me', {
        firstName: String(draft.firstName || '').trim() || null,
        lastName: String(draft.lastName || '').trim() || null,
        email,
        photoDataUrl: draft.photoDataUrl || null,
      })
      const nextValues = {
        ...values,
        firstName: res.data?.user?.firstName || '',
        lastName: res.data?.user?.lastName || '',
        email: res.data?.user?.email || '',
        username: res.data?.user?.username || values.username,
        photoDataUrl: res.data?.user?.photoDataUrl || '',
      }
      setValues(nextValues)
      setDraft(nextValues)
      if (res.data?.user) dispatch(setUser(res.data.user))
      toast.success('Datos actualizados')
      setModalOpen(false)
    } catch (e) {
      const validationMessage = e.response?.data?.errors?.[0]?.msg
      toast.error(
        validationMessage || e.response?.data?.message || 'No se pudo actualizar tus datos',
      )
    } finally {
      setSaving(false)
    }
  }

  const displayName =
    [values.firstName, values.lastName].filter(Boolean).join(' ') ||
    values.username ||
    values.email ||
    'Usuario'

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <CIcon icon={cilUser} className="me-2" />
            <span className="fw-semibold">Mis datos personales</span>
          </div>
          <CButton color="primary" variant="outline" onClick={openEdit} disabled={loading}>
            <CIcon icon={cilPencil} className="me-1" />
            Editar datos
          </CButton>
        </CCardHeader>
        <CCardBody>
          <div className="profile-summary-card">
            <CAvatar
              size="xl"
              src={values.photoDataUrl || undefined}
              color={values.photoDataUrl ? undefined : 'primary'}
              textColor="white"
            >
              {!values.photoDataUrl &&
                String(displayName || '?')
                  .slice(0, 1)
                  .toUpperCase()}
            </CAvatar>
            <div>
              <div className="fw-semibold fs-5">{displayName}</div>
              <div className="text-body-secondary">{values.email || '-'}</div>
              <div className="small text-body-secondary mt-1">
                Usuario: {values.username || '-'}
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CModal
        alignment="center"
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle className="fw-bold d-flex align-items-center gap-2">
            <CIcon icon={cilUser} />
            Editar mis datos personales
          </CModalTitle>
        </CModalHeader>
        <CForm
          onSubmit={(event) => {
            event.preventDefault()
            onSave()
          }}
        >
          <CModalBody>
            <div className="profile-photo-editor">
              <CAvatar
                size="xl"
                src={draft.photoDataUrl || undefined}
                color={draft.photoDataUrl ? undefined : 'primary'}
                textColor="white"
              >
                {!draft.photoDataUrl &&
                  String(displayName || '?')
                    .slice(0, 1)
                    .toUpperCase()}
              </CAvatar>
              <div className="flex-grow-1">
                <CFormLabel className="fw-semibold">Foto de perfil</CFormLabel>
                <CFormInput
                  type="file"
                  accept="image/*"
                  onChange={onPhotoChange}
                  disabled={saving}
                />
                <div className="small text-body-secondary mt-1">Formato imagen. Máximo 250 KB.</div>
                {photoError && <div className="small text-danger mt-1">{photoError}</div>}
                {draft.photoDataUrl && (
                  <CButton
                    type="button"
                    size="sm"
                    color="secondary"
                    variant="outline"
                    className="mt-2"
                    onClick={() => onChange('photoDataUrl', '')}
                    disabled={saving}
                  >
                    Quitar foto
                  </CButton>
                )}
              </div>
            </div>

            <CRow className="g-3 mt-1">
              <CCol md={6}>
                <CFormInput
                  label="Nombre"
                  value={draft.firstName}
                  onChange={(e) => onChange('firstName', e.target.value)}
                  disabled={saving}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  label="Apellido"
                  value={draft.lastName}
                  onChange={(e) => onChange('lastName', e.target.value)}
                  disabled={saving}
                />
              </CCol>
              <CCol md={12}>
                <CFormInput
                  type="email"
                  label="Email"
                  value={draft.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  disabled={saving}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              onClick={() => setModalOpen(false)}
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

export default MyProfile
