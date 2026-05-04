import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { CButton, CForm, CFormInput, CInputGroup, CInputGroupText } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilShieldAlt } from '@coreui/icons'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import AuthSplitLayout from 'src/components/AuthSplitLayout'
import { verify2fa } from 'src/services/authService'
import { setSession } from 'src/store/authSlice'
import { useToast } from 'src/components/ToastProvider'

const Verify2FA = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(5 * 60)
  const toast = useToast()

  const userId = useMemo(() => Number(sessionStorage.getItem('crm_2fa_userId') || 0), [])

  useEffect(() => {
    if (!userId) navigate('/login', { replace: true })
  }, [userId, navigate])

  useEffect(() => {
    const timer = setInterval(
      () => setSecondsLeft((seconds) => (seconds > 0 ? seconds - 1 : 0)),
      1000,
    )
    return () => clearInterval(timer)
  }, [])

  const schema = yup.object({
    code: yup
      .string()
      .required('Ingresa el código')
      .matches(/^\d{6}$/, 'Código de 6 dígitos'),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = async ({ code }) => {
    setSubmitting(true)
    try {
      const data = await verify2fa({ userId, code })
      dispatch(
        setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        }),
      )
      sessionStorage.removeItem('crm_2fa_userId')
      if (data.user?.tempPassword) {
        navigate('/reset-password')
        return
      }
      navigate('/dashboard')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Código inválido')
    } finally {
      setSubmitting(false)
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <AuthSplitLayout>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <h1 className="mb-2" style={{ color: '#071b63', fontSize: 26, fontWeight: 600 }}>
          Verificación 2FA
        </h1>
        <p className="mb-4" style={{ color: '#64748b' }}>
          Ingresa el código enviado a tu correo. Expira en {mm}:{ss}.
        </p>

        <CInputGroup className="mb-3">
          <CInputGroupText style={{ background: '#fff', color: '#49627f' }}>
            <CIcon icon={cilShieldAlt} />
          </CInputGroupText>
          <CFormInput
            placeholder="Código 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            invalid={!!errors.code}
            style={{ minHeight: 56 }}
            {...register('code')}
          />
        </CInputGroup>
        {errors.code && <div className="text-danger mb-2">{errors.code.message}</div>}

        <CButton
          className="w-100 border-0 mb-3"
          type="submit"
          disabled={submitting || secondsLeft === 0}
          style={{
            minHeight: 56,
            borderRadius: 28,
            background: '#07136d',
            color: '#ffffff',
            fontWeight: 700,
            boxShadow: '0 14px 28px rgba(7, 19, 109, 0.2)',
          }}
        >
          {submitting ? 'Verificando...' : 'Verificar'}
        </CButton>

        <div className="text-center">
          <CButton
            color="link"
            onClick={() => navigate('/login')}
            className="px-0"
            style={{ color: '#20466f' }}
          >
            Volver al login
          </CButton>
        </div>
      </CForm>
    </AuthSplitLayout>
  )
}

export default Verify2FA
