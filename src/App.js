import React, { useCallback, useEffect, useState } from 'react';
import Peer from 'peerjs';
import GetCookie from './GetCookie';
//import SendData from './SendData';

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
  const [heartbeat,   setHeartbeat]   = useState(null)


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


  // Connect to competitors that we don't have a connection to
  useEffect(() => {
    const newCompetitors = competitors.filter(competitor => competitor.activeConn === false)

    newCompetitors.forEach(competitor => {
      console.log(`Connecting to player #${competitor.playerKey} at ${competitor.peerId}`);
      competitor.conn.on('open', () => {
        competitor.activeConn = true;
        console.log(`Connected as guest to player #${competitor.playerKey}`);
        competitor.conn.on('data', function(data) {
          //console.log('Received data as guest.');
          ProcessMessage(data);
        });
        competitor.conn.send("Hello from player #" + myData.playerKey);
        setTimeout(() => {
          competitor.conn.send({competitor: {
          playerKey: myData.playerKey,
          name: myData.name,
          peerId: myData.peerId,
          requestBoard: true
          }});
        }, 500);
      });
    })
  }, [competitors])


  // Setup a heartbeat to all competitors
  useEffect(() => {
    const heartbeatsSent = [];
    competitors.forEach((competitor, index) => {
      heartbeatsSent.push(setInterval(() => {
        setTimeout(() => {
          competitor.conn.send({heartbeat : {
            stage: 1,
            playerKey: myData.playerKey
          }});
          //console.log("Heartbeat stage 1 sent"); // ok            
        }, index*100); // Stagger the heartbeats a little
      }, 3000));
    });
    return () => {
      heartbeatsSent.forEach(heartbeat => { clearInterval(heartbeat); });
    }
  }, [competitors]);


  // Return a heartbeat sent by a competitor
  useEffect(() => {
    if(!heartbeat) { return; }
    const competitor = competitors.find(comp => comp.playerKey === heartbeat.playerKey);
    if(competitor) {
      competitor.conn.send({heartbeat : {
        stage: 2,
        playerKey: myData.playerKey
      }});
      //console.log("Heartbeat stage 2 sent:"); // ok
    } else {
      console.log("Heartbeat could not be returned");
    }
  }, [heartbeat, competitors]);


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
          setHeartbeat(heartbeat);
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


  return (
    <>
    <WelcomeScreen boardData={boardData} myData={myData} competitors={competitors} setMyData={setMyData} setBoardData={setBoardData} setCompetitors={setCompetitors} />
    <BoardScreen   boardData={boardData} myData={myData} competitors={competitors} setMyData={setMyData} BroadcastUpdates={BroadcastUpdates} />
    <div className='Debug'>Messages:</div>
    </>
  );
}

export default App;
