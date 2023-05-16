import React from "react";
import type {Board, Player} from './.js'

import Scoreboard from "./Scoreboard";
import CreateBoard from "./CreateBoard";
import JoinBoard from "./JoinBoard";

function WelcomeScreen({ boardData, myData, competitors, setMyData, setBoardData, setCompetitors}: { boardData:Board, myData:Player, competitors:Player[], setMyData:React.Dispatch<React.SetStateAction<Player>>, setBoardData:React.Dispatch<React.SetStateAction<Board>>, setCompetitors:React.Dispatch<React.SetStateAction<Player[]>> }) {
  if(boardData.active === true) return null;

    return(
        <>
          <div className="Welcome">
            <div className='title'>
              <span className='title'>Wrapfield</span>
              <span className='subtitle'>Realtime Multiplayer Minesweeper</span>
            </div>
            <div className='logo'></div>
            <Scoreboard boardData={boardData} competitors={competitors} myData={myData} setMyData={setMyData}/>
            <CreateBoard active={boardData.active} myData={myData} setBoardData={setBoardData} setMyData={setMyData} />
            <JoinBoard   active={boardData.active} myData={myData} setBoardData={setBoardData} setMyData={setMyData} setCompetitors={setCompetitors} />
            <span className='footer'>By Chris DeHaan</span>
          </div>
        </>
      )
}

export default WelcomeScreen;