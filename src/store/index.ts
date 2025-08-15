import { configureStore } from '@reduxjs/toolkit'
import timingReducer from './timingSlice'

export const store = configureStore({
  reducer: {
    timing: timingReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch