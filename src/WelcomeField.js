import './index.css';

function WelcomeField(props) {
    return(
        <>
            <span className='WelcomeSpan'>{props.text}</span>
            <input type="text" maxLength={props.maxLength} style={{width: `${props.maxLength+1}ch`}} className='WelcomeInput' value={props.value} onChange={e => props.UpdateFunction(e.target.value)}/>
        </>
    );
}

export default WelcomeField;