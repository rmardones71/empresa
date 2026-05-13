import axios from 'axios'
import store from '../store'
import { setAccessToken, clearSession } from '../store/authSlice'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: apiBaseUrl,
})

// Separate client without interceptors to avoid refresh deadlocks
const refreshApi = axios.create({
  baseURL: apiBaseUrl,
})

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (status !== 401 || original?._retry) throw error

    // If refreshing itself fails with 401, don't try to refresh again
    if (original?.url?.includes('/api/auth/refresh-token')) {
      store.dispatch(clearSession())
      throw error
    }

    const refreshToken = store.getState().auth.refreshToken
    if (!refreshToken) {
      store.dispatch(clearSession())
      throw error
    }

    original._retry = true

    if (!refreshPromise) {
      refreshPromise = refreshApi
        .post('/api/auth/refresh-token', { refreshToken })
        .then((res) => {
          store.dispatch(setAccessToken(res.data.accessToken))
          return res.data.accessToken
        })
        .catch((e) => {
          store.dispatch(clearSession())
          throw e
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    const newAccessToken = await refreshPromise
    original.headers = original.headers || {}
    original.headers.Authorization = `Bearer ${newAccessToken}`
    return api.request(original)
  },
)

export default api
