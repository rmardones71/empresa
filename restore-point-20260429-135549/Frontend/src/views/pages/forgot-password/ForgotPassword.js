import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCol, CContainer, CForm, CFormInput, CRow } from '@coreui/react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { forgotPassword } from 'src/services/authService'
import { useToast } from 'src/components/ToastProvider'

const ForgotPassword = () => {
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const schema = yup.object({
    email: yup.string().required('Ingresa tu email').email('Email inválido'),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = async ({ email }) => {
    setSubmitting(true)
    try {
      await forgotPassword({ email })
      toast.success('Si el email existe, enviamos una contraseña temporal.')
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo procesar la solicitud')
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
                  <h1>Recuperación</h1>
                  <p className="text-body-secondary">Recibirás una contraseña temporal por correo.</p>
                  <CFormInput placeholder="Email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
                  {errors.email && <div className="text-danger mt-2">{errors.email.message}</div>}
                  <div className="d-grid mt-3">
                    <CButton type="submit" color="primary" disabled={submitting}>
                      {submitting ? 'Enviando...' : 'Enviar'}
                    </CButton>
                  </div>
                  <div className="mt-3 text-center">
                    <Link to="/login">Volver al login</Link>
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

export default ForgotPassword
