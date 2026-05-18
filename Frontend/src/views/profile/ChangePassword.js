import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAvatar, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked } from '@coreui/icons'
import PasswordChangeModal from './PasswordChangeModal'

const ChangePassword = () => {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setModalOpen(true), 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <CIcon icon={cilLockLocked} className="me-2" />
            <span className="fw-semibold">Seguridad de la cuenta</span>
          </div>
          <CButton color="primary" variant="outline" onClick={() => setModalOpen(true)}>
            <CIcon icon={cilLockLocked} className="me-1" />
            Cambiar contraseña
          </CButton>
        </CCardHeader>
        <CCardBody>
          <div className="profile-summary-card">
            <CAvatar size="xl" color="primary" textColor="white">
              <CIcon icon={cilLockLocked} />
            </CAvatar>
            <div>
              <div className="fw-semibold fs-5">Contraseña de acceso</div>
              <div className="text-body-secondary">
                Actualiza tu contraseña desde una ventana segura.
              </div>
              <div className="small text-body-secondary mt-1">
                Debes ingresar tu contraseña actual para confirmar el cambio.
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <PasswordChangeModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => navigate('/profile')}
      />
    </>
  )
}

export default ChangePassword
