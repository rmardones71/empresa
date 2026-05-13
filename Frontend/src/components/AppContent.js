/**
 * AppContent Component
 *
 * Main content area that renders routes defined in routes.js.
 * Handles lazy loading with Suspense and provides a loading spinner
 * while components are being loaded.
 *
 * Features:
 * - Dynamic route rendering from routes configuration
 * - Suspense boundary for lazy-loaded components
 * - Automatic redirect from root to dashboard
 * - Loading spinner fallback during component load
 *
 * @component
 * @example
 * return (
 *   <AppContent />
 * )
 */

import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CAlert, CContainer, CSpinner } from '@coreui/react'
import { useSelector } from 'react-redux'
import ErrorBoundary from './ErrorBoundary'
import { hasPermission } from 'src/utils/permissions'

// routes config
import routes from '../routes'

/**
 * AppContent functional component
 *
 * Renders all application routes within a container with:
 * - Suspense for lazy-loaded route components
 * - Spinner shown during component loading
 * - Default redirect to dashboard
 *
 * Memoized to prevent unnecessary re-renders when parent updates.
 *
 * @returns {React.ReactElement} Content container with routed views
 */
const AppContent = () => {
  const user = useSelector((s) => s.auth.user)

  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            const Element = route.element
            if (!Element) return null

            // Render each route inside a boundary so we can pinpoint which route is failing.
            const wrapped = hasPermission(user, route.permissionKey, 'read') ? (
              <ErrorBoundary>
                <Element />
              </ErrorBoundary>
            ) : (
              <CAlert color="warning" className="mt-3">
                No tienes permisos para acceder a este modulo.
              </CAlert>
            )
            return (
              <Route
                key={idx}
                path={route.path}
                exact={route.exact}
                name={route.name}
                element={wrapped}
              />
            )
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
