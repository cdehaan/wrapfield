import { ConnectionHistory, Ping, PingReply } from '../types'

/**
 * Get all completed pings for a specific player
 */
const getCompletedPingsForPlayer = (connections: ConnectionHistory, playerKey: number) => {
  const playerConnection = connections?.find(conn => conn.playerKey === playerKey);
  if (!playerConnection) return [];

  return playerConnection.pings.filter(ping => 
    ping.bounced !== undefined && 
    ping.received !== undefined
  )
}

/**
 * Get the average ping time for a specific player
 * Returns null if no completed pings exist
 */
export const calculateAveragePing = (connections: ConnectionHistory, playerKey: number): number | null => {
  const completedPings = getCompletedPingsForPlayer(connections, playerKey)

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
export const calculateLatestPing = (connections: ConnectionHistory, playerKey: number): number | null => {
  const completedPings = getCompletedPingsForPlayer(connections, playerKey)

  if (completedPings.length === 0) {
    return null
  }

  // Find the ping with the most recent 'sent' time
  const latestPingData = completedPings.reduce((latest, current) => {
    return current.sent > latest.sent ? current : latest
  })

  return Math.round(latestPingData.received! - latestPingData.sent)
}


export function SaveEgressPing(connections: ConnectionHistory, {playerKey, sent}: {playerKey: number, sent: number}): ConnectionHistory {
  // If there is no existing data, make an empty array
  if (!connections) {
    console.log("No connection history found, creating a new one.");
    connections = [];
  }

  let playerConnection = connections.find(conn => conn.playerKey === playerKey);
  // If no connection exists for this player, create one
  if (!playerConnection) {
    console.log("No connection found for player:", playerKey, ", creating a new one.");
    playerConnection = { playerKey, totalPings: 0, droppedPings: 0, pings: [] };
    connections.push(playerConnection);
  }

  // All this players pings (answered and unanswered)
  const playerPings = playerConnection.pings;

  // Record the player key and send time
  const newEntry: Ping = { sent };
  playerPings.push(newEntry);

  // Update the connection history with the new ping
  return connections;
}

// If a number is passed, we just sent a ping (heartbeat stage 1) to that player.
// If a PingReply is passed, we received a pong (heartbeat stage 2) from that player
export function IncorporateIngressPing(connections: ConnectionHistory, pingReply: PingReply): ConnectionHistory {

    // If there is no existing data, make an empty array
    if(!connections) { connections = [] }

    // If playerKey is missing in reply, quit
    const playerKey = pingReply.playerKey;
    if(!playerKey) return connections

    let playerConnection = connections.find(conn => conn.playerKey === playerKey);
    if (!playerConnection) {
        playerConnection = { playerKey, totalPings: 0, droppedPings: 0, pings: [] };
        connections.push(playerConnection);
    }

    // All this players pings (answered and unanswered)
    const playerPings = playerConnection.pings;

    // Look for the unanswered ping that this is a reply to
    // If we can't find it, this new data is unusable
    console.log("Incorporating ping reply for player:", playerKey, "with data:", pingReply);
    console.log("All player pings:", playerPings);
    const hangingPing = playerPings.find(ping => !ping.received && ping.sent === pingReply.sent);
    if(!hangingPing) {
      console.log(`No matching hanging ping found. All player pings (${playerPings.length}):`, playerPings);
      return connections;
    }

    hangingPing.bounced  = pingReply.bounced;
    hangingPing.received = Date.now();
    const roundTrip = Math.max(0, Math.min(2000, hangingPing.received - hangingPing.sent));
    const returnTrip = Math.max(0, Math.min(2000, hangingPing.received - hangingPing.bounced));
    const skew = returnTrip / roundTrip;
    hangingPing.skew = Math.round(skew * 1000) / 10; // Round to 1 decimal place

    console.log("Updated hanging ping:", hangingPing.sent, ", total pings for this player:", playerPings.length);
    connections = connections.map(conn => {
        if (conn.playerKey === playerKey) {
            return { ...conn, pings: playerPings };
        }
        return conn;
    });

    return connections
}
