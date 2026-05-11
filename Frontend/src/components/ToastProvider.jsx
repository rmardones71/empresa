import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CToast, CToastBody, CToastClose, CToastHeader, CToaster } from '@coreui/react'

const ToastContext = createContext(null)

const COLORS = {
  success: 'success',
  error: 'danger',
  info: 'info',
  warning: 'warning',
}

const LABELS = {
  success: 'Exito',
  error: 'Error',
  info: 'Info',
  warning: 'Atencion',
}

const DELAYS = {
  success: 3000,
  info: 5000,
  warning: 7000,
  error: 10000,
}

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null)

  const push = useCallback((t) => {
    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())
    setToast(
      <CToast
        visible
        autohide
        delay={DELAYS[t.kind] || 2800}
        className={`app-toast app-toast-${t.kind}`}
        key={id}
      >
        <CToastHeader closeButton={false} className="app-toast-header">
          <span className="app-toast-mark" aria-hidden="true" />
          <strong className="me-auto">{t.title || LABELS[t.kind]}</strong>
          <CToastClose className="ms-2 mb-1 app-toast-close" />
        </CToastHeader>
        <CToastBody className="app-toast-body">{t.message}</CToastBody>
      </CToast>,
    )
  }, [])

  const api = useMemo(
    () => ({
      success: (message, title = 'OK') =>
        push({ color: COLORS.success, kind: 'success', title, message }),
      error: (message, title = 'Error') =>
        push({ color: COLORS.error, kind: 'error', title, message }),
      info: (message, title = 'Info') => push({ color: COLORS.info, kind: 'info', title, message }),
      warning: (message, title = 'Atencion') =>
        push({ color: COLORS.warning, kind: 'warning', title, message }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <CToaster push={toast} placement="middle-center" className="app-toast-center" />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
