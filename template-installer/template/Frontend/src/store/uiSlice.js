import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sidebarShow: true,
  sidebarUnfoldable: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarShow: (state, action) => {
      state.sidebarShow = action.payload
    },
    setSidebarUnfoldable: (state, action) => {
      state.sidebarUnfoldable = action.payload
    },
  },
})

export const { setSidebarShow, setSidebarUnfoldable } = uiSlice.actions
export default uiSlice.reducer
