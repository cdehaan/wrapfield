import './index.css';

function WelcomeArt(props) {
    return (
      <div className={`WelcomeArt ${props.state === "welcome" ? "" : "Shrunk"}`}>Welcome (art)!</div>
    );
  }
  
  export default WelcomeArt;
  