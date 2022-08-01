import React, { useCallback, useEffect, useState } from 'react';
import Peer from 'peerjs';
import GetCookie from './GetCookie';

import './index.css';
import CreateBoard from './CreateBoard';
import JoinBoard from './JoinBoard';
import PlayField from './PlayField';
import SendData from './SendData';


function App() {
  const [nameUpdateTimeout, setNameUpdateTimeout] = useState(null);
  const [hotUsername, setHotUsername] = useState(GetCookie("playerName") || "Anonymous");

  const [gameState,   setGameState]   = useState("welcome");
  const [boardData,   setBoardData]   = useState({
    cells: null,
    hint: true,
    key: null,
    safe: null,
    secret: null,
    wrapfield: false,
    start: null,
    end: null
  });
  const [myData,      setMyData]      = useState({name: GetCookie("playerName") || "Anonymous", active: false, peerId: null, peer: null});
  const [competitors, setCompetitors] = useState([]);

  // Handle window resize
  useEffect(() => {
    function handleResize() {
      const existingTruevh =  parseFloat(document.documentElement.style.getPropertyValue("--truevh")) || 0;
      const truevh = window.innerHeight/100;
      if(truevh > existingTruevh) {
        document.documentElement.style.setProperty('--truevh', `${truevh}px`);
      }
    }

    window.addEventListener("resize", handleResize);

    // Initial call on load
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);



  // Gets existing player name/key from cookie at startup
  useEffect(() => {
    const existingPlayerName = GetCookie("playerName");
    if(existingPlayerName !== null) {
      setHotUsername(existingPlayerName);  
      setMyData(existingData => { return {...existingData, name: existingPlayerName}; });
    }

    const existingPlayerKey = GetCookie("playerKey");
    if(existingPlayerKey !== null) {
      setMyData(existingData => { return {...existingData, playerKey: existingPlayerKey}; });
    }
  }, []);



  // Creates peer at startup
  useEffect(() => {
    function PeerOpened(peerId) {  
      console.log('My Peerjs id is: ' + peerId);
      setMyData(existingPlayerData => { return {...existingPlayerData, peerId: peerId, active: true}; });
    }

    const peer = new Peer();
    peer.on('open', PeerOpened);
    setMyData(oldPlayerData => { return {...oldPlayerData, peer: peer} });
  }, []);



  // Read message from another player: text, player data, quantum board updates, or full board data
  const ProcessMessage = useCallback((data) => {
    if(typeof(data) === "string") { console.log("Message: " + data); return; }
    if(typeof(data) !== "object") { console.log("Data: " + data);    return; }
    if(data === null) { console.log("Got an empty data message.");   return; }

    const newCompetitor = data.competitor;
    if(newCompetitor) {
      console.log("New competitor data received");
      setCompetitors(oldCompetitors => {
        let newCompetitors = [...oldCompetitors];
        const competitorToUpdate = newCompetitors.findIndex(competitor => { return competitor.peerId === newCompetitor.peerId; });
        if(competitorToUpdate === -1) { console.log("New competitor data not incorporated"); console.log(newCompetitor); return newCompetitors; }

        newCompetitors[competitorToUpdate] = {...newCompetitors[competitorToUpdate], ...newCompetitor, active: true};
        newCompetitors[competitorToUpdate].conn.send("Welcome to Wrapfield");
        newCompetitors[competitorToUpdate].conn.send({board: boardData});

        // A player reconnecting will have an old entry in Competitors array. Filter out any competitor with the same player key and different Peer ID
        newCompetitors = newCompetitors.filter(competitor => { return (competitor.peerId === newCompetitor.peerId || competitor.playerKey !== newCompetitor.playerKey); })

        return newCompetitors;
      });
    }

    const remoteUpdates = data.updates;
    if(remoteUpdates) {
      console.log("Remote updates received");
      IncorporateUpdates(remoteUpdates);
    }

    const board = data.board;
    if(board) {
      console.log("Startup board data received");
      setBoardData(oldBoardData => { return {...oldBoardData, ...board}; });
    }
  }, [boardData]);


  function IncorporateUpdates(updates) {
    setBoardData(oldBoardData => {
      const newBoardData = {...oldBoardData};
      if(!oldBoardData.start) { newBoardData.start = new Date(); }

      updates.forEach(update => {
        // Missing data, ignore the update (null is not considered "missing")
        if(update.owner === undefined || update.state === undefined || update.scored === undefined) { return; }

        const existingOwners = newBoardData.cells[update.y][update.x].owner;
        const existingSate   = newBoardData.cells[update.y][update.x].state;
        const existingScored = newBoardData.cells[update.y][update.x].scored;

        const updateOwner  = update.owner;
        const updateSate   = update.state;
        const updateScored = update.scored;

        // should create a const for if I am an existing owner
      });


      const remainingSafe = !boardData.cells ? 0 : boardData.cells.reduce((rowsSum, row) => {
        return rowsSum + row.reduce((cellsSum, cell) => {
          return cellsSum + ((cell.state === 's') ? 1 : 0) + ((cell.state === 'd') ? 1 : 0);
        }, 0);
      }, 0);
      
      if(remainingSafe === 0 && !oldBoardData.end) { newBoardData.end = new Date(); }

      return newBoardData;
    });
  }




  // Set peer data receive event.
  const PeerConnected = useCallback((conn) => {
    console.log('Connected as host to: ' + conn.peer);

    // A guest just connected to us. We don't know anything about them yet except their conn (which has their peerId)
    const competitorPlaceholder = {conn: conn, peerId: conn.peer, playerKey: null, name: null, active: false};
    setCompetitors(oldCompetitors => { return [...oldCompetitors, competitorPlaceholder] });

    conn.on('data', function(data) {
      console.log('Received data as host.');
      ProcessMessage(data);
    });
  }, [ProcessMessage]);




  // Set peer connection event. Will send current board data right away, then listen for updates.
  useEffect(() => {
    const peer = myData.peer;
    if(peer) {
      peer.removeAllListeners("connection");
      peer.on('connection', PeerConnected);  
    }
  }, [myData.peer, PeerConnected]);



  // Send updates (tile clicks) to all other players
  function BroadcastUpdates(localUpdates) {
    for(const competitor of competitors) {
      competitor.conn.send({updates: localUpdates});
    }
    IncorporateUpdates(localUpdates);
    localUpdates = [];
  }



  async function GenerateBoard(boardSettings) {

    // If Peerjs is still connecting, try again in a little while
    if(myData.peerId === null) {
      setTimeout(() => {
        GenerateBoard(boardSettings);
        console.log("Please come again");
      }, 500);
      return;
    }

    // If some data is missing, abort
    if(!boardSettings.mines || !boardSettings.height || !boardSettings.width) { return; }

    // If more mines than spaces, abort
    if(boardSettings.mines >= boardSettings.height * boardSettings.width) { return; }


    const newBoardData = {};

    newBoardData.board = boardSettings;

    newBoardData.player = {
      peerId: myData.peerId,
      name: myData.name,
      playerKey: GetCookie("playerKey"),       // Will be null for new players
      playerSecret: GetCookie("playerSecret")  // Will be null for new players
    }

    //const createBoardResponse = JSON.parse(await SendData("CreateBoard.php", newBoardData));
    const reply = await SendData("CreateBoard.php", newBoardData);
    const createBoardResponse = JSON.parse(reply);
    console.log(createBoardResponse);

    setBoardData(createBoardResponse.board);

    setMyData(existingPlayerData => { return {...existingPlayerData, ...createBoardResponse.player}; });

    let cookieDate = new Date();
    cookieDate.setMonth(cookieDate.getMonth()+1);
    if(createBoardResponse.player.playerKey) { document.cookie = `playerKey=${createBoardResponse.player.playerKey}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
    if(createBoardResponse.player.secret)    { document.cookie = `playerSecret=${createBoardResponse.player.secret}; samesite=lax; expires=${cookieDate.toUTCString()}`; }

    setGameState("playing");
  }


  async function JoinGame(code) {
    if(myData.peerId === null) {
      setTimeout(() => {
        JoinGame(code);
        console.log("Please come again");
      }, 500);
      return;
    }

    const joinBoardData = {};

    joinBoardData.board = {
      code: code
    }

    joinBoardData.player = {
      name: hotUsername,
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
    console.log(joinBoardResponse)

    setBoardData(joinBoardResponse.board);

    setMyData(existingPlayerData => { return {...existingPlayerData, ...joinBoardResponse.player}; });

    const newCompetitors = joinBoardResponse.players.filter(player => player.playerKey !== joinBoardResponse.player.playerKey);
    newCompetitors.forEach(competitor => {
      competitor.activeConn = false;
      competitor.conn = myData.peer.connect(competitor.peerId);
      console.log(`Connecting to player #${competitor.playerKey} at ${competitor.peerId}`);
      competitor.conn.on('open', () => {
        competitor.activeConn = true;
        console.log(`Connected as guest to player #${competitor.playerKey}`);
        competitor.conn.on('data', function(data) {
          console.log('Received data as guest.');
          ProcessMessage(data);
        });
        competitor.conn.send("Hello from player #" + joinBoardResponse.player.playerKey);
        setTimeout(() => {
          competitor.conn.send({competitor: {
            playerKey: joinBoardResponse.player.playerKey,
            name: hotUsername,
            peerId: myData.peerId,
          }});
        }, 500);
      });
    });
    setCompetitors(newCompetitors);

    let cookieDate = new Date();
    cookieDate.setMonth(cookieDate.getMonth()+1);
    if(joinBoardResponse.player.playerKey) { document.cookie = `playerKey=${joinBoardResponse.player.playerKey}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
    if(joinBoardResponse.player.secret)    { document.cookie = `playerSecret=${joinBoardResponse.player.secret}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
    setGameState("playing");
  }


  const CreateScoreboard = useCallback(() => {
    const scoreboard = [];

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

    function HandleNameChange(event) {
      const newName = event.target.value;
      setHotUsername(newName);
  
      if(nameUpdateTimeout) { clearTimeout(nameUpdateTimeout); setNameUpdateTimeout(null); }
  
      setNameUpdateTimeout(setTimeout(() => {
        const existingPlayerData = {...myData};
        existingPlayerData.name = newName;
        setMyData(existingPlayerData);
        console.log('My new name is: ' + newName);
  
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
      return <div key={`${playerData.playerKey}`} className='ScoreboardRow'><div className={`ScoreboardColor ${myRow ? 'MyColor' : 'CompetitorColor'}`}></div><div className='ScoreboardConnected'>{playerData.active ? "✓" : <img src='spinner.svg' className='ScoreboardImage' alt='⌛'/>}</div><div className='ScoreboardEmoji'><span role="img" aria-label="sushi">🍣</span></div><div className={`${myRow ? '' : 'ScoreboardName'}`}>{myRow ? <input type='text' className='ScoreboardTextbox' value={hotUsername} onChange={HandleNameChange}/> : playerData.name}</div><div className='ScoreboardScore'>{CalculateScore(playerData.playerKey)}</div><div className='ScoreboardFlags'>{flagCount}</div></div>
    }

    const scoreboardHeader = <div key='scoreboardHeader' className='ScoreboardRow'><div className='ScoreboardColor'></div><div className='ScoreboardConnected'><img src='wifi.png' className='ScoreboardImage' alt='📶'/></div><div className='ScoreboardEmoji'></div><div className='ScoreboardName'></div><div className='ScoreboardScore'><span role="img" aria-label="dice">🎲</span></div><div className='ScoreboardFlags'><span role="img" aria-label="flag">🚩</span></div></div>
    scoreboard.push(scoreboardHeader);
    scoreboard.push(CreateScoreboardRow(myData));
    competitors.forEach(competitor => scoreboard.push(CreateScoreboardRow(competitor)));

    return scoreboard;

  },[myData, hotUsername, nameUpdateTimeout, competitors, boardData]);



  const showCreateGame = new URLSearchParams(window.location.search).get('code') === null;

  return (
    <>
    <div className="App" style={{display: gameState === "welcome" ? "" : "none"}}>
        <div className='Header' style={{display: gameState === "welcome" ? "" : "none"}}>
          <div className='Scoreboard'>{CreateScoreboard()}</div>
        </div>
        {showCreateGame && <CreateBoard state={gameState} GenerateBoard={GenerateBoard} />}
        <JoinBoard   state={gameState} JoinGame={JoinGame} />
    </div>
    <div className="BoardLayer" style={{display: gameState === "playing" ? "" : "none"}}>
    <div className='Header'>
          <div className='Scoreboard'>{CreateScoreboard()}</div>
        </div>
        <PlayField boardData={boardData} myData={myData} BroadcastUpdates={BroadcastUpdates} />
    </div>
    <div className='Footer'>Messages:</div>
    </>
  );
}

export default App;
