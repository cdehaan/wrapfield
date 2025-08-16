import React, { useRef, useState } from 'react';
import { QRCode } from 'react-qrcode-logo';
import './index.css';
import Timer from './Timer';
import type {Board, Player, Cell, CellUpdate} from './types.ts'

function PlayField(props: { boardData: Board; competitors: Player[]; myData: Player; HandleUpdates: (data: any) => void; }) {
  const [displayQR, setDisplayQR] = useState(false);
  const [flagging, setFlagging] = useState(false);  // For UI updates
  const flaggingRef = useRef(flagging);             // For event handlers

  function ToggleFlagging() { 
    const newValue = !flaggingRef.current;
    flaggingRef.current = newValue;  // Update ref immediately
    setFlagging(newValue);           // Trigger re-render for UI
  }

  const competitors = props.competitors

  const boardData = props.boardData;
  if(!boardData.cells) { return null; }

  const height = boardData.cells.length || 10;
  const width  = boardData.cells[0].length || height || 10;
  const gameboardStyle = { gridTemplateRows: `repeat(${height}, 1fr)`, gridTemplateColumns: `repeat(${width}, 1fr)`};
  const wrapfield = boardData.wrapfield;
  const myData = props.myData;

  const remainingFlags = !boardData.cells ? 0 : boardData.cells.reduce((rowsSum, row) => {
    return rowsSum + row.reduce((cellsSum, cell) => {
      return cellsSum + ((cell.state === 'm') ? 1 : 0) - ((cell.state === 'd') ? 1 : 0);
    }, 0);
  }, 0);

  const remainingSafe = !boardData.cells ? 0 : boardData.cells.reduce((rowsSum, row) => {
    return rowsSum + row.reduce((cellsSum, cell) => {
      return cellsSum + ((cell.state === 's') ? 1 : 0) + ((cell.state === 'd') ? 1 : 0);
    }, 0);
  }, 0);

  const gameComplete = remainingSafe === 0 && remainingFlags === 0;

  let localUpdates: CellUpdate[] = [];

  function GetNeighbours(cell: Cell) {
    const neighbourCells: Cell[] = [];
    const height = boardData.cells?.length || 0;
    const width = boardData.cells?.[0].length || 0;

    for (let yNeighbour = -1; yNeighbour <= 1; yNeighbour++) {
      if(!wrapfield && yNeighbour+cell.y < 0) { continue; }
      if(!wrapfield && yNeighbour+cell.y >= height) { continue; }
      for (let xNeighbour = -1; xNeighbour <= 1; xNeighbour++) {
        if(!wrapfield && xNeighbour+cell.x < 0) { continue; }
        if(!wrapfield && xNeighbour+cell.x >= width) { continue; }
        if(yNeighbour === 0 && xNeighbour === 0) { continue; }
        const wrappedY = ((yNeighbour+cell.y) % height + height) % height;
        const wrappedX = ((xNeighbour+cell.x) % width  + width)  % width;
        if(boardData.cells) {
          neighbourCells.push(boardData.cells[wrappedY][wrappedX]);
        }
      }
    }
    return neighbourCells;
  }

  function TileContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    if(!boardData.cells) { return; }

    const tile = event.target as HTMLElement;
    if (!tile.getAttribute) { return; } // Safety check

    const tileY = parseInt(tile.getAttribute("data-y") || "0");
    const tileX = parseInt(tile.getAttribute("data-x") || "0");
    const cell = boardData.cells[tileY][tileX];
    FlagCell(cell);

    return false;
  }

  function FlagCell(cell: Cell) {
    if(!myData.playerKey) { return; }

    const cellOwner = cell.owner;
    const cellState = cell.state;

    // Can't right click when the game is done
    if(gameComplete === true) { return }

    // Can't right click cleared/exploded tiles
    if(cellState === "c" || cellState === "e") { return; }

    // Can't right click someone else's flag
    if((cellState === "f" || cellState === "d") && !cellOwner.includes(myData.playerKey)) { return; }

    // Flag a mine
    if(cellState === "m") {
      const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "f", scored: true};
      localUpdates.push(oneUpdate);
    }

    // Flag a dud
    if(cellState === "s") {
      const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "d", scored: true};
      localUpdates.push(oneUpdate);
    }

    // Remove a true flag
    if(cellState === "f") {
      const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "m", scored: null};
      localUpdates.push(oneUpdate);
    }

    // Remove a dud flag
    if(cellState === "d") {
      const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "s", scored: null};
      localUpdates.push(oneUpdate);
    }

    BroadcastUpdates(localUpdates);
  }

  function handleMouseDown(event: React.PointerEvent<HTMLDivElement>) {
    // Both left and right pressed
    if (event.buttons === 3) {
        TileDoubleClick(event);
    }
  }

  function TileDoubleClick(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      return; // ignore double-tap on touch devices
    }

    if(!boardData.cells) { return; }

    const tile = event.target as HTMLElement;
    if (!tile.getAttribute) { return; }

    const tileY = parseInt(tile.getAttribute("data-y") || "0");
    const tileX = parseInt(tile.getAttribute("data-x") || "0");
    const cell = boardData.cells[tileY][tileX];
    const cellState = cell.state;

    // Can't double click when the game is done
    if(gameComplete === true) { return }

    // Can only double click clear tiles
    if(cellState !== "c") { return; }

    // Can only double click while clearing
    if(flaggingRef.current) { return; }

    const neighbourCells = GetNeighbours(cell);
    neighbourCells.forEach(cell => { if(["s","m"].includes(cell.state)) {RevealCell(cell);} });
    BroadcastUpdates(localUpdates);
  }

  function TileClicked(event: React.MouseEvent) {
    if(!boardData.cells) { return; }

    // Can't clear a tile when the game is done
    if(gameComplete === true) { return }

    const tile = event.target as HTMLElement;
    if (!tile.getAttribute) { return; }

    const tileY = parseInt(tile.getAttribute("data-y") || "0");
    const tileX = parseInt(tile.getAttribute("data-x") || "0");
    const cell = boardData.cells[tileY][tileX];

    if(flaggingRef.current) {
      FlagCell(cell);
    } else {
      RevealCell(cell);
    }
  }

  function RevealCell(cell: Cell) {
    if(!myData.playerKey) { return; }

    const cellOwner = cell.owner;
    const cellState = cell.state;

    if(flaggingRef.current) {
      if(cellState === "s") { // Unknown (safe) -> make dud
        const oneUpdate: CellUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "d", scored: true};
        localUpdates.push(oneUpdate);
      }

      if(cellState === "m") { // Unknown (mine) -> place true flag
        const oneUpdate: CellUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "f", scored: true};
        localUpdates.push(oneUpdate);
      }

      if(cellState === "d") { // Dud
        if(cellOwner !== null && cellOwner.includes(myData.playerKey)) { // My dud -> unset
          const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "s", scored: null};
          localUpdates.push(oneUpdate);
        }
      }

      if(cellState === "f") { // True flag
        if(cellOwner !== null && cellOwner.includes(myData.playerKey)) { // My true flag -> unset
          const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "m", scored: null};
          localUpdates.push(oneUpdate);
        }
      }
    } else { // Not flagging
      if(cellState === "s") { // Unknown (safe) -> clear
        if(cell.neighbours === 0) { DeepClick(cell); }
        else {
          const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "c", scored: true};
          localUpdates.push(oneUpdate);  
        }
      }  

      if(cellState === "m") { // Unknown (mine) -> explode
        const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "e", scored: true};
        localUpdates.push(oneUpdate);
      }

      if(cellState === "d") { // Dud
        if(cellOwner !== null && !cellOwner.includes(myData.playerKey)) { // Someone else's dud -> clear
          if(cell.neighbours === 0) { DeepClick(cell); }
          else {
            const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "c", scored: true};
            localUpdates.push(oneUpdate);  
          }
        }
      }
  
      if(cellState === "f") { // True flag
        if(cellOwner !== null && !cellOwner.includes(myData.playerKey)) { // Someone else's true flag -> explode
          const oneUpdate = {y: cell.y, x: cell.x, owner:myData.playerKey, state: "e", scored: true};
          localUpdates.push(oneUpdate);
        }
      }
    }

    BroadcastUpdates(localUpdates);
  }

  function DeepClick(cell: Cell) {
    if(!myData.playerKey) { return; }

    const cellOwner = cell.owner;
    const cellY = cell.y;
    const cellX = cell.x;

    // Another player has claimed this cell, we can't change it in a deep click
    if(cellOwner !== null) { return; }

    const oneUpdate: CellUpdate = {y: cellY, x: cellX, owner: myData.playerKey, state: "c", scored: false};
    localUpdates.push(oneUpdate);

    if(cell.neighbours === 0) {
      const neighbourCells = GetNeighbours(cell);
  
      for(const neighbourCell of neighbourCells) {
        const neighbourUpdate = localUpdates.find(update => (update.y === neighbourCell.y && update.x === neighbourCell.x));
        if(neighbourCell && neighbourCell.owner === null && !neighbourUpdate) {
          DeepClick(neighbourCell);
        }
      }
    }
  }

  function ToggleDisplayQR() {
    setDisplayQR(oldStatus => !oldStatus);
  }

  function NewGame() {    
    for(const competitor of competitors) {
      competitor.conn.send({event: {
        type: "New Game",
        time: Date.now()
      }});
    }
  }

  // Send updates (tile clicks) to all other players
  function BroadcastUpdates(localUpdates: CellUpdate[]) {
    if(!localUpdates || localUpdates.length === 0) { return; }
    for(const competitor of competitors) {
      competitor.conn.send({updates: {cellUpdates: localUpdates}});
    }
    props.HandleUpdates({cellUpdates: localUpdates});
    localUpdates = [];
  }


  const gameStateDiv = gameComplete ? <>🎉<div className='NewGameButton' onClick={NewGame}>New Game</div></> : `🚩: ${remainingFlags}`

  const tiles = [];
  if(boardData && boardData.cells && myData.playerKey) {
    for (let y=0; y<height; y++) {
      for(let x=0; x<width; x++) {
          const cell = boardData.cells[y][x];
          const cellOwner = cell.owner;
          const cellState = cell.state;
          const isSafe = (boardData.safe && cellState === "s" && boardData.safe.y === y && boardData.safe.x === x && boardData.hint === true);

          const tileText = (cellState === "d" || cellState === "f") ? "🚩" : (cellState === "m" || cellState === "e") ? "💣" : boardData.cells[y][x].neighbours > 0 ? boardData.cells[y][x].neighbours : isSafe ? "◎" : "";
          const stateClassName = isSafe ? "Safe" : cellOwner === null ? "Unknown" : (cellState === "d" || cellState === "f") ? "Flagged" : cellState === "c" ? "Cleared" : "Exploded";
          const ownerClassName = cellOwner === null ? "" : cellOwner.includes(myData.playerKey) ? "MyTile" : "CompetitorTile";
          const oneTile = <div key={`x${x}y${y}`} data-x={x} data-y={y}  className={`Cell ${stateClassName} ${ownerClassName}`} onContextMenu={TileContextMenu} onClick={TileClicked} onDoubleClick={TileDoubleClick} onMouseDown={handleMouseDown}>{tileText}</div>
          tiles.push(oneTile);
      }
    }
  }

  return (
      <>
        <div className='BoardWrapper'>
          <div className='BoardInfo'><img className="BoardInfoImage" alt='QR Code' src="QrIcon.svg" onClick={ToggleDisplayQR}/>{displayQR ? <span className='BoardInfoUrl'>{`https://wrapfield.com/?code=${boardData.code}`}</span> : <><div style={{display:"flex", alignItems:"center"}}>{gameStateDiv}</div><span><Timer start={boardData.start} end={boardData.end}></Timer></span></>}</div>
          <div className='GameBoard' style={gameboardStyle}>{tiles}{displayQR && <div className='QRWrapper'> <QRCode id='QRCode' size={280} value={`https://wrapfield.com/?code=${boardData.code}`} /></div>}</div>
        </div>
        <div id='TouchToggle' className={`TouchToggle ${flagging ? "ToggleFlagging" : "ToggleClearing"}`} onClick={ToggleFlagging}>{flagging ? "Flagging 🚩" : "Clearing ⛏️"}</div>
      </>
  );
}

export default PlayField;
