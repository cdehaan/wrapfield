import React, { useCallback, useEffect, useState } from 'react';
import Peer from 'peerjs';
import GetCookie from './GetCookie';
import IncorporatePing from './IncorporatePing.mjs';
import type {Board, Player, Heartbeat, Message} from './.d.ts'

import './index.css';
import BoardScreen from './BoardScreen';
import WelcomeScreen from './WelcomeScreen';
import IncorporateUpdates from './IncorporateUpdates';


function App() {
  const [myData,      setMyData]      = useState<Player>({
    name: GetCookie("playerName") || "Anonymous",
    playerKey:null,
    peerId:null,
    peer: null,
    conn: null,
    activeConn: false,
    secret: null,
    active: false,
  });

  const [competitors, setCompetitors] = useState<Player[]>([]);

  const [boardData,   setBoardData]   = useState<Board>({
    key: null,
    code: null,
    cells: null,
    width: 10,
    height: 10,
    mines: 15,
    hint: true,
    safe: true,
    private: false,
    wrapfield: false,
    active: false,
    stale: false,
  });

  const [pings,       setPings]       = useState([]) // {playerKey: 1, sent: time, bounced: time, ping: time, skew: percent}


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

    const existingPlayerKey = GetCookie("playerKey")
    if(existingPlayerKey !== null) {
      setMyData(existingData => { return {...existingData, playerKey: parseInt(existingPlayerKey)}; });
    }
  }, []);


  // Creates peer at startup
  useEffect(() => {
    function PeerOpened(peerId: string) {  
      console.log('My Peerjs id is: ' + peerId);
      setMyData(existingPlayerData => { return {...existingPlayerData, peerId: peerId, active: true}; });
    }

    const peer = new Peer();
    peer.on('open', PeerOpened);
    setMyData(oldPlayerData => { return {...oldPlayerData, peer: peer} });
  }, []);


  // Connect to competitors that we don't have a connection to
  useEffect(() => {
    const newCompetitors = competitors.filter(competitor => competitor.activeConn === false);
    if(!newCompetitors) return;

    newCompetitors.forEach(competitor => {
        competitor.activeConn = true;
        console.log(`Initial connection to peer: ${competitor.peerId}`);

        competitor.conn.on('open', () => {
          competitor.conn.send("Hello from player #" + myData.playerKey);
    
          // Received data from them
          competitor.conn.on('data', function(data:Message) { ProcessMessage(data, competitor.playerKey || undefined); });
    
          // Send our data to them
          setTimeout(() => {
            competitor.conn.send({competitor: {
            playerKey: myData.playerKey,
            name: myData.name,
            peerId: myData.peerId,
            //requestBoard: true,
            time: Date.now() // Currently unused
            }});
          }, 50);
        });
    });
  }, [competitors]);

  // Setup a heartbeat to all competitors
  useEffect(() => {
    const heartbeatsSent:ReturnType<typeof setInterval>[] = [];
    competitors.forEach((competitor, index) => {

      // Send a heartbeat stage 1 every 3 seconds
      heartbeatsSent.push(setInterval(() => {
        setTimeout(() => {
          const now = Date.now()

          // The actual sending of the heartbeat
          competitor.conn.send({heartbeat : {
            stage: 1,
            playerKey: myData.playerKey,
            sent: now
          }});


          // Make a record of when we sent it to calculate ping later
          setPings(currentPings => {
            const pingEvent = {playerKey: competitor.playerKey, sent: Date.now()}
            return IncorporatePing(currentPings, pingEvent)
          })

        }, index*100); // Stagger the heartbeats a little
      }, 3000));
    });

    return () => { heartbeatsSent.forEach(heartbeat => { clearInterval(heartbeat) }) }

  }, [competitors]);


  // Return a heartbeat sent by a competitor
  function ReturnHeartbeat(heartbeat:Heartbeat) {
    if(!heartbeat) { return; }
    const competitor = competitors.find(comp => comp.playerKey === heartbeat.playerKey);

    if(competitor) {
      competitor.conn.send({heartbeat : {
        stage: 2,
        playerKey: myData.playerKey,
        bounced: Date.now()
      }});
    } else {
      console.log("Heartbeat could not be returned");
    }
  }


  // Read message from another player: text, competitor data, quantum board updates, full board data, heartbeat, or event
  const ProcessMessage = useCallback((data:Message, competitorKey?:number) => {
    if(typeof(data) === "string") { console.log("Message: " + data); return; }
    if(typeof(data) !== "object") { console.log("Data: " + data);    return; }
    if(data === null) { console.log("Got an empty data message.");   return; }

    // A new competitor joined and is sending us their data. There should already be a placeholder from their connect event
    const newCompetitor = data.competitor;
    if(newCompetitor && newCompetitor.peerId) {
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

        newCompetitors[competitorToUpdate].conn.removeAllListeners('data');
        newCompetitors[competitorToUpdate].conn.on('data', function(data:any) {
          ProcessMessage(data, newCompetitor.playerKey || undefined);
        });

        // A reconnecting player will have an old entry in Competitors array. Filter out any competitor with the same player key and different Peer ID
        newCompetitors = newCompetitors.filter(competitor => { return (competitor.peerId === newCompetitor.peerId || competitor.playerKey !== newCompetitor.playerKey); })

        return newCompetitors;
      });
    }

    const updates = data.updates;
    if(updates) {
      console.log("Remote updates received");
      HandleUpdates(updates);
    }

    const board = data.board;
    if(board) {
      console.log("Entire board data received");
      setBoardData(oldBoardData => {
        const newBoardData = {...oldBoardData, ...board};
        newBoardData.start = null;  if(newBoardData.start) { newBoardData.start = new Date(newBoardData.start); }
        newBoardData.end = null;    if(newBoardData.end)   { newBoardData.end   = new Date(newBoardData.end);   }
        return newBoardData;
      });
    }

    const heartbeat:Heartbeat = data.heartbeat; // {stage: 1, playerKey: 140}
    if(heartbeat) {
      if(competitorKey && heartbeat.playerKey !== competitorKey) { console.log(`Warning: Player Key in heartbeat (${heartbeat.playerKey}) and Player key in connection object (${competitorKey}) don't match.`) }

      // Heartbeat stage 1 received
      if(heartbeat.stage === 1) {
        ReturnHeartbeat(heartbeat)
      }

      // Heartbeat stage 2 received
      if (heartbeat.stage === 2) {
        setPings(currentPings => {
          const pingEvent = {playerKey: heartbeat.playerKey, bounced: heartbeat.bounced, received: Date.now()}
          return IncorporatePing(currentPings, pingEvent)
        })
      }  
    }

    const event = data.event
    if(event) {
      switch (event.type) {
        case "New Game":
          setBoardData(oldBoardData => {
            if(oldBoardData) oldBoardData.stale = true
            return oldBoardData;
          });
          break;
      
        default:
          console.log("Warning: Unknown event received")
          break;
      }
    }

  }, [boardData, competitors]);


  // Calls "IncorporateUpdates" if new cell data comes to calculate new board state given some updates
  // Saves board data if board data comes
  function HandleUpdates(updates:any) {
    const cellUpdates = updates.cellUpdates
    if(cellUpdates) {
      setBoardData(oldBoardData => {
        const newBoardData = IncorporateUpdates(cellUpdates, oldBoardData);
        return (newBoardData ? newBoardData : oldBoardData);
      })
    }

    const boardUpdates = updates.boardUpdates
    if(boardUpdates) {
      setBoardData(oldBoardData => {
        const newBoardData = {...oldBoardData, ...boardUpdates}
        return newBoardData
      })
    }
  }


  // Set peer data receive event.
  const PeerConnected = useCallback((conn:any) => {
    console.log('Connected as host to: ' + conn.peer);

    // A guest just connected to us. We don't know anything about them yet except their conn (which has their peerId)
    const competitorPlaceholder = {name: null, playerKey: null, peerId: conn.peer, peer: null, conn: conn, activeConn: false, active: false};
    setCompetitors(oldCompetitors => { return [...oldCompetitors, competitorPlaceholder] });

    // Received data as host.
    conn.removeAllListeners('data');
    conn.on('data', function(data:any) {
      ProcessMessage(data);
    });

    conn.send({board: boardData});

  }, [ProcessMessage]);


  // Set peer connection event. Will send current board data right away, then listen for updates.
  useEffect(() => {
    const peer = myData.peer;
    if(peer) {
      peer.removeAllListeners("connection");
      peer.on('connection', PeerConnected);  
    }
  }, [myData.peer, PeerConnected]);


  return (
    <>
    <WelcomeScreen boardData={boardData} myData={myData} competitors={competitors} setMyData={setMyData} setBoardData={setBoardData} setCompetitors={setCompetitors} />
    <BoardScreen   boardData={boardData} myData={myData} competitors={competitors} setMyData={setMyData} HandleUpdates={HandleUpdates}/>
    <div className='Debug'>Messages:</div>
    </>
  );
}

export default App;
