import React from "react"

import Scoreboard from "./Scoreboard"
import PlayField from "./PlayField";

function BoardScreen(props) {
    if(props.boardData.active === false) return null;

    return (
        <div className="BoardLayer">
            <div className='Header'>
                <Scoreboard boardData={props.boardData} competitors={props.competitors} myData={props.myData} setMyData={props.setMyData}/>
            </div>
            <PlayField boardData={props.boardData} myData={props.myData} BroadcastUpdates={props.BroadcastUpdates} />
        </div>

    )
}

export default BoardScreen