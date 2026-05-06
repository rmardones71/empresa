import React, { useEffect, useState } from 'react'
import {
  CAvatar,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { useForm } from 'react-hook-form'

const maxPhotoBytes = 250 * 1024

const UserFormModal = ({ visible, onClose, onSubmit, roles, initialValues, submitting }) => {
  const [photoDataUrl, setPhotoDataUrl] = useState(initialValues?.photoDataUrl || '')
  const [photoError, setPhotoError] = useState('')
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      roleId: '',
      isActive: true,
      twoFactorEnabled: false,
    },
  })

  useEffect(() => {
    if (visible) {
      reset({
        username: initialValues?.username || '',
        email: initialValues?.email || '',
        password: '',
        firstName: initialValues?.firstName || '',
        lastName: initialValues?.lastName || '',
        phone: initialValues?.phone || '',
        roleId: initialValues?.roleId ? String(initialValues.roleId) : '',
        isActive: initialValues?.isActive ?? true,
        twoFactorEnabled: initialValues?.twoFactorEnabled ?? false,
      })
    }
  }, [visible, initialValues, reset])

  const isEdit = !!initialValues?.userId

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    setPhotoError('')

    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Selecciona una imagen válida')
      return
    }
    if (file.size > maxPhotoBytes) {
      setPhotoError('La imagen debe pesar máximo 250 KB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => setPhotoDataUrl(String(reader.result || ''))
    reader.onerror = () => setPhotoError('No se pudo leer la imagen')
    reader.readAsDataURL(file)
  }

  const submitWithPhoto = (values) => onSubmit({ ...values, photoDataUrl })

  const handleClose = () => {
    setPhotoError('')
    onClose()
  }

  return (
    <CModal alignment="center" visible={visible} onClose={handleClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>{isEdit ? 'Editar usuario' : 'Crear usuario'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit(submitWithPhoto)}>
        <CModalBody>
          <div className="d-flex align-items-center gap-3 mb-3">
            <CAvatar
              size="xl"
              src={photoDataUrl || undefined}
              color={photoDataUrl ? undefined : 'primary'}
              textColor="white"
            >
              {!photoDataUrl && (initialValues?.username || 'U').slice(0, 1).toUpperCase()}
            </CAvatar>
            <div className="flex-grow-1">
              <CFormLabel>Foto del usuario</CFormLabel>
              <CFormInput type="file" accept="image/*" onChange={handlePhotoChange} />
              <div className="text-body-secondary small mt-1">JPG, PNG o WEBP. Máximo 250 KB.</div>
              {photoError && <div className="text-danger small mt-1">{photoError}</div>}
              {photoDataUrl && (
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setPhotoDataUrl('')}
                >
                  Quitar foto
                </CButton>
              )}
            </div>
          </div>

          <div className="mb-3">
            <CFormLabel>Username</CFormLabel>
            <CFormInput {...register('username')} required />
          </div>
          <div className="mb-3">
            <CFormLabel>Email</CFormLabel>
            <CFormInput type="email" {...register('email')} required />
          </div>
          {!isEdit && (
            <div className="mb-3">
              <CFormLabel>Contraseña</CFormLabel>
              <CFormInput type="password" {...register('password')} required minLength={6} />
            </div>
          )}
          <div className="mb-3">
            <CFormLabel>Nombre</CFormLabel>
            <CFormInput {...register('firstName')} />
          </div>
          <div className="mb-3">
            <CFormLabel>Apellido</CFormLabel>
            <CFormInput {...register('lastName')} />
          </div>
          <div className="mb-3">
            <CFormLabel>Teléfono</CFormLabel>
            <CFormInput {...register('phone')} />
          </div>
          <div className="mb-3">
            <CFormLabel>Rol</CFormLabel>
            <CFormSelect {...register('roleId')} required>
              <option value="">Seleccione...</option>
              {roles.map((role) => (
                <option key={role.RoleId} value={String(role.RoleId)}>
                  {role.RoleName}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="d-flex gap-3">
            <CFormSwitch
              className="boolean-switch-field"
              label="Activo"
              {...register('isActive')}
            />
            <CFormSwitch
              className="boolean-switch-field"
              label="2FA"
              {...register('twoFactorEnabled')}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting || !!photoError}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default UserFormModal
