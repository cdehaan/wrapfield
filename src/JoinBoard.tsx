import React, { useEffect, useState } from 'react';
import type {Board, Player, JoinRequest} from './types.ts'
import './index.css';
import GetCookie from './GetCookie';
import SendData from './SendData';

import WelcomeField from './WelcomeField';

function JoinBoard({ active, myData, setMyData, setBoardData, setCompetitors}: {active: boolean, myData:Player, setMyData:React.Dispatch<React.SetStateAction<Player>>, setBoardData:React.Dispatch<React.SetStateAction<Board>>, setCompetitors:React.Dispatch<React.SetStateAction<Player[]>> }) {
    const [height, setHeight] = useState<number>(0);
    const [width,  setWidth] = useState<number>(0);
    const [boardCode, setBoardCode] = useState(GetCookie("code") || new URLSearchParams(window.location.search).get('code') || "");
    function HandleCodeChange(value:string) {
        value = value.replace(/[^0-9A-Za-z]+/gi,"");
        setBoardCode(value);
    }

    async function JoinNewGame() {
        if(myData.peerId === null || myData.peerId === undefined) {
            setTimeout(() => {
                JoinNewGame();
                console.log("Please come again");
            }, 500);
            return;
        }

        const playerKey    = GetCookie("playerKey")
        const playerSecret = GetCookie("playerSecret")

        const joinBoardData:JoinRequest = {
            board: {
                code: boardCode
            },
            player: {
                name: myData.name || "Anonymous",
                playerKey: playerKey === null ? null : parseInt(playerKey),
                secret: playerSecret,
                peerId: myData.peerId,
                peer: null,
                conn: null,
                activeConn: false,
                active: false,
            }
        };
    
        const joinBoardResponse = JSON.parse(await SendData("joinBoard", joinBoardData));
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
        const newCompetitors = joinBoardResponse.players.filter((player:Player) => player.playerKey !== joinBoardResponse.player.playerKey);
        newCompetitors.forEach((competitor:Player) => {
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
        const joinGameElement = document.getElementById("JoinGame")
        if(!joinGameElement) return
        setHeight(joinGameElement.getBoundingClientRect().height || 0);
        setWidth(joinGameElement.getBoundingClientRect().width || 0);
    }, []);

    return (
        <div className={`WelcomeCard ${active === false ? "" : "Shrunk"}`} id="JoinGame">
            <span className='WelcomeHeader'>Join Game</span>
            <div className='WelcomeFields'>
                <WelcomeField id="JoinGameBoardCode" text="Game code" maxLength={10}  value={boardCode} UpdateFunction={HandleCodeChange}/>
            </div>
            <div className='WelcomeButton' onClick={JoinNewGame}>Join!</div>
        </div>
    );
  }
  
  export default JoinBoard;
  