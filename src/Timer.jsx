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

  return(
    <span className="Timer">{`${Math.floor(elapsedTime/60)}:${("00" + (elapsedTime%60)).slice(-2)}`}</span>
  )
}

export default Timer;