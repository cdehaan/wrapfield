import React, { useState } from "react";
import type {Board, Cell, Player} from './types.ts'

import GetCookie from "./utils/GetCookie.ts";

function Scoreboard({ boardData, myData, competitors, setMyData}: { boardData:Board, myData:Player, competitors:Player[], setMyData:React.Dispatch<React.SetStateAction<Player>> }) {
    const scoreboard = [];

    const [hotUsername, setHotUsername] = useState<string>(GetCookie("playerName") || "Anonymous");
    const [nameUpdateTimeout, setNameUpdateTimeout] = useState<ReturnType<typeof setInterval> | null>(null);

    function CalculateScore(playerKey:number):number {
      if(!boardData || !boardData.cells || !playerKey) { return 0; }
      const scoredCells:Cell[] = [];
      boardData.cells.forEach(row => row.forEach(cell => {if(cell.owner !== null && cell.owner.includes(playerKey) && cell.neighbours > 0 && cell.scored === true) { scoredCells.push(cell); }}));
      const score = scoredCells.reduce((sum, cell) => {
        const cellScore = (cell.state === "f" || cell.state === "d") ? 1 : (cell.state === "c") ? cell.neighbours : -10;
        return sum + cellScore;
      }, 0 );
      return score;
    }


    function HandleNameChange(event:any) {
        const newName = event.target.value;
        setHotUsername(newName);
    
        if(nameUpdateTimeout) { clearTimeout(nameUpdateTimeout); setNameUpdateTimeout(null); }
    
        setNameUpdateTimeout(setTimeout(() => {
          const existingPlayerData = {...myData};
          existingPlayerData.name = newName;
          setMyData(existingPlayerData);
          console.log('My new name is: ' + newName);

          // Send my data to all other players
          for(const competitor of competitors) {
            competitor.conn.send({competitor: {
              playerKey: existingPlayerData.playerKey,
              name: existingPlayerData.name,
              peerId: existingPlayerData.peerId,
              requestBoard: false
            }});
          }

          let cookieDate = new Date();
          cookieDate.setMonth(cookieDate.getMonth()+1);  
          document.cookie = `playerName=${newName}; samesite=lax; expires=${cookieDate.toUTCString()}`;
        }, 1000));
      }

      function CreateScoreboardRow(playerData:Player) {
        const myRow = playerData.playerKey === myData.playerKey;
        const flagCount = !boardData.cells ? 0 : boardData.cells.reduce((rowsSum, row) => {
          return rowsSum + row.reduce((cellsSum, cell) => {
            return cellsSum + ((cell.owner !== null && playerData.playerKey !== null && cell.owner.includes(playerData.playerKey) && (cell.state === 'f' || cell.state === 'd')) ? 1 : 0);
          }, 0);
        }, 0);
        return <div key={`${playerData.playerKey}`} data-playerkey={playerData.playerKey} className='ScoreboardRow'><div className={`ScoreboardColor ${myRow ? 'MyColor' : 'CompetitorColor'}`}></div><div className='ScoreboardConnected'>{playerData.active ? "✓" : <img src='spinner.svg' className='ScoreboardImage' alt='⌛'/>}</div><div className='ScoreboardEmoji'><span role="img" aria-label="sushi">🍣</span></div><div className={`${myRow ? '' : 'ScoreboardName'}`}>{myRow ? <input type='text' className='ScoreboardTextbox' value={hotUsername} onChange={HandleNameChange}/> : playerData.name}</div><div className='ScoreboardScore'>{playerData.playerKey === null ? 0 : CalculateScore(playerData.playerKey)}</div><div className='ScoreboardFlags'>{flagCount}</div></div>
      }
  
      const scoreboardHeader = <div key='scoreboardHeader' className='ScoreboardRow'><div className='ScoreboardColor'></div><div className='ScoreboardConnected'><img src='wifi.png' className='ScoreboardImage' alt='📶'/></div><div className='ScoreboardEmoji'></div><div className='ScoreboardName'></div><div className='ScoreboardScore'><span role="img" aria-label="dice">🎲</span></div><div className='ScoreboardFlags'><span role="img" aria-label="flag">🚩</span></div></div>
      scoreboard.push(scoreboardHeader);
      scoreboard.push(CreateScoreboardRow(myData));
      competitors.forEach(competitor => scoreboard.push(CreateScoreboardRow(competitor)));
  
      return <div className='Scoreboard'>{scoreboard}</div>;
}

export default Scoreboard;