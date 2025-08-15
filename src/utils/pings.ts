import { Ping, PingReply } from '../types'

/**
 * Get all completed pings for a specific player
 */
const getCompletedPingsForPlayer = (pings: Ping[], playerKey: number) => {
  return pings.filter(ping => 
    ping.playerKey === playerKey && 
    ping.bounced !== undefined && 
    ping.received !== undefined
  )
}

/**
 * Get the average ping time for a specific player
 * Returns null if no completed pings exist
 */
export const calculateAveragePing = (pings: Ping[], playerKey: number): number | null => {
  const completedPings = getCompletedPingsForPlayer(pings, playerKey)
  
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
export const calculateLatestPing = (pings: Ping[], playerKey: number): number | null => {
  const completedPings = getCompletedPingsForPlayer(pings, playerKey)
  
  if (completedPings.length === 0) {
    return null
  }
  
  // Find the ping with the most recent 'sent' time
  const latestPingData = completedPings.reduce((latest, current) => {
    return current.sent > latest.sent ? current : latest
  })
  
  return Math.round(latestPingData.received! - latestPingData.sent)
}


// If a number is passed, we just sent a ping to that player.
// If a PingReply is passed, we received a pong from that player
export function IncorporatePing(currentPings: Ping[], pingEvent: number | PingReply): Ping[] {

    // If there is no existing data, make an empty array
    if(!currentPings) {currentPings = []}

    const isNewPing = typeof pingEvent === "number";

    // If any playerKey is missing, quit
    const playerKey = isNewPing ? pingEvent : pingEvent.playerKey;
    if(!playerKey) return currentPings

    // All this players pings (answered and unanswered)
    const playerPings = currentPings.filter(ping => ping.playerKey === playerKey);


    // A ping was just sent to another player
    // Record the player key and send time
    // Remove existing unanswered pings (i.e. when received is undefined)
    if(isNewPing) {
        const answeredPings = playerPings.filter(ping => ping.received);
        const newEntry = { playerKey: playerKey, sent: Date.now() };
        answeredPings.push(newEntry);
        return answeredPings;
    }


    // From here: A ping has come back to us

    // Look for the unanswered ping that this is a reply to
    // If we can't find it, this new data is unusable
    if(!playerPings) { return currentPings }
    const hangingPing = playerPings.find(ping => !ping.received && ping.sent === pingEvent.sent);
    if(!hangingPing) { return currentPings }

    hangingPing.bounced  = pingEvent.bounced;
    hangingPing.received = Date.now();
    const roundTrip = Math.max(0, Math.min(2000, hangingPing.received - hangingPing.sent));
    const returnTrip = Math.max(0, Math.min(2000, hangingPing.received - hangingPing.bounced));
    const skew = returnTrip / roundTrip;
    hangingPing.skew = Math.round(skew * 1000) / 10; // Round to 1 decimal place

    // Drop oldest complete pings if we have more than 10
    const completePings = playerPings.filter(ping => ping.bounced);
    if (completePings.length > 10) {
        const pingsToRemove = completePings.slice(0, completePings.length - 10);
        currentPings = currentPings.filter(ping => !pingsToRemove.includes(ping));
    }

    return currentPings
}
