import React, { useEffect, useRef } from 'react'
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
import { scheduleFocusFirstField, handleEnterToNextField } from 'src/utils/formNavigation'

const RoleFormModal = ({ visible, onClose, onSubmit, submitting, initialValues }) => {
  const formRef = useRef(null)
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

  useEffect(() => {
    if (!visible) return undefined
    return scheduleFocusFirstField(() => formRef.current)
  }, [visible, initialValues])

  const isEdit = !!initialValues?.roleId

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>{isEdit ? 'Editar rol' : 'Nuevo rol'}</CModalTitle>
      </CModalHeader>
      <CForm
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        onKeyDownCapture={(event) => handleEnterToNextField(event, formRef.current)}
      >
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Nombre del rol</CFormLabel>
            <CFormInput
              placeholder="Ej: Admin, Ventas, Supervisor"
              {...register('roleName')}
              required
            />
            <div className="small text-body-secondary mt-1">
              Define el perfil de permisos asociado a este rol.
            </div>
          </div>

          <div className="d-flex gap-3 align-items-center">
            <CFormSwitch
              className="boolean-switch-field"
              label="Activo"
              {...register('isActive')}
            />
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
