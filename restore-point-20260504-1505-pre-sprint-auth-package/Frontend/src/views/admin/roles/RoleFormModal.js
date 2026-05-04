import React, { useEffect } from 'react'
import {
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSwitch,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { useForm } from 'react-hook-form'

const RoleFormModal = ({ visible, onClose, onSubmit, submitting, initialValues }) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      roleName: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (visible) {
      reset({
        roleName: initialValues?.roleName || '',
        isActive: initialValues?.isActive ?? true,
      })
    }
  }, [visible, reset, initialValues])

  const isEdit = !!initialValues?.roleId

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>{isEdit ? 'Editar rol' : 'Nuevo rol'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Nombre del rol</CFormLabel>
            <CFormInput
              autoFocus
              placeholder="Ej: Admin, Ventas, Supervisor"
              {...register('roleName')}
              required
            />
            <div className="small text-body-secondary mt-1">
              Define el perfil de permisos asociado a este rol.
            </div>
          </div>

          <div className="d-flex gap-3 align-items-center">
            <CFormSwitch label="Activo" {...register('isActive')} />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting
              ? isEdit
                ? 'Guardando...'
                : 'Creando...'
              : isEdit
                ? 'Guardar cambios'
                : 'Crear rol'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default RoleFormModal
