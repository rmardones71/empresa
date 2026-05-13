import { configureStore } from '@reduxjs/toolkit'
import themeReducer from './store/themeSlice'
import authReducer from './store/authSlice'
import uiReducer from './store/uiSlice'

const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    ui: uiReducer,
  },
})

export default store

