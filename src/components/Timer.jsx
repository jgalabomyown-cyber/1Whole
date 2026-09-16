import { useState } from 'react';
import Icon from './Icon.jsx';
import { useAppContext } from '../context/AppContext.jsx';

export default function Timer() {
  const { secondsLeft, isActive, mode, workDuration, toggleTimer, resetTimer, setTimerDuration } = useAppContext();
  const [minimized, setMinimized] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [minutes, setMinutes] = useState(workDuration / 60);

  const display = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const loadDuration = () => {
    setTimerDuration(minutes);
    setConfigOpen(false);
  };

  return <div className="timer-pod-wrapper">
    <div className={`timer-pod${minimized ? ' minimized' : ''}`}>
      <div className="timer-controls timer-controls-left">
        <button className="timer-ctrl-btn toggle-play-btn" aria-label="Toggle Session Play Pause" onClick={toggleTimer}><Icon name={isActive ? 'pause-fill' : 'play-fill'} /></button>
        <button className="timer-ctrl-btn reset-timer-btn" aria-label="Reset Countdown Sequence" onClick={resetTimer}><Icon name="arrow-clockwise" /></button>
      </div>
      <div className="timer-display-group"><span className="timer-countdown">{display}</span><span className="timer-subtext">{mode === 'break' ? 'BREAK_SESSION' : isActive ? 'SESSION_RUNNING' : 'SESSION_PAUSED'}</span></div>
      <div className="timer-controls timer-controls-right">
        <button className="timer-ctrl-btn config-timer-btn" aria-label="Open Timer Configuration Engine" onClick={() => setConfigOpen((value) => !value)}><Icon name="gear-fill" /></button>
        <button className="timer-ctrl-btn minimize-pod-btn" aria-label="Minimize Tactical Console Pod View" onClick={() => setMinimized((value) => !value)}><Icon name={minimized ? 'chevron-down' : 'chevron-up'} /></button>
      </div>
    </div>
    {configOpen && <div className="timer-config-panel show"><div className="config-header">SET_INTERVAL_MIN</div><div className="config-input-row"><input className="config-input" type="number" min="1" max="180" value={minutes} onChange={(event) => setMinutes(event.target.value)} /><button className="apply-config-btn" onClick={loadDuration}>LOAD</button></div></div>}
  </div>;
}
