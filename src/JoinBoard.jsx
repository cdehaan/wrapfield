import React, { useEffect, useState } from 'react';
import './index.css';
import GetCookie from './GetCookie';
import SendData from './SendData';

import WelcomeField from './WelcomeField';

function JoinBoard({ active, myData, setMyData, setBoardData, setCompetitors}) {
    const [height, setHeight] = useState(null);
    const [width,  setWidth] = useState(null);
    const [boardCode, setBoardCode] = useState(GetCookie("code") || new URLSearchParams(window.location.search).get('code') || "");
    function HandleCodeChange(value) {
        value = value.replace(/[^0-9A-Za-z]+/gi,"");
        setBoardCode(value);
    }

    async function JoinNewGame() {
        if(myData.peerId === null) {
            setTimeout(() => {
                JoinNewGame();
                console.log("Please come again");
            }, 500);
            return;
        }
    
        const joinBoardData = {};
    
        joinBoardData.board = {
            code: boardCode
        }
    
        joinBoardData.player = {
            name: myData.name,
            playerKey: GetCookie("playerKey"),
            playerSecret: GetCookie("playerSecret"),
            peerId: myData.peerId
        }
    
        const joinBoardResponse = JSON.parse(await SendData("JoinBoard.php", joinBoardData));
        if(joinBoardResponse.error) {
            alert(joinBoardResponse.error);
            return;
        }
        joinBoardResponse.board.cells = JSON.parse(joinBoardResponse.board.cells)
        joinBoardResponse.board.active = true
        console.log(joinBoardResponse)
    
        setBoardData(joinBoardResponse.board);
    
        setMyData(existingPlayerData => { return {...existingPlayerData, ...joinBoardResponse.player}; });

        // Exclude myself from the list of competitors
        const newCompetitors = joinBoardResponse.players.filter(player => player.playerKey !== joinBoardResponse.player.playerKey);
        newCompetitors.forEach(competitor => {
            competitor.activeConn = false;
            competitor.conn = myData.peer.connect(competitor.peerId);
        });
        setCompetitors(newCompetitors);

    
        let cookieDate = new Date();
        cookieDate.setMonth(cookieDate.getMonth()+1);
        if(joinBoardResponse.player.playerKey) { document.cookie = `playerKey=${joinBoardResponse.player.playerKey}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
        if(joinBoardResponse.player.secret)    { document.cookie = `playerSecret=${joinBoardResponse.player.secret}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
    }

    useEffect(() => {
        setHeight(document.getElementById("JoinGame").getBoundingClientRect().height);
        setWidth(document.getElementById("JoinGame").getBoundingClientRect().width);
    }, []);

    return (
        <div className={`WelcomeCard ${active === false ? "" : "Shrunk"}`} id="JoinGame" style={{height: (active === false ? height : 0), width: (active === false ? width : 0)}}>
            <span className='WelcomeHeader'>Join Game</span>
            <div className='WelcomeFields'>
                <WelcomeField id="JoinGameBoardCode" text="Game code" maxLength={10}  value={boardCode} UpdateFunction={HandleCodeChange}/>
            </div>
            <div className='WelcomeButton' onClick={JoinNewGame}>Join!</div>
        </div>
    );
  }
  
  export default JoinBoard;
  