import './index.css';
import {useEffect, useState } from 'react';

function CreateBoard(props) {
    const [boardSettings, setBoardSettings] = useState({width: 10, height: 10, mines: 15, private: false, active: false, wrapfield: false, hint:true});

    // Size of the component, not the gameboard size. CSS won't animate from "auto".
    const [height, setHeight] = useState(null);
    const [width,  setWidth] = useState(null);

    function CreateNewGame() {
        if(boardSettings.width  === ""  || boardSettings.width  < 4 || boardSettings.width  > 30) { return; }
        if(boardSettings.height === ""  || boardSettings.height < 4 || boardSettings.height > 30) { return; }
        if(boardSettings.mines  === ""  || boardSettings.mines  < 3 || boardSettings.mines  >= boardSettings.width*boardSettings.height) { return; }
        props.GenerateBoard(boardSettings);
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
        <div className={`WelcomeCard ${props.state === "welcome" ? "" : "Shrunk"}`} id="CreateGame" style={{height: (props.state === "welcome" ? height : 0), width: (props.state === "welcome" ? width : 0)}}>
        <span className='WelcomeHeader'>Create Game</span>
            <div className='WelcomeFields'>
                <span className='WelcomeSpan'>Size</span><input type="number" min={4} max={30}                                          style={{width: "6ch"}} className='WelcomeInput' value={boardSettings.height} onChange={e => HandleSizeChange(e.target.value)}/>
                <span className='WelcomeSpan'>Mines</span><input type="number" min={2} max={maxMines} style={{width: "6ch"}} className='WelcomeInput' value={boardSettings.mines}  onChange={e => HandleMinesChange(e.target.value)}/>
                <span className='WelcomeSpan'>Wrapfield</span><input type="checkbox" value={boardSettings.wrapfield} onChange={e => HandleWrapfieldChange(e.target.checked)}/>
                <span className='WelcomeSpan'>Hint</span><input type="checkbox" value={boardSettings.hint} onChange={e => HandleHintChange(e.target.checked)}/>
            </div>
            <div className='WelcomeButton' onClick={CreateNewGame}>Create!</div>
        </div>
    );
}

export default CreateBoard;