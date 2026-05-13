import api from './api'

export async function login({ login, password }) {
  const res = await api.post('/api/auth/login', { login, password })
  return res.data
}

export async function verify2fa({ userId, code }) {
  const res = await api.post('/api/auth/verify-2fa', { userId, code })
  return res.data
}

export async function forgotPassword({ email }) {
  const res = await api.post('/api/auth/forgot-password', { email })
  return res.data
}

export async function resetPassword({ newPassword }) {
  const res = await api.post('/api/auth/reset-password', { newPassword })
  return res.data
}

export async function changePassword({ currentPassword, newPassword }) {
  const res = await api.post('/api/auth/change-password', { currentPassword, newPassword })
  return res.data
}

export async function logout({ refreshToken }) {
  const res = await api.post('/api/auth/logout', { refreshToken })
  return res.data
}

