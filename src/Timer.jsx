import React, { useState, useEffect } from "react";

function Timer(props) {
  const [elapsedTime, setElapsedTime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      const start = props.start;
      const end = props.end;
      setElapsedTime(Math.floor((start ? (end ? end - start : Date.now() - start) : 0)/1000));
    }, 100);
    return () => clearInterval(interval);
  });

  // If it's more than an hour, then minutes should have a leading zero
  const seconds = ("00" + (elapsedTime%60)).slice(-2);
  const minutes = (elapsedTime>= 3600 ? ("00" + Math.floor(elapsedTime/60)%60).slice(-2) : Math.floor(elapsedTime/60)%60) + ":";
  const hours   =  elapsedTime>= 3600 ? Math.floor(elapsedTime/3600) + ":" : "";

  return(
    <span className="Timer">{hours+minutes+seconds}</span>
  )
}

export default Timer;