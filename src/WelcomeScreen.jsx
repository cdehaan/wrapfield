import React from "react";

import Scoreboard from "./Scoreboard";
import CreateBoard from "./CreateBoard";
import JoinBoard from "./JoinBoard";

function WelcomeScreen(props) {
    if(props.boardData.active === true) return null;

    return(
        <>
          <div className="Welcome">
            <div className='title'>
              <span className='title'>Wrapfield</span>
              <span className='subtitle'>Realtime Multiplayer Minesweeper</span>
            </div>
            <div className='logo'></div>
            <div className='Header'>
                <Scoreboard boardData={props.boardData} competitors={props.competitors} myData={props.myData} setMyData={props.setMyData}/>
            </div>
            <CreateBoard active={props.boardData.active} myData={props.myData} setBoardData={props.setBoardData} setMyData={props.setMyData} />
            <JoinBoard   active={props.boardData.active} myData={props.myData} setBoardData={props.setBoardData} setMyData={props.setMyData} setCompetitors={props.setCompetitors} />
            <span className='footer'>By Chris DeHaan</span>
          </div>
        </>
      )
}

export default WelcomeScreen;