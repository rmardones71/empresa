import React from 'react'
import { CAlert, CButton } from '@coreui/react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Let devs see the real component stack in console for faster debugging.
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary caught error:', error)
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary componentStack:', info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="p-4">
        <CAlert color="danger">
          La página tuvo un error y no se pudo renderizar. Esto normalmente ocurre si el backend está
          apagado o hay un problema de dependencias.
          {this.state.error?.message && (
            <>
              <hr />
              <div className="fw-semibold">Detalle:</div>
              <div>{this.state.error.message}</div>
            </>
          )}
        </CAlert>
        <div className="d-flex gap-2">
          <CButton color="primary" onClick={() => window.location.reload()}>
            Recargar
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => (window.location.hash = '#/dashboard')}>
            Ir al Dashboard
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => (window.location.hash = '#/login')}>
            Ir al Login
          </CButton>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
