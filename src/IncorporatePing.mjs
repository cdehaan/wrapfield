// {playerKey: 1, sent: time, bounced: time, received: time, ping: time, skew: percent}

function IncorporatePing(currentPings, pingEvent) {

    // If there is no existing data, make an empty array
    if(!currentPings) {currentPings = []}

    // If any critical ping data is missing, quit
    if(!pingEvent || !pingEvent.playerKey) return currentPings

    const now = Date.now()
    const playerKey = pingEvent.playerKey
    const pingEntry = currentPings.find(entry => {return entry.playerKey === pingEvent.playerKey}) // Might be undefined

    // A ping was just sent. Recoring the send time.
    if(pingEvent.sent) {

        // First ping to this player
        if(!pingEntry) {
            const newEntry = {playerKey: playerKey, sent: pingEvent.sent}
            currentPings.push(newEntry)
            return currentPings
        }

        // Overwrite previous ping to this player
        pingEntry.sent = pingEvent.sent
        pingEntry.bounced = null
        pingEntry.received = null
        return currentPings    
    }



    // If a ping has come back to us
    if(pingEvent.bounced && pingEvent.received) {

        // If we have no existing sent time data for this player, this new time data is useless
        if(!pingEntry)      { return currentPings }
        if(!pingEntry.sent) { return currentPings }

        pingEntry.bounced  = pingEvent.bounced
        pingEntry.received = pingEvent.received
        const ping = Math.max(0, Math.min(2000, pingEntry.received - pingEntry.sent))
        const returnTrip = Math.max(0, Math.min(2000, pingEntry.received - pingEntry.bounced))
        const skew = returnTrip / ping

        // If we have no running average for ping or skew, just use the current value as the "average"
        if(!pingEntry.ping) { pingEntry.ping = ping }
        if(!pingEntry.skew) { pingEntry.skew = skew }

        // Return a running average of sorts
        pingEntry.ping = pingEntry.ping * 0.4 + ping * 0.6
        pingEntry.ping = Math.round(pingEntry.ping * 100) / 100

        pingEntry.skew = pingEntry.skew * 0.4 + skew * 0.6
        pingEntry.skew = Math.round(pingEntry.skew * 100) / 100

        return currentPings
    }

}

export default IncorporatePing