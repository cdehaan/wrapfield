import React, { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';

import {Board, Player, Heartbeat, Message, InitialBoard, InitialPlayer, Ping, PingReply} from './types.ts'

import './index.css';
import BoardScreen from './BoardScreen';
import WelcomeScreen from './WelcomeScreen';

import IncorporateUpdates from './utils/IncorporateUpdates.js';
import { handleResize } from './utils/handleResize.ts';
import { returnHeartbeat, setupHeartbeats } from './utils/heartbeats.ts';
import GetCookie from './utils/GetCookie.ts';
import { useAppDispatch } from './store/hooks'
import { addNewPing, addPingReply } from './store/timingSlice'

function App() {
  const dispatch = useAppDispatch()

  const [myData, setMyData] = useState<Player>(InitialPlayer);
  const [competitors, setCompetitors] = useState<Player[]>([]);
  const [boardData, setBoardData]   = useState<Board>(InitialBoard);
  const competitorsRef = useRef<Player[]>([]);


  // Handle window resize
  useEffect(() => {
    // Initial call on load
    handleResize();
    window.addEventListener("resize", handleResize);
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
    setMyData(existingPlayerData => { return {...existingPlayerData, peer: peer} });
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

          // Received any data from them
          competitor.conn.on('data', function(data:Message) { ProcessMessage(data, competitor.playerKey || undefined); });

          // Send our player data to them
          setTimeout(() => {
            competitor.conn.send({competitor: {
              playerKey: myData.playerKey,
              name: myData.name,
              peerId: myData.peerId,
            }, requestBoard: true});
          }, 250);
        });
    });
  }, [competitors]);

  useEffect(() => {
    competitorsRef.current = competitors;
  }, [competitors]);

  // Setup heartbeats to all competitors
  useEffect(() => {
    if(!myData.playerKey) {
      console.log("No player key set, not setting up heartbeats.");
      return;
    }
    // setupHeartbeats returns its own cleanup function
    return setupHeartbeats({competitors, myPlayerKey: myData.playerKey, dispatchNewPing: (playerKey: number) => dispatch(addNewPing(playerKey))});
  }, [competitors, myData.playerKey, dispatch]);

  // Read message from another player: text, competitor data, quantum board updates, full board data, heartbeat, or event
  const ProcessMessage = useCallback((data:Message, competitorKey?:number) => {
    if(typeof(data) === "string") { console.log("Message: " + data); return; }
    if(typeof(data) !== "object") { console.log("Data: " + data);    return; }
    if(data === null) { console.log("Got an empty data message.");   return; }
    let boardSent = false;

    // A new competitor joined and is sending us their data. There should already be a placeholder from their connect event
    const newCompetitor = data.competitor;
    if(newCompetitor && newCompetitor.peerId) {
      console.log("New competitor data received", newCompetitor);
      console.log("Current competitors:", competitors);
      setCompetitors(oldCompetitors => {
        let newCompetitors = [...oldCompetitors];
        const competitorToUpdate = newCompetitors.findIndex(competitor => { return competitor.peerId === newCompetitor.peerId; });
        if(competitorToUpdate === -1) { console.log("New competitor data not incorporated"); console.log(newCompetitor); return newCompetitors; }

        const mergedCompetitor = {...newCompetitors[competitorToUpdate], ...newCompetitor, active: true};
        console.log("Merged competitor data:", mergedCompetitor);

        newCompetitors[competitorToUpdate] = mergedCompetitor;
        if(data.requestBoard) {
          newCompetitors[competitorToUpdate].conn.send("Welcome to Wrapfield");
          newCompetitors[competitorToUpdate].conn.send({board: boardData});
          boardSent = true;
        }

        newCompetitors[competitorToUpdate].conn.removeAllListeners('data');
        newCompetitors[competitorToUpdate].conn.on('data', function(data:any) {
          ProcessMessage(data, newCompetitor.playerKey || undefined);
        });

        // A reconnecting player will have an old entry in Competitors array. Filter out any competitor with the same player key and different Peer ID
        newCompetitors = newCompetitors.filter(competitor => { return (competitor.peerId === newCompetitor.peerId || competitor.playerKey !== newCompetitor.playerKey); })
        console.log("Updated competitors:", newCompetitors);

        return newCompetitors;
      });
    }

    const updates = data.updates;
    if(updates) {
      console.log("Remote updates received");
      HandleUpdates(updates);
    }

    // Competitor is requesting the board data, we know the competitor's key and the board wasn't already sent
    if(data.requestBoard && competitorKey && !boardSent) {
        console.log("Board request received from competitor: ", competitorKey);
        const requestingCompetitor = competitors.find(comp => comp.playerKey === competitorKey);
        if(requestingCompetitor && requestingCompetitor.conn) {
            requestingCompetitor.conn.send({board: boardData});
        }
        return;
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
      if(myData.playerKey === null) {
        console.log("Warning: Heartbeat received but myData.playerKey is null. This should not happen.");
        return;
      }

      // Heartbeat stage 1 received - return it
      if(heartbeat.stage === 1) {
        returnHeartbeat(competitorsRef.current, myData.playerKey, heartbeat);
      }

      // Heartbeat stage 2 received - process ping data
      if (heartbeat.stage === 2) {
        //console.log("Heartbeat stage 2 received from " + heartbeat.playerKey);
        if(!heartbeat.bounced || !heartbeat.sent) {
          console.log(`Warning: Heartbeat received but bounced (${heartbeat.bounced}) or sent time (${heartbeat.sent}) is missing.`);
          return;
        }
        const pingReply: PingReply = {playerKey: heartbeat.playerKey, sent: heartbeat.sent, bounced: heartbeat.bounced};
        dispatch(addPingReply(pingReply));
        //console.log("Ping reply dispatched:", pingReply);
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

  }, [boardData, competitors, myData.playerKey]);


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

    // Don't send board data automatically
    // conn.send({board: boardData});

  }, [ProcessMessage]);


  // Set peer connection event. Listen for updates.
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