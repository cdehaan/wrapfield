export type Board = {
    key: number | null,
    code: string | null,
    cells: Cell[][] | null,
    width: number,
    height: number,
    mines: number,
    hint: boolean,
    safe: boolean,
    private: boolean,
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


export type BoardRequest = {
    board: Board
    player: {
        name: string,
        playerKey: number,
        playerSecret: string,
        peerId: string
    }
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
    peerId: string | null,
    peer: any | null,
    conn: any | null,
    activeConn: boolean,
    secret?: string | null,
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