import { RootState } from './index'

/**
 * Get all completed pings for a specific player
 */
const getCompletedPingsForPlayer = (state: RootState, playerKey: number) => {
  return state.timing.pings.filter(ping => 
    ping.playerKey === playerKey && 
    ping.bounced !== undefined && 
    ping.received !== undefined
  )
}

/**
 * Get the average ping time for a specific player
 * Returns null if no completed pings exist
 */
export const averagePing = (state: RootState, playerKey: number): number | null => {
  const completedPings = getCompletedPingsForPlayer(state, playerKey)
  
  if (completedPings.length === 0) {
    return null
  }
  
  const totalPing = completedPings.reduce((sum, ping) => {
    const roundTripTime = ping.received! - ping.sent
    return sum + roundTripTime
  }, 0)
  
  return Math.round(totalPing / completedPings.length)
}

/**
 * Get the most recent ping time for a specific player
 * Returns null if no completed pings exist
 */
export const latestPing = (state: RootState, playerKey: number): number | null => {
  const completedPings = getCompletedPingsForPlayer(state, playerKey)
  
  if (completedPings.length === 0) {
    return null
  }
  
  // Find the ping with the most recent 'sent' time
  const latestPingData = completedPings.reduce((latest, current) => {
    return current.sent > latest.sent ? current : latest
  })
  
  return Math.round(latestPingData.received! - latestPingData.sent)
}