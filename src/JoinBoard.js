import { useEffect, useState } from 'react';
import './index.css';
import WelcomeField from './WelcomeField';
import GetCookie from './GetCookie';

function JoinBoard(props) {
    const [height, setHeight] = useState(null);
    const [width,  setWidth] = useState(null);
    const [boardCode, setBoardCode] = useState(GetCookie("code") || new URLSearchParams(window.location.search).get('code') || "");
    function HandleCodeChange(value) {
        value = value.replace(/[^0-9A-Za-z]+/gi,"");
        setBoardCode(value);
    }

    function JoinNewGame() {
        props.JoinGame(boardCode);
    }

    useEffect(() => {
        setHeight(document.getElementById("JoinGame").getBoundingClientRect().height);
        setWidth(document.getElementById("JoinGame").getBoundingClientRect().width);
    }, []);

    return (
        <div className={`WelcomeCard ${props.state === "welcome" ? "" : "Shrunk"}`} id="JoinGame" style={{height: (props.state === "welcome" ? height : 0), width: (props.state === "welcome" ? width : 0)}}>
            <span className='WelcomeHeader'>Join Game</span>
            <div className='WelcomeFields'>
                <WelcomeField id="JoinGameBoardCode" text="Game code" maxLength={10}  value={boardCode} UpdateFunction={HandleCodeChange}/>
            </div>
            <div className='WelcomeButton' onClick={JoinNewGame}>Join!</div>
        </div>
    );
  }
  
  export default JoinBoard;
  