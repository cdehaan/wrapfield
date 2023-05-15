export type Board = {
    cells: any,
    hint: boolean,
    key?: number,
    safe: boolean,
    secret?: string,
    wrapfield: boolean,
    start?: Date | null,
    end?: Date | null,
    active: boolean,
    stale: boolean
}

export type Player = {
    name?: string,
    playerKey?: number,
    peerId?: string,
    peer?: any,
    conn?: any,
    activeConn?: boolean,
    secret?: string,
    active: boolean,
    requestBoard?: boolean
}

export type Heartbeat = {
    stage:number,
    playerKey:number,
    sent?: Date,
    bounced?: Date,
    received?: Date
}

export type Message = null | string | {
    competitor?:Player,
    updates?: any,
    board?: Board,
    heartbeat: Heartbeat,
    event: {type: string}
}