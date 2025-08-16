import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ConnectionHistory, HangingPing, PingReply } from '../types'
import { IncorporateIngressPing, SaveEgressPing } from '../utils/pings'

interface TimingState {
  connectionHistory: ConnectionHistory,
  queuedReplies: HangingPing[],
}

const initialState: TimingState = {
  connectionHistory: [],
  queuedReplies: [],
}

interface NewPingPayload {
  playerKey: number;
  sent: number;
}

const timingSlice = createSlice({
  name: 'timing',
  initialState,
  reducers: {

    // When we send a new ping to a player
    addNewPing: (state, action: PayloadAction<NewPingPayload>) => {
      state.connectionHistory = SaveEgressPing(state.connectionHistory, action.payload)
    },

    // When we receive a ping reply from a player
    addPingReply: (state, action: PayloadAction<PingReply>) => {
      const originalHistory = state.connectionHistory;
      const updatedHistory = IncorporateIngressPing(state.connectionHistory, action.payload);
      
      if (updatedHistory === originalHistory) {
        // No matching ping found - create hanging ping with current received time
        const hangingPing: HangingPing = {
          playerKey: action.payload.playerKey,
          sent: action.payload.sent,
          bounced: action.payload.bounced,
          received: Date.now()
        };
        state.queuedReplies.push(hangingPing);
        console.log("Ping reply queued - no matching sent ping found yet");
      } else {
        // Successfully incorporated
        state.connectionHistory = updatedHistory;
      }
    },

    // Process all queued replies and remove any that can now be matched
    processPingQueue: (state) => {
      const remainingQueue: HangingPing[] = [];
      
      for (const hangingPing of state.queuedReplies) {
        // Try to find matching ping in current connection history
        const playerConnection = state.connectionHistory.find(conn => conn.playerKey === hangingPing.playerKey);
        const matchingPing = playerConnection?.pings.find(ping => 
          !ping.received && ping.sent === hangingPing.sent
        );
        
        if (matchingPing) {
          // Found matching ping - incorporate the hanging ping data
          matchingPing.bounced = hangingPing.bounced;
          matchingPing.received = hangingPing.received; // Use the originally recorded time
          
          // Calculate timing metrics
          const roundTrip = Math.max(0, Math.min(2000, matchingPing.received - matchingPing.sent));
          const returnTrip = Math.max(0, Math.min(2000, matchingPing.received - matchingPing.bounced));
          const skew = returnTrip / roundTrip;
          matchingPing.skew = Math.round(skew * 1000) / 10; // Round to 1 decimal place
          
          console.log("Processed queued ping reply for player:", hangingPing.playerKey);
        } else {
          // Still no match - keep in queue
          remainingQueue.push(hangingPing);
        }
      }
      
      state.queuedReplies = remainingQueue;
      const remainingCount = remainingQueue.length;
      const processedCount = state.queuedReplies.length - remainingCount;
      if (processedCount > 0 || remainingCount > 0) {
        console.log(`Processed ping queue. ${processedCount} items processed, ${remainingCount} remaining`);
      }
    },


    // Clear all ping data (not used)
    clearPings: (state) => {
      state.connectionHistory = [];
      state.queuedReplies = [];
    }
  }
})

export const { addNewPing, addPingReply, processPingQueue, clearPings } = timingSlice.actions
export default timingSlice.reducer