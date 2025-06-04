import React, { useState } from 'react';
import './index.css';

function TouchToggle(props) {
  const [flagging, setflagging] = useState(false);
  function ToggleFlagging(){
    setflagging(!flagging);
  }
  const touchElement = <div id='TouchToggle' className={`TouchToggle ${flagging ? "ToggleFlagging" : "ToggleClearing"}`} onClick={ToggleFlagging} flagging={flagging ? "on" : "off"}>{flagging ? "Flagging 🚩" : "Clearing ⛏️"}</div>;
  return (touchElement);
}

export default TouchToggle;
