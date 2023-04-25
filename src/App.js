import React, { useCallback, useEffect, useState } from 'react';
import Peer from 'peerjs';
import GetCookie from './GetCookie';
import SendData from './SendData';

import './index.css';
import BoardScreen from './BoardScreen';
import WelcomeScreen from './WelcomeScreen';
import IncorporateUpdates from './IncorporateUpdates';


function App() {
  const [boardData, setBoardData] = useState({
    cells: null,
    hint: true,
    key: null,
    safe: null,
    secret: null,
    wrapfield: false,
    start: null,
    end: null,
    active: false
  });
  const [myData,      setMyData]      = useState({name: GetCookie("playerName") || "Anonymous", active: false, peerId: null, peer: null});
  const [competitors, setCompetitors] = useState([]);
  const [heartbeats,  setHeartbeats]  = useState(null)

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
      //setHotUsername(existingPlayerName);  
      setMyData(existingData => { return {...existingData, name: existingPlayerName}; });
    }

    const existingPlayerKey = parseInt(GetCookie("playerKey"));
    if(Number.isInteger(existingPlayerKey)) {
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


  // Send heartbeats to all competitors
  useEffect(() => {
    const heartbeatsSent = [];
    competitors.forEach(competitor => {
      heartbeatsSent.push(setInterval(() => {
        competitor.conn.send({heartbeat : {
          stage: 1,
          playerKey: myData.playerKey
        }});
        //console.log("Heartbeat stage 1 sent"); // ok
      }, 3000));
    });
    return () => {
      heartbeatsSent.forEach(heartbeat => { clearInterval(heartbeat); });
    }
  }, [competitors]);


  // Return heartbeats to all competitors
  useEffect(() => {
    if(!heartbeats) { return; }
    const competitor = competitors.find(comp => comp.playerKey === heartbeats.playerKey);
    if(competitor) {
      competitor.conn.send({heartbeat : {
        stage: 2,
        playerKey: myData.playerKey
      }});
      //console.log("Heartbeat stage 2 sent:"); // ok
    } else {
      console.log("Heartbeat could not be returned");
    }
  }, [heartbeats, competitors]);


  // Read message from another player: text, competitor data, quantum board updates, full board data, or heartbeat
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
        if(newCompetitor.requestBoard) {
          newCompetitors[competitorToUpdate].conn.send("Welcome to Wrapfield");
          newCompetitors[competitorToUpdate].conn.send({board: boardData});  
        }

        // A reconnecting player will have an old entry in Competitors array. Filter out any competitor with the same player key and different Peer ID
        newCompetitors = newCompetitors.filter(competitor => { return (competitor.peerId === newCompetitor.peerId || competitor.playerKey !== newCompetitor.playerKey); })

        return newCompetitors;
      });
    }

    const remoteUpdates = data.updates;
    if(remoteUpdates) {
      console.log("Remote updates received");
      HandleUpdates(remoteUpdates);
    }

    const board = data.board;
    if(board) {
      console.log("Startup board data received");
      setBoardData(oldBoardData => {
        const newBoardData = {...oldBoardData, ...board};
        if(newBoardData.start) { newBoardData.start = new Date(newBoardData.start); }
        if(newBoardData.end)   { newBoardData.end   = new Date(newBoardData.end);   }
        return newBoardData;
      });
    }

    const heartbeat = data.heartbeat; // {stage: 1, playerKey: 140}
    if(heartbeat) {
      //console.log("Heartbeat stage 1 received:"); // ok
      //console.log(heartbeat); // ok
        if(heartbeat.stage === 1) {
          setHeartbeats(heartbeat);
        }
  
        if (heartbeat.stage === 2) {
          //console.log("Heartbeat stage 2 received:");
          //console.log(heartbeat);  
        }  
    }

  }, [boardData, competitors]);


  // Calls "IncorporateUpdates" to calculate new board state given some updates
  function HandleUpdates(updates) {
    setBoardData(oldBoardData => {
      const newBoardData = IncorporateUpdates(updates, oldBoardData);
      return (newBoardData ? newBoardData : oldBoardData);
    })
  }


  // Set peer data receive event.
  const PeerConnected = useCallback((conn) => {
  //function PeerConnected(conn) {
    console.log('Connected as host to: ' + conn.peer);

    // A guest just connected to us. We don't know anything about them yet except their conn (which has their peerId)
    const competitorPlaceholder = {conn: conn, peerId: conn.peer, playerKey: null, name: null, active: false};
    setCompetitors(oldCompetitors => { return [...oldCompetitors, competitorPlaceholder] });

    conn.removeAllListeners('data');
    conn.on('data', function(data) {
      //console.log('Received data as host.'); // ok
      ProcessMessage(data);
    });
  }, [ProcessMessage]);
  //}


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
    if(localUpdates && localUpdates.length === 0) { return; }
    for(const competitor of competitors) {
      competitor.conn.send({updates: localUpdates});
    }
    HandleUpdates(localUpdates);
    localUpdates = [];
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
      console.log(`Connecting to player #${competitor.playerKey} at ${competitor.peerId}`);
      competitor.conn.on('open', () => {
        competitor.activeConn = true;
        console.log(`Connected as guest to player #${competitor.playerKey}`);
        competitor.conn.on('data', function(data) {
          //console.log('Received data as guest.');
          ProcessMessage(data);
        });
        competitor.conn.send("Hello from player #" + joinBoardResponse.player.playerKey);
        setTimeout(() => {
          competitor.conn.send({competitor: {
            playerKey: joinBoardResponse.player.playerKey,
            name: myData.name,
            peerId: myData.peerId,
            requestBoard: true
          }});
        }, 500);
      });
    });
    setCompetitors(newCompetitors);

    let cookieDate = new Date();
    cookieDate.setMonth(cookieDate.getMonth()+1);
    if(joinBoardResponse.player.playerKey) { document.cookie = `playerKey=${joinBoardResponse.player.playerKey}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
    if(joinBoardResponse.player.secret)    { document.cookie = `playerSecret=${joinBoardResponse.player.secret}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
  }

  /*
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

  },[myData, hotUsername, nameUpdateTimeout, competitors, boardData]);
  */


  return (
    <>
    <WelcomeScreen boardData={boardData} myData={myData} competitors={competitors} setMyData={setMyData} setBoardData={setBoardData} JoinGame={JoinGame} />
    <BoardScreen   boardData={boardData} myData={myData} competitors={competitors} setMyData={setMyData} BroadcastUpdates={BroadcastUpdates} />
    <div className='Debug'>Messages:</div>
    </>
  );
}

export default App;
