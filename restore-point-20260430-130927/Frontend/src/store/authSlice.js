import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'crm_oportunidades_auth'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    )
  } catch {
    // ignore
  }
}

const persisted = typeof window !== 'undefined' ? loadState() : null

const initialState = {
  accessToken: persisted?.accessToken || null,
  refreshToken: persisted?.refreshToken || null,
  user: persisted?.user || null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.user = action.payload.user
      saveState(state)
    },
    setAccessToken: (state, action) => {
      state.accessToken = action.payload
      saveState(state)
    },
    clearSession: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    },
  },
})

export const { setSession, setAccessToken, clearSession } = authSlice.actions
export default authSlice.reducer

