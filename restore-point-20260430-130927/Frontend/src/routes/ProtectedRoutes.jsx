import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const ProtectedRoutes = ({ children }) => {
  const accessToken = useSelector((s) => s.auth.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return children
}

export default ProtectedRoutes

