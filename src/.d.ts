export type Board = {
    cells: Cell[][] | null,
    hint: boolean,
    key: number | null,
    safe: boolean,
    secret?: string,
    wrapfield: boolean,
    start?: Date | null,
    end?: Date | null,
    active: boolean,
    stale: boolean
}

export type Cell = {
    x: number,
    y: number,
    owner: number[],
    state: string,
    neighbours: number, // How many mines around this cell
    scored: boolean
}

export type JoinRequest = {
    board: {
        code:string
    }
    player: {
        name: string,
        playerKey: number,
        playerSecret: string,
        peerId: string
    }
}

export type Player = {
    name: string | null,
    playerKey: number | null,
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