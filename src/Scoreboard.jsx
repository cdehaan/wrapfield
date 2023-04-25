import React, { useState } from "react";

import GetCookie from "./GetCookie";

function Scoreboard(props) {
    const scoreboard = [];
    const boardData = props.boardData
    const myData = props.myData
    const competitors = props.competitors

    const setMyData = props.setMyData

    const [hotUsername, setHotUsername] = useState(GetCookie("playerName") || "Anonymous");
    const [nameUpdateTimeout, setNameUpdateTimeout] = useState(null);

    function CalculateScore(playerKey) {
      if(!boardData || !boardData.cells || !playerKey) { return 0; }
      const scoredCells = [];
      boardData.cells.forEach(row => row.forEach(cell => {if(cell.owner !== null && cell.owner.includes(playerKey) && cell.neighbours > 0 && cell.scored === true) { scoredCells.push(cell); }}));
      const score = scoredCells.reduce((sum, cell) => {
        const cellScore = (cell.state === "f" || cell.state === "d") ? 1 : (cell.state === "c") ? cell.neighbours : -10;
        return sum + cellScore;
      }, 0 );
      return score;
    }

    // Send my data to all other players
    function BroadcastMyData(broadcastData) {
        if(!broadcastData) { return; }
        for(const competitor of competitors) {
        competitor.conn.send({competitor: {
            playerKey: broadcastData.playerKey,
            name: broadcastData.name,
            peerId: broadcastData.peerId,
            requestBoard: broadcastData.requestBoard
        }});
        }
    }


    function HandleNameChange(event) {
        const newName = event.target.value;
        setHotUsername(newName);
    
        if(nameUpdateTimeout) { clearTimeout(nameUpdateTimeout); setNameUpdateTimeout(null); }
    
        setNameUpdateTimeout(setTimeout(() => {
          const existingPlayerData = {...myData};
          existingPlayerData.name = newName;
          setMyData(existingPlayerData);
          console.log('My new name is: ' + newName);
          BroadcastMyData({
            playerKey: existingPlayerData.playerKey,
            name: existingPlayerData.name,
            peerId: existingPlayerData.peerId,
            requestBoard: false
          });
    
          let cookieDate = new Date();
          cookieDate.setMonth(cookieDate.getMonth()+1);  
          document.cookie = `playerName=${newName}; samesite=lax; expires=${cookieDate.toUTCString()}`;
        }, 1000));
      }

      function CreateScoreboardRow(playerData) {
        const myRow = playerData.playerKey === myData.playerKey;
        const flagCount = !boardData.cells ? 0 : boardData.cells.reduce((rowsSum, row) => {
          return rowsSum + row.reduce((cellsSum, cell) => {
            return cellsSum + ((cell.owner !== null && cell.owner.includes(playerData.playerKey) && (cell.state === 'f' || cell.state === 'd')) ? 1 : 0);
          }, 0);
        }, 0);
        return <div key={`${playerData.playerKey}`} playerkey={playerData.playerKey} className='ScoreboardRow'><div className={`ScoreboardColor ${myRow ? 'MyColor' : 'CompetitorColor'}`}></div><div className='ScoreboardConnected'>{playerData.active ? "✓" : <img src='spinner.svg' className='ScoreboardImage' alt='⌛'/>}</div><div className='ScoreboardEmoji'><span role="img" aria-label="sushi">🍣</span></div><div className={`${myRow ? '' : 'ScoreboardName'}`}>{myRow ? <input type='text' className='ScoreboardTextbox' value={hotUsername} onChange={HandleNameChange}/> : playerData.name}</div><div className='ScoreboardScore'>{CalculateScore(playerData.playerKey)}</div><div className='ScoreboardFlags'>{flagCount}</div></div>
      }
  
      const scoreboardHeader = <div key='scoreboardHeader' className='ScoreboardRow'><div className='ScoreboardColor'></div><div className='ScoreboardConnected'><img src='wifi.png' className='ScoreboardImage' alt='📶'/></div><div className='ScoreboardEmoji'></div><div className='ScoreboardName'></div><div className='ScoreboardScore'><span role="img" aria-label="dice">🎲</span></div><div className='ScoreboardFlags'><span role="img" aria-label="flag">🚩</span></div></div>
      scoreboard.push(scoreboardHeader);
      scoreboard.push(CreateScoreboardRow(myData));
      competitors.forEach(competitor => scoreboard.push(CreateScoreboardRow(competitor)));
  
      return <div className='Scoreboard'>{scoreboard}</div>;
}

export default Scoreboard;