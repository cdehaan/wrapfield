import { Player, Heartbeat } from '../types';

type setupHeartbeatsParams = {
  competitors: Player[],
  myPlayerKey: number,
  dispatchNewPing: (playerKey: number, now: number) => void
}

/**
 * Sets up heartbeat intervals for all competitors
 * Returns a cleanup function to clear all intervals
 */
export function setupHeartbeats({ competitors, myPlayerKey, dispatchNewPing }: setupHeartbeatsParams): () => void {
  const heartbeatIntervals: ReturnType<typeof setInterval>[] = [];

  competitors.forEach((competitor, index) => {
    // Send a heartbeat stage 1 every 3 seconds
    const intervalId = setInterval(() => {
      setTimeout(() => {
        const now = Date.now();

        // The actual sending of the heartbeat
        competitor.conn.send({
          heartbeat: {
            stage: 1,
            playerKey: myPlayerKey,
            sent: now
          }
        });

        // Make a record of when we sent it to calculate ping later
        if(competitor.playerKey !== null) {
          dispatchNewPing(competitor.playerKey, now);
        } else {
          console.log("No player key found for competitor:", competitor, ", couldn't setup outgoing heartbeat");
        }
      }, index * 100); // Stagger the heartbeats a little
    }, 3000);

    heartbeatIntervals.push(intervalId);
  });

  // Return cleanup function
  return () => {
    heartbeatIntervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
  };
}

/**
 * Returns a heartbeat to the competitor who sent it
 * This function gets the most current competitors array as a parameter
 */
export function returnHeartbeat(competitors: Player[], myPlayerKey: number, heartbeat: Heartbeat): void {
  if (!heartbeat) { return; }

  const competitor = competitors.find(comp => comp.playerKey === heartbeat.playerKey);

  if (competitor) {
    //console.log("Returning heartbeat:", heartbeat);
    competitor.conn.send({
      heartbeat: {
        stage: 2,
        playerKey: myPlayerKey,
        sent: heartbeat.sent, // This is like an ID for the ping, so send it back
        bounced: Date.now()
      }
    });
  } else {
    console.log("Heartbeat could not be returned from player " + heartbeat.playerKey);
  }
}