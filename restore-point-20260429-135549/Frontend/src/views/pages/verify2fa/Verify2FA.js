import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { CButton, CCard, CCardBody, CCol, CContainer, CForm, CFormInput, CRow } from '@coreui/react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
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
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  const schema = yup.object({
    code: yup.string().required('Ingresa el código').matches(/^\d{6}$/, 'Código de 6 dígitos'),
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
      dispatch(setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user }))
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
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <CCard className="p-4">
              <CCardBody>
                <CForm onSubmit={handleSubmit(onSubmit)}>
                  <h1>Verificación 2FA</h1>
                  <p className="text-body-secondary">Ingresa el código enviado a tu correo. ({mm}:{ss})</p>
                  <CFormInput
                    placeholder="Código 6 dígitos"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    invalid={!!errors.code}
                    {...register('code')}
                  />
                  {errors.code && <div className="text-danger mt-2">{errors.code.message}</div>}
                  <div className="d-grid mt-3">
                    <CButton type="submit" color="primary" disabled={submitting || secondsLeft === 0}>
                      {submitting ? 'Verificando...' : 'Verificar'}
                    </CButton>
                  </div>
                  <div className="mt-3 text-center">
                    <CButton color="link" onClick={() => navigate('/login')} className="px-0">
                      Volver al login
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

export default Verify2FA
