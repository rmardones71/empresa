import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CToast, CToastBody, CToastClose, CToastHeader, CToaster } from '@coreui/react'

const ToastContext = createContext(null)

const COLORS = {
  success: 'success',
  error: 'danger',
  info: 'info',
  warning: 'warning',
}

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null)

  const push = useCallback((t) => {
    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())
    setToast(
      <CToast visible autohide delay={3500} color={t.color} className="text-white" key={id}>
        <CToastHeader
          closeButton={false}
          className="text-white"
          style={{ background: 'transparent' }}
        >
          <strong className="me-auto">{t.title}</strong>
          <CToastClose className="ms-2 mb-1" white />
        </CToastHeader>
        <CToastBody>{t.message}</CToastBody>
      </CToast>,
    )
  }, [])

  const api = useMemo(
    () => ({
      success: (message, title = 'OK') => push({ color: COLORS.success, title, message }),
      error: (message, title = 'Error') => push({ color: COLORS.error, title, message }),
      info: (message, title = 'Info') => push({ color: COLORS.info, title, message }),
      warning: (message, title = 'Atención') => push({ color: COLORS.warning, title, message }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <CToaster push={toast} placement="top-end" className="p-3" />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
