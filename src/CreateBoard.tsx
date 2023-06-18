import './index.css';
import React, { useEffect, useState } from 'react';
import type {Board, Player, BoardRequest} from './.js'

import GetCookie from './GetCookie';
import SendData from './SendData';

function CreateBoard({ active, myData, setMyData, setBoardData}: {active: boolean, myData:Player, setMyData:React.Dispatch<React.SetStateAction<Player>>, setBoardData:React.Dispatch<React.SetStateAction<Board>> }) {
    const showCreateGame = new URLSearchParams(window.location.search).get('code') === null;
    if(showCreateGame === false) { return null }

    const [boardSettings, setBoardSettings] = useState<Board>({key: null, code: null, cells: null, width: 10, height: 10, mines: 15, private: false, active: false, wrapfield: false, hint:true, safe: true, stale: false});

    // Size of the component, not the gameboard size. CSS won't animate from "auto".
    const [height, setHeight] = useState<number|null>(null);
    const [width,  setWidth] = useState<number|null>(null);

    async function CreateNewGame() {
        // If Peerjs is still connecting, try again in a little while
        if(myData.peerId === null) {
            setTimeout(() => {
                CreateNewGame();
                console.log("Please come again");
            }, 500);
            return;
        }

        boardSettings.width  = Math.max(4, Math.min(30, boardSettings.width))
        boardSettings.height = Math.max(4, Math.min(30, boardSettings.height))
        boardSettings.mines  = Math.max(3, Math.min(boardSettings.width*boardSettings.height-1, boardSettings.mines))

        const playerKey    = GetCookie("playerKey")
        const playerSecret = GetCookie("playerSecret")

        const newBoardData:BoardRequest = {
            board: boardSettings,
            player: {
                peerId: myData.peerId,
                name: myData.name || "Anonymous",
                playerKey: playerKey === null ? null : parseInt(playerKey),  // Will be null for new players
                secret: playerSecret,                                        // Will be null for new players
                peer: null, // Not needed for board request
                conn: null, // Not needed for board request
                activeConn: false,
                active: false,
            }
        };
      
          //const createBoardResponse = JSON.parse(await SendData("CreateBoard.php", newBoardData));
          const reply = await SendData("CreateBoard.php", newBoardData);
          const createBoardResponse = JSON.parse(reply);
          createBoardResponse.board.active = true
          console.log(createBoardResponse);
      
          setBoardData(createBoardResponse.board);
      
          setMyData(existingPlayerData => { return {...existingPlayerData, ...createBoardResponse.player}; });
      
          let cookieDate = new Date();
          cookieDate.setMonth(cookieDate.getMonth()+1);
          if(createBoardResponse.player.playerKey) { document.cookie = `playerKey=${createBoardResponse.player.playerKey}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
          if(createBoardResponse.player.secret)    { document.cookie = `playerSecret=${createBoardResponse.player.secret}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
    }

    function HandleWrapfieldChange(wrapBool:boolean) { HandleBoardChange("wrapfield",  wrapBool); }
    function HandleHintChange(hintBool:boolean)      { HandleBoardChange("hint",  hintBool); }
    function HandleSizeChange(size:number)           { HandleBoardChange("size",  size); }
    function HandleMinesChange(mines:number)         { HandleBoardChange("mines", mines); }

    function HandleBoardChange(field:string, value: number | boolean) {
        const boardNumberFields = [
            {type: "int",  name: "width"},
            {type: "int",  name: "height"},
            {type: "int",  name: "size"},
            {type: "int",  name: "mines"},
            {type: "bool", name: "wrapfield"},
            {type: "bool", name: "hint"}
        ];
        const updateField = boardNumberFields.find(element => element.name === field);
        if(updateField === undefined) { console.log("Error: unknown board field update."); return; }

        const newboardData = {...boardSettings};

        // The pre-TypeScript solution
        //newboardData[field] = value;

        switch (field) {
            case "size":
                if(typeof(value) !== "number") return;
                newboardData.height = value;
                newboardData.width = value;
                break;

            case "width":
                if(typeof(value) !== "number") return;
                newboardData.width = value;
                break;
        
            case "height":
                if(typeof(value) !== "number") return;
                newboardData.height = value;
                break;

            case "mines":
                if(typeof(value) !== "number") return;
                newboardData.mines = value;
                break;

            case "wrapfield":
                if(typeof(value) !== "boolean") return;
                newboardData.wrapfield = value;
                break;

            case "hint":
                if(typeof(value) !== "boolean") return;
                newboardData.hint = value;
                break;
        }

        setBoardSettings(newboardData);
        return;
    }

    useEffect(() => {
        const createGameElement = document.getElementById("CreateGame");
        if(!createGameElement) return;
        setHeight(createGameElement.getBoundingClientRect().height);
        setWidth(createGameElement.getBoundingClientRect().width);
    }, []);

    const maxMines = boardSettings.height*boardSettings.width -1 || 99;

    return (
        <div className={`WelcomeCard ${active === false ? "" : "Shrunk"}`} id="CreateGame">
        <span className='WelcomeHeader'>Create Game</span>
            <div className='WelcomeFields'>
                <span className='WelcomeSpan'>Size</span><input type="number" min={4} max={30} style={{width: "6ch"}} className='WelcomeInput' value={boardSettings.height} onChange={e => {const newSize = parseInt(e.target.value); HandleSizeChange(newSize)} }/>
                <span className='WelcomeSpan'>Mines</span><input type="number" min={2} max={maxMines} style={{width: "6ch"}} className='WelcomeInput' value={boardSettings.mines}  onChange={e => {const newMines = parseInt(e.target.value); HandleMinesChange(newMines)}}/>
                <span className='WelcomeSpan'>Wrapfield</span><label><input type="checkbox" data-value={boardSettings.wrapfield} onChange={e => HandleWrapfieldChange(e.target.checked)}/><img className='WelcomeCheckbox' alt={boardSettings.wrapfield ? "Wrapfield selected" : "Wrapfield not sellected"} src={boardSettings.wrapfield ? "Checkbox-Checked.svg" : "Checkbox-Unchecked.svg"}/></label>
                <span className='WelcomeSpan'>Hint</span><label><input type="checkbox" data-value={boardSettings.hint} onChange={e => HandleHintChange(e.target.checked)}/><img className='WelcomeCheckbox' alt={boardSettings.hint ? "Hint selected" : "Hint not sellected"} src={boardSettings.hint ? "Checkbox-Checked.svg" : "Checkbox-Unchecked.svg"}/></label>
            </div>
            <div className='WelcomeButton' onClick={CreateNewGame}>Create!</div>
        </div>
    );
}

export default CreateBoard;