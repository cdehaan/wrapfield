export type Board = {
    key: number | null,
    code: string | null,
    cells: Cell[][] | null,
    width: number,
    height: number,
    mines: number,
    hint: boolean,
    safe: null | { y: number, x: number },
    private: boolean,
    secret?: string,
    wrapfield: boolean,
    start?: Date | null,
    end?: Date | null,
    active: boolean,
    stale: boolean
}

export const InitialBoard: Board = {
    key: null,
    code: null,
    cells: null,
    width: 10,
    height: 10,
    mines: 15,
    hint: true,
    safe: null,
    private: false,
    wrapfield: false,
    active: false,
    stale: false
};

export type BoardRequest = {
    width: number,
    height: number,
    mines: number,
    hint: boolean,
    safe: boolean,
    private: boolean,
    wrapfield: boolean,
    peerId: string,
    name: string,
    playerKey: number | null, // Will be null for new players
    secret: string | null,    // Will be null for new players
}

export type Cell = {
    x: number,
    y: number,
    owner: number[],
    state: string,
    neighbours: number, // How many mines around this cell
    scored: boolean | null, // null means no one has done anything to this cell
}

export type CellUpdate = {
    x: number,
    y: number,
    owner: number,
    state: string,
    scored: boolean | null,
}

export type JoinRequest = {
    board: {
        code:string
    }
    player: Player
}

export type Player = {
    name: string | null,
    playerKey: number | null,
    peerId: string | null,
    peer: any | null,
    conn: any | null,
    activeConn: boolean,
    secret?: string | null,
    active: boolean,
    requestBoard?: boolean,
}

export const InitialPlayer: Player = {
    name: "Anonymous",
    playerKey: null,
    peerId: null,
    peer: null,
    conn: null,
    activeConn: false,
    active: false,
};

export type Heartbeat = {
    stage:number,
    playerKey:number,
    sent?: number,
    bounced?: number,
    received?: number,
}

export type Message = null | string | {
    competitor?:Player,
    updates?: any,
    board?: Board,
    requestBoard?: boolean,
    heartbeat: Heartbeat,
    event: {type: string}
}

// {playerKey: 1, sent: time, bounced: time, ping: time, skew: percent}
// A ping that has been sent but not answered will only have playerKey and sent
export type Ping = {
    playerKey: number,
    sent: number,
    bounced?: number,
    received?: number,
    skew?: number,
}

export type PingReply = {
    playerKey: number,
    sent: number,
    bounced: number,
}