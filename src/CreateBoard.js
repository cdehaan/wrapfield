import './index.css';
import React, { useEffect, useState } from 'react';
import GetCookie from './GetCookie';
import SendData from './SendData';

function CreateBoard(props) {
    const showCreateGame = new URLSearchParams(window.location.search).get('code') === null;
    if(showCreateGame === false) { return null }

    const myData = props.myData
    const setMyData = props.setMyData
    const setBoardData = props.setBoardData
    const [boardSettings, setBoardSettings] = useState({width: 10, height: 10, mines: 15, private: false, active: false, wrapfield: false, hint:true});

    // Size of the component, not the gameboard size. CSS won't animate from "auto".
    const [height, setHeight] = useState(null);
    const [width,  setWidth] = useState(null);

    async function CreateNewGame() {
        if(boardSettings.width  === ""  || boardSettings.width  < 4 || boardSettings.width  > 30) { return; }
        if(boardSettings.height === ""  || boardSettings.height < 4 || boardSettings.height > 30) { return; }
        if(boardSettings.mines  === ""  || boardSettings.mines  < 3 || boardSettings.mines  >= boardSettings.width*boardSettings.height) { return; }


        // If Peerjs is still connecting, try again in a little while
        if(myData.peerId === null) {
            setTimeout(() => {
                CreateNewGame();
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
          createBoardResponse.board.active = true
          console.log(createBoardResponse);
      
          setBoardData(createBoardResponse.board);
      
          setMyData(existingPlayerData => { return {...existingPlayerData, ...createBoardResponse.player}; });
      
          let cookieDate = new Date();
          cookieDate.setMonth(cookieDate.getMonth()+1);
          if(createBoardResponse.player.playerKey) { document.cookie = `playerKey=${createBoardResponse.player.playerKey}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
          if(createBoardResponse.player.secret)    { document.cookie = `playerSecret=${createBoardResponse.player.secret}; samesite=lax; expires=${cookieDate.toUTCString()}`; }
    }

    function HandleWrapfieldChange(wrapBool) { HandleBoardChange("wrapfield",  wrapBool); }
    function HandleHintChange(hintBool)      { HandleBoardChange("hint",  hintBool); }
    function HandleSizeChange(size)          { HandleBoardChange("size",  size); }
    function HandleMinesChange(mines)        { HandleBoardChange("mines", mines); }

    function HandleBoardChange(field, value) {
        const boardNumberFields = [
            {type: "int",  name: "width"},
            {type: "int",  name: "height"},
            {type: "int",  name: "size"},
            {type: "int",  name: "mines"},
            {type: "bool", name: "wrapfield"},
            {type: "bool", name: "hint"}
        ];
        const updateField = boardNumberFields.find(element => element.name === field);
        if(updateField === undefined) { console("Error: unknown board field update."); return; }

        const newboardData = {...boardSettings};

        if(updateField.type === "int") {
            value = parseInt(value) || null;
            if(field === "size") {
                newboardData.height = value;
                newboardData.width = value;
            } else {
                newboardData[field] = value;
            }    
            setBoardSettings(newboardData);
            return;
        }

        if(updateField.type === "bool") {
            newboardData[field] = value;
            setBoardSettings(newboardData);
            return;
        }
    }

    useEffect(() => {
        setHeight(document.getElementById("CreateGame").getBoundingClientRect().height);
        setWidth(document.getElementById("CreateGame").getBoundingClientRect().width);
    }, []);

    const maxMines = boardSettings.height*boardSettings.width -1 || 99;

    return (
        <div className={`WelcomeCard ${props.active === false ? "" : "Shrunk"}`} id="CreateGame" style={{height: (props.active === false ? height : 0), width: (props.active === false ? width : 0)}}>
        <span className='WelcomeHeader'>Create Game</span>
            <div className='WelcomeFields'>
                <span className='WelcomeSpan'>Size</span><input type="number" min={4} max={30}                                          style={{width: "6ch"}} className='WelcomeInput' value={boardSettings.height} onChange={e => HandleSizeChange(e.target.value)}/>
                <span className='WelcomeSpan'>Mines</span><input type="number" min={2} max={maxMines} style={{width: "6ch"}} className='WelcomeInput' value={boardSettings.mines}  onChange={e => HandleMinesChange(e.target.value)}/>
                <span className='WelcomeSpan'>Wrapfield</span><label><input type="checkbox" value={boardSettings.wrapfield} onChange={e => HandleWrapfieldChange(e.target.checked)}/><img className='WelcomeCheckbox' alt={boardSettings.wrapfield ? "Wrapfield selected" : "Wrapfield not sellected"} src={boardSettings.wrapfield ? "Checkbox-Checked.svg" : "Checkbox-Unchecked.svg"}/></label>
                <span className='WelcomeSpan'>Hint</span><label><input type="checkbox" value={boardSettings.hint} onChange={e => HandleHintChange(e.target.checked)}/><img className='WelcomeCheckbox' alt={boardSettings.hint ? "Hint selected" : "Hint not sellected"} src={boardSettings.hint ? "Checkbox-Checked.svg" : "Checkbox-Unchecked.svg"}/></label>
            </div>
            <div className='WelcomeButton' onClick={CreateNewGame}>Create!</div>
        </div>
    );
}

export default CreateBoard;