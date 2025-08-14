import React from "react"
import type {Board, Player} from './types.ts'

import Scoreboard from "./Scoreboard"
import PlayField from "./PlayField";

function BoardScreen(props: { boardData: Board; competitors: Player[]; myData: Player; setMyData: React.Dispatch<React.SetStateAction<Player>>; HandleUpdates: (data: any) => void; }) {
    if(props.boardData.active === false) return null;

    return (
        <div className="BoardLayer">
            <Scoreboard boardData={props.boardData} competitors={props.competitors} myData={props.myData} setMyData={props.setMyData}/>
            <PlayField  boardData={props.boardData} competitors={props.competitors} myData={props.myData} HandleUpdates={props.HandleUpdates} />
        </div>
    )
}

export default BoardScreen