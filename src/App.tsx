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
import { addNewPing, addPingReply, processPingQueue } from './store/timingSlice'

function App() {
  const dispatch = useAppDispatch()

  const [myData, setMyData] = useState<Player>(InitialPlayer);
  const [competitors, setCompetitors] = useState<Player[]>([]);
  const [boardData, setBoardData] = useState<Board>(InitialBoard);
  const competitorsRef = useRef<Player[]>([]);

  // New state for connection management
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatFailCountRef = useRef<{[key: number]: number}>({});
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      setMyData(existingData => { return {...existingData, name: existingPlayerName}; });
    }

    const existingPlayerKey = GetCookie("playerKey")
    if(existingPlayerKey !== null) {
      setMyData(existingData => { return {...existingData, playerKey: parseInt(existingPlayerKey)}; });
    }
  }, []);

  // New function to refresh backend connection data
  const refreshBackendConnection = useCallback(async (newPeerId: string) => {
    console.log('Refreshing backend connection with new Peer ID:', newPeerId);
    return;
    try {
      const response = await fetch('/api/refresh-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerKey: myData.playerKey,
          peerId: newPeerId,
          playerName: myData.name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh backend connection');
      }

      const data = await response.json();
      return data.connectedPeers || []; // Assume backend returns list of other players' peer IDs
    } catch (error) {
      console.error('Error refreshing backend connection:', error);
      return [];
    }
  }, [myData.playerKey, myData.name]);

  // New function to create peer with error handling
  const createPeer = useCallback(() => {
    const peer = new Peer();
    
    peer.on('open', async (peerId: string) => {
      console.log('My Peerjs id is: ' + peerId);
      setMyData(existingPlayerData => { 
        return {...existingPlayerData, peerId: peerId, active: true}; 
      });

      // Refresh backend with new peer ID and get list of connected peers
      if (myData.playerKey) {
        const connectedPeers = await refreshBackendConnection(peerId);
        await reconnectToCompetitors(connectedPeers);
      }

      setIsReconnecting(false);
      setConnectionLost(false);
    });

    peer.on('error', (error) => {
      console.error('Peer error:', error);
      if (error.type === 'network' || error.type === 'server-error') {
        handleConnectionLoss();
      }
    });

    peer.on('disconnected', () => {
      console.log('Peer disconnected');
      handleConnectionLoss();
    });

    peer.on('close', () => {
      console.log('Peer connection closed');
      handleConnectionLoss();
    });

    return peer;
  }, [myData.playerKey, myData.name]);

  // Function to reconnect to competitors after getting updated peer list
  const reconnectToCompetitors = useCallback(async (connectedPeerIds: string[]) => {
    console.log('Reconnecting to competitors:', connectedPeerIds);
    
    // Clear existing competitors that might be stale
    setCompetitors([]);
    
    // Create new connections to all active peers
    const newCompetitors: Player[] = [];
    
    for (const peerId of connectedPeerIds) {
      if (peerId !== myData.peerId && myData.peer) {
        const conn = myData.peer.connect(peerId);
        const competitor = {
          name: null,
          playerKey: null,
          peerId: peerId,
          peer: null,
          conn: conn,
          activeConn: false,
          active: false
        };
        newCompetitors.push(competitor);
      }
    }
    
    setCompetitors(newCompetitors);
  }, [myData.peerId, myData.peer]);

  // Function to handle connection loss
  const handleConnectionLoss = useCallback(() => {
    if (isReconnecting) return; // Prevent multiple reconnection attempts
    
    console.log('Connection lost, attempting to reconnect...');
    setConnectionLost(true);
    setIsReconnecting(true);
    
    // Clear existing heartbeat fail counts
    heartbeatFailCountRef.current = {};
    
    // Attempt reconnection after a short delay
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      // Destroy old peer if it exists
      if (myData.peer) {
        myData.peer.destroy();
      }
      
      // Create new peer
      const newPeer = createPeer();
      setMyData(existingPlayerData => { 
        return {...existingPlayerData, peer: newPeer}; 
      });
    }, 2000);
  }, [isReconnecting, myData.peer, createPeer]);

  // Enhanced heartbeat monitoring for connection health
  const checkConnectionHealth = useCallback(() => {
    competitors.forEach(competitor => {
      if (!competitor.playerKey) return;
      
      // If we haven't heard from this competitor in a while, increment fail count
      const failCount = heartbeatFailCountRef.current[competitor.playerKey] || 0;
      
      if (failCount > 3) {
        console.log(`Competitor ${competitor.playerKey} appears disconnected`);
        // This competitor seems disconnected, trigger reconnection
        handleConnectionLoss();
      }
    });
  }, [competitors, handleConnectionLoss]);

  // Page visibility API to detect when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden');
        // Set a timeout to check connection when page becomes visible again
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }
      } else {
        console.log('Page visible');
        // When page becomes visible, check if peer is still connected after a short delay
        visibilityTimeoutRef.current = setTimeout(() => {
          if (myData.peer && (myData.peer.disconnected || myData.peer.destroyed)) {
            console.log('Peer disconnected while page was hidden');
            handleConnectionLoss();
          } else if (myData.peer && myData.peer.open) {
            // Peer seems OK, but let's verify we can still reach competitors
            checkConnectionHealth();
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [myData.peer, handleConnectionLoss, checkConnectionHealth]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network back online');
      // Small delay to ensure network is stable before reconnecting
      setTimeout(() => {
        if (connectionLost || (myData.peer && myData.peer.disconnected)) {
          handleConnectionLoss();
        }
      }, 1000);
    };

    const handleOffline = () => {
      console.log('Network went offline');
      setConnectionLost(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionLost, myData.peer, handleConnectionLoss]);

  // Creates peer at startup
  useEffect(() => {
    const peer = createPeer();
    setMyData(existingPlayerData => { return {...existingPlayerData, peer: peer} });
  }, []);

  // Connect to competitors that we don't have a connection to
  useEffect(() => {
    const newCompetitors = competitors.filter(competitor => competitor.activeConn === false);
    if(!newCompetitors || newCompetitors.length === 0) return;

    newCompetitors.forEach(competitor => {
        competitor.activeConn = true;
        console.log(`Initial connection to peer: ${competitor.peerId}`);

        competitor.conn.on('open', () => {
          competitor.conn.send("Hello from player #" + myData.playerKey);

          // Reset heartbeat fail count when connection opens
          if (competitor.playerKey) {
            heartbeatFailCountRef.current[competitor.playerKey] = 0;
          }

          // Received any data from them
          competitor.conn.on('data', function(data:Message) { 
            ProcessMessage(data, competitor.playerKey || undefined); 
          });

          // Send our player data to them
          setTimeout(() => {
            competitor.conn.send({competitor: {
              playerKey: myData.playerKey,
              name: myData.name,
              peerId: myData.peerId,
            }, requestBoard: true});
          }, 50);
        });

        competitor.conn.on('error', (error: any) => {
          console.error(`Connection error with ${competitor.peerId}:`, error);
          if (competitor.playerKey) {
            heartbeatFailCountRef.current[competitor.playerKey] = 
              (heartbeatFailCountRef.current[competitor.playerKey] || 0) + 1;
          }
        });

        competitor.conn.on('close', () => {
          console.log(`Connection closed with ${competitor.peerId}`);
          if (competitor.playerKey) {
            heartbeatFailCountRef.current[competitor.playerKey] = 
              (heartbeatFailCountRef.current[competitor.playerKey] || 0) + 1;
          }
        });
    });
  }, [competitors, boardData, myData.playerKey, myData.name, myData.peerId]);

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
    return setupHeartbeats({
      competitors, 
      myPlayerKey: myData.playerKey, 
      dispatchNewPing: (playerKey: number, now: number) => dispatch(addNewPing({playerKey, sent: now}))
    });
  }, [competitors, myData.playerKey, dispatch]);

  // Read message from another player: text, competitor data, quantum board updates, full board data, heartbeat, or event
  const ProcessMessage = useCallback((data:Message, competitorKey?:number) => {
    // Reset heartbeat fail count when we receive any message
    if (competitorKey) {
      heartbeatFailCountRef.current[competitorKey] = 0;
    }

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

    // Full board data received
    const board = data.board;
    if(board) {
      if(boardData.key) {
        return;
      }
      setBoardData(oldBoardData => {
        const newBoardData = {...oldBoardData, ...board};
        newBoardData.start = null;  if(newBoardData.start) { newBoardData.start = new Date(newBoardData.start); }
        newBoardData.end = null;    if(newBoardData.end)   { newBoardData.end   = new Date(newBoardData.end);   }
        return newBoardData;
      });
    }

    // Heartbeat received
    const heartbeat:Heartbeat = data.heartbeat;
    if(heartbeat) {
      if(competitorKey && heartbeat.playerKey !== competitorKey) { 
        console.log(`Warning: Player Key in heartbeat (${heartbeat.playerKey}) and Player key in connection object (${competitorKey}) don't match.`) 
      }
      if(myData.playerKey === null) {
        console.log("Warning: Heartbeat received but myData.playerKey is null. This should not happen.");
        return;
      }

      // Reset fail count on successful heartbeat
      if (heartbeat.playerKey) {
        heartbeatFailCountRef.current[heartbeat.playerKey] = 0;
      }

      // Heartbeat stage 1 received - return it
      if(heartbeat.stage === 1) {
        returnHeartbeat(competitorsRef.current, myData.playerKey, heartbeat);
      }

      // Heartbeat stage 2 received - process ping data
      if (heartbeat.stage === 2) {
        console.log("Heartbeat stage 2 received from " + heartbeat.playerKey);
        if(!heartbeat.bounced || !heartbeat.sent) {
          console.log(`Warning: Heartbeat received but bounced (${heartbeat.bounced}) or sent time (${heartbeat.sent}) is missing.`);
          return;
        }

        const pingReply: PingReply = {
          playerKey: heartbeat.playerKey, 
          sent: heartbeat.sent, 
          bounced: heartbeat.bounced
        };

        dispatch(addPingReply(pingReply));
        
        setTimeout(() => {
          dispatch(processPingQueue());
        }, 100);
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

  }, [boardData, competitors, myData.playerKey, dispatch]);

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

    // Send board data automatically
    conn.send({board: boardData});

  }, [ProcessMessage, boardData]);

  // Set peer connection event. Listen for updates.
  useEffect(() => {
    const peer = myData.peer;
    if(peer) {
      peer.removeAllListeners("connection");
      peer.on('connection', PeerConnected);
    }
  }, [myData.peer, PeerConnected]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
    <WelcomeScreen boardData={boardData} myData={myData} competitors={competitors} setMyData={setMyData} setBoardData={setBoardData} setCompetitors={setCompetitors} />
    <BoardScreen   boardData={boardData} myData={myData} competitors={competitors} setMyData={setMyData} HandleUpdates={HandleUpdates}/>
    <div className='Debug'>
      Messages:
      {connectionLost && <div style={{color: 'red'}}>Connection Lost</div>}
      {isReconnecting && <div style={{color: 'orange'}}>Reconnecting...</div>}
    </div>
    </>
  );
}

export default App;