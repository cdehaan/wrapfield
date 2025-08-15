import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Ping, PingReply } from '../types'
import { IncorporatePing } from '../utils/pings'

interface TimingState {
  pings: Ping[]
}

const initialState: TimingState = {
  pings: []
}

const timingSlice = createSlice({
  name: 'timing',
  initialState,
  reducers: {
    addNewPing: (state, action: PayloadAction<number>) => {
      // When we send a new ping to a player
      state.pings = IncorporatePing(state.pings, action.payload)
    },
    addPingReply: (state, action: PayloadAction<PingReply>) => {
      // When we receive a ping reply from a player
      state.pings = IncorporatePing(state.pings, action.payload)
    },
    clearPings: (state) => {
      state.pings = []
    }
  }
})

export const { addNewPing, addPingReply, clearPings } = timingSlice.actions
export default timingSlice.reducer