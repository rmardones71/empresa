import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CButton, CForm, CFormInput, CInputGroup, CInputGroupText } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked } from '@coreui/icons'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import AuthSplitLayout from 'src/components/AuthSplitLayout'
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
    <AuthSplitLayout>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <h1 className="mb-2" style={{ color: '#071b63', fontSize: 26, fontWeight: 600 }}>
          Cambiar contraseña
        </h1>
        <p className="mb-4" style={{ color: '#64748b' }}>
          {user?.tempPassword ? 'Debes cambiar tu contraseña temporal.' : 'Actualiza tu contraseña.'}
        </p>

        <CInputGroup className="mb-3">
          <CInputGroupText style={{ background: '#fff', color: '#49627f' }}>
            <CIcon icon={cilLockLocked} />
          </CInputGroupText>
          <CFormInput
            type="password"
            placeholder="Nueva contraseña"
            autoComplete="new-password"
            invalid={!!errors.newPassword}
            style={{ minHeight: 56 }}
            {...register('newPassword')}
          />
        </CInputGroup>
        {errors.newPassword && <div className="text-danger mb-2">{errors.newPassword.message}</div>}

        <CInputGroup className="mb-4">
          <CInputGroupText style={{ background: '#fff', color: '#49627f' }}>
            <CIcon icon={cilLockLocked} />
          </CInputGroupText>
          <CFormInput
            type="password"
            placeholder="Confirmar contraseña"
            autoComplete="new-password"
            invalid={!!errors.confirm}
            style={{ minHeight: 56 }}
            {...register('confirm')}
          />
        </CInputGroup>
        {errors.confirm && <div className="text-danger mb-2">{errors.confirm.message}</div>}

        <CButton
          className="w-100 border-0"
          type="submit"
          disabled={submitting}
          style={{
            minHeight: 56,
            borderRadius: 28,
            background: '#07136d',
            fontWeight: 700,
            boxShadow: '0 14px 28px rgba(7, 19, 109, 0.2)',
          }}
        >
          {submitting ? 'Guardando...' : 'Guardar'}
        </CButton>
      </CForm>
    </AuthSplitLayout>
  )
}

export default ResetPassword

