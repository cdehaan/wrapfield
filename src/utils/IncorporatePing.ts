// {playerKey: 1, sent: time, bounced: time, received: time, ping: time, skew: percent}

import { Ping, PingReply } from "../types"

// If a number is passed, we just sent a ping to that player.
// If a PingReply is passed, we received a pong from that player
function IncorporatePing(currentPings: Ping[], pingEvent: number | PingReply): Ping[] {

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

    return currentPings
}

export default IncorporatePing
