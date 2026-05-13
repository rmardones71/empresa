import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CButton, CCard, CCardBody, CCol, CContainer, CForm, CFormInput, CRow } from '@coreui/react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { resetPassword } from 'src/services/authService'
import { useToast } from 'src/components/ToastProvider'

const ResetPassword = () => {
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const accessToken = useSelector((s) => s.auth.accessToken)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!accessToken) navigate('/login', { replace: true })
  }, [accessToken, navigate])

  const schema = yup.object({
    newPassword: yup.string().required('Ingresa nueva contraseña').min(6, 'Mínimo 6 caracteres'),
    confirm: yup
      .string()
      .required('Confirma la contraseña')
      .oneOf([yup.ref('newPassword')], 'No coincide'),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = async ({ newPassword }) => {
    setSubmitting(true)
    try {
      await resetPassword({ newPassword })
      toast.success('Contraseña actualizada')
      navigate('/dashboard')
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <CCard className="p-4">
              <CCardBody>
                <CForm onSubmit={handleSubmit(onSubmit)}>
                  <h1>Cambiar contraseña</h1>
                  <p className="text-body-secondary">
                    {user?.tempPassword ? 'Debes cambiar tu contraseña temporal.' : 'Actualiza tu contraseña.'}
                  </p>
                  <CFormInput
                    type="password"
                    placeholder="Nueva contraseña"
                    invalid={!!errors.newPassword}
                    {...register('newPassword')}
                  />
                  {errors.newPassword && <div className="text-danger mt-2">{errors.newPassword.message}</div>}
                  <CFormInput
                    className="mt-3"
                    type="password"
                    placeholder="Confirmar contraseña"
                    invalid={!!errors.confirm}
                    {...register('confirm')}
                  />
                  {errors.confirm && <div className="text-danger mt-2">{errors.confirm.message}</div>}
                  <div className="d-grid mt-3">
                    <CButton type="submit" color="primary" disabled={submitting}>
                      {submitting ? 'Guardando...' : 'Guardar'}
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default ResetPassword
