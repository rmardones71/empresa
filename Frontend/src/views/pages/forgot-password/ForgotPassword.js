import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CButton, CForm, CFormInput, CInputGroup, CInputGroupText } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeClosed } from '@coreui/icons'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import AuthSplitLayout from 'src/components/AuthSplitLayout'
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
    <AuthSplitLayout>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <h1 className="mb-2" style={{ color: '#071b63', fontSize: 26, fontWeight: 600 }}>
          Recuperar contraseña
        </h1>
        <p className="mb-4" style={{ color: '#64748b' }}>
          Recibirás una contraseña temporal por correo.
        </p>

        <CInputGroup className="mb-3">
          <CInputGroupText style={{ background: '#fff', color: '#49627f' }}>
            <CIcon icon={cilEnvelopeClosed} />
          </CInputGroupText>
          <CFormInput
            placeholder="Email"
            autoComplete="email"
            invalid={!!errors.email}
            style={{ minHeight: 56 }}
            {...register('email')}
          />
        </CInputGroup>
        {errors.email && <div className="text-danger mb-2">{errors.email.message}</div>}

        <CButton
          className="w-100 border-0 mb-3"
          type="submit"
          disabled={submitting}
          style={{
            minHeight: 56,
            borderRadius: 28,
            background: '#07136d',
            color: '#ffffff',
            fontWeight: 700,
            boxShadow: '0 14px 28px rgba(7, 19, 109, 0.2)',
          }}
        >
          {submitting ? 'Enviando...' : 'Enviar'}
        </CButton>

        <div className="text-center">
          <Link to="/login" className="text-decoration-none" style={{ color: '#20466f', fontSize: 14 }}>
            Volver al login
          </Link>
        </div>
      </CForm>
    </AuthSplitLayout>
  )
}

export default ForgotPassword
