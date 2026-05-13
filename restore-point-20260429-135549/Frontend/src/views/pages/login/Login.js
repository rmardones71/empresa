import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { setSession } from 'src/store/authSlice'
import { login as loginApi } from 'src/services/authService'
import { useToast } from 'src/components/ToastProvider'

const Login = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const schema = yup.object({
    login: yup.string().required('Ingresa username o email'),
    password: yup.string().required('Ingresa contraseña'),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = async (values) => {
    setSubmitting(true)
    try {
      const data = await loginApi(values)
      if (data.requires2fa) {
        sessionStorage.setItem('crm_2fa_userId', String(data.userId))
        navigate('/verify-2fa')
        return
      }
      dispatch(setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user }))
      if (data.user?.tempPassword) {
        navigate('/reset-password')
        return
      }
      navigate('/dashboard')
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit(onSubmit)}>
                    <h1>Acceso</h1>
                    <p className="text-body-secondary">Ingresa a CRM Oportunidades</p>
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder="Username o Email"
                        autoComplete="username"
                        invalid={!!errors.login}
                        {...register('login')}
                      />
                    </CInputGroup>
                    {errors.login && <div className="text-danger mb-2">{errors.login.message}</div>}
                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Contraseña"
                        autoComplete="current-password"
                        invalid={!!errors.password}
                        {...register('password')}
                      />
                    </CInputGroup>
                    {errors.password && <div className="text-danger mb-2">{errors.password.message}</div>}
                    <CRow>
                      <CCol xs={6}>
                        <CButton color="primary" className="px-4" type="submit" disabled={submitting}>
                          {submitting ? 'Ingresando...' : 'Ingresar'}
                        </CButton>
                      </CCol>
                      <CCol xs={6} className="text-right">
                        <Link to="/forgot-password" className="btn btn-link px-0">
                          Olvidé mi contraseña
                        </Link>
                      </CCol>
                    </CRow>
                  </CForm>
                </CCardBody>
              </CCard>
              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <div>
                    <h2>Acceso empresarial</h2>
                    <p>
                      Seguridad robusta con JWT, Refresh Token y 2FA opcional por correo.
                    </p>
                    <Link to="/register">
                      <CButton color="primary" className="mt-3" active tabIndex={-1}>
                        Register Now!
                      </CButton>
                    </Link>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
