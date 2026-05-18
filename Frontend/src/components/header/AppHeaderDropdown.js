import React, { useState } from 'react'
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
import { cilAccountLogout, cilLockLocked, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { clearSession } from 'src/store/authSlice'
import { logout } from 'src/services/authService'
import { useToast } from 'src/components/ToastProvider'
import PasswordChangeModal from 'src/views/profile/PasswordChangeModal'

const AppHeaderDropdown = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const refreshToken = useSelector((s) => s.auth.refreshToken)
  const toast = useToast()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    'Usuario'

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
    <>
      <CDropdown variant="nav-item">
        <CDropdownToggle
          placement="bottom-end"
          className="py-0 pe-0 d-flex align-items-center"
          caret={false}
        >
          <span className="d-none d-md-inline me-2">{displayName}</span>
          <CAvatar
            src={user?.photoDataUrl || undefined}
            size="md"
            color={user?.photoDataUrl ? undefined : 'light'}
            textColor={user?.photoDataUrl ? undefined : 'muted'}
          >
            {!user?.photoDataUrl && <CIcon icon={cilUser} className="user-avatar-fallback-icon" />}
          </CAvatar>
        </CDropdownToggle>
        <CDropdownMenu className="pt-0" placement="bottom-end">
          <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Cuenta</CDropdownHeader>
          <CDropdownItem disabled className="align-items-start">
            <CIcon icon={cilUser} className="me-2 mt-1" />
            <div className="d-flex flex-column">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <span>{displayName}</span>
                {user?.role && <CBadge color="secondary">{user.role}</CBadge>}
              </div>
              {user?.username && displayName !== user.username && (
                <div className="text-body-secondary small">{user.username}</div>
              )}
              {user?.email && <div className="text-body-secondary small">{user.email}</div>}
            </div>
          </CDropdownItem>
          <CDropdownDivider />
          <CDropdownItem as="button" type="button" onClick={() => navigate('/profile')}>
            <CIcon icon={cilUser} className="me-2" />
            Mis datos personales
          </CDropdownItem>
          <CDropdownItem as="button" type="button" onClick={() => setPasswordModalOpen(true)}>
            <CIcon icon={cilLockLocked} className="me-2" />
            Cambiar contraseña
          </CDropdownItem>
          <CDropdownDivider />
          <CDropdownItem as="button" type="button" onClick={doLogout}>
            <CIcon icon={cilAccountLogout} className="me-2" />
            Salir
          </CDropdownItem>
        </CDropdownMenu>
      </CDropdown>

      <PasswordChangeModal
        visible={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  )
}

export default AppHeaderDropdown
