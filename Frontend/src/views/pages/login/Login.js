import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { CButton, CForm, CFormInput, CInputGroup, CInputGroupText } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import AuthSplitLayout from 'src/components/AuthSplitLayout'
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
    <AuthSplitLayout>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <h1 className="mb-2" style={{ color: '#071b63', fontSize: 26, fontWeight: 600 }}>
          Bienvenido a UCM
        </h1>
        <p className="mb-4" style={{ color: '#64748b' }}>
          Ingresa tus credenciales para continuar.
        </p>

        <CInputGroup className="mb-3">
          <CInputGroupText style={{ background: '#fff', color: '#49627f' }}>
            <CIcon icon={cilUser} />
          </CInputGroupText>
          <CFormInput
            placeholder="Username o Email"
            autoComplete="username"
            invalid={!!errors.login}
            style={{ minHeight: 56 }}
            {...register('login')}
          />
        </CInputGroup>
        {errors.login && <div className="text-danger mb-2">{errors.login.message}</div>}

        <CInputGroup className="mb-4">
          <CInputGroupText style={{ background: '#fff', color: '#49627f' }}>
            <CIcon icon={cilLockLocked} />
          </CInputGroupText>
          <CFormInput
            type="password"
            placeholder="Contraseña"
            autoComplete="current-password"
            invalid={!!errors.password}
            style={{ minHeight: 56 }}
            {...register('password')}
          />
        </CInputGroup>
        {errors.password && <div className="text-danger mb-2">{errors.password.message}</div>}

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
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </CButton>

        <div className="text-center">
          <Link to="/forgot-password" className="text-decoration-none" style={{ color: '#20466f', fontSize: 14 }}>
            Olvidé mi contraseña
          </Link>
        </div>
      </CForm>
    </AuthSplitLayout>
  )
}

export default Login
