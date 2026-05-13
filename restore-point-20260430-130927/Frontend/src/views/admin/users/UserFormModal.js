import React, { useEffect } from 'react'
import {
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

const UserFormModal = ({ visible, onClose, onSubmit, roles, initialValues, submitting }) => {
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

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>{isEdit ? 'Editar usuario' : 'Crear usuario'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <CModalBody>
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
              {roles.map((r) => (
                <option key={r.RoleId} value={String(r.RoleId)}>
                  {r.RoleName}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="d-flex gap-3">
            <CFormSwitch label="Activo" {...register('isActive')} />
            <CFormSwitch label="2FA" {...register('twoFactorEnabled')} />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default UserFormModal

