import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilLockLocked,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import avatar8 from './../../assets/images/avatars/8.jpg'
import { clearSession } from 'src/store/authSlice'
import { logout } from 'src/services/authService'
import { useToast } from 'src/components/ToastProvider'

const AppHeaderDropdown = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const refreshToken = useSelector((s) => s.auth.refreshToken)
  const toast = useToast()

  const doLogout = async () => {
    try {
      if (refreshToken) await logout({ refreshToken })
    } catch {
      // ignore
    } finally {
      dispatch(clearSession())
      toast.info('Sesión cerrada')
      navigate('/login')
    }
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar src={avatar8} size="md" />
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Cuenta</CDropdownHeader>
        <CDropdownItem disabled>
          <CIcon icon={cilUser} className="me-2" />
          {user?.username || 'Usuario'}
          {user?.role && (
            <CBadge color="secondary" className="ms-2">
              {user.role}
            </CBadge>
          )}
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem as="button" type="button" onClick={doLogout}>
          <CIcon icon={cilLockLocked} className="me-2" />
          Cerrar sesión
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
