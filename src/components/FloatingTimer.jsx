import { useAppContext } from '../context/AppContext.jsx';

export default function FloatingTimer() {
  const { secondsLeft, isActive, mode, toggleTimer, resetTimer } = useAppContext();
  if (!isActive) return null;

  const display = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return <div className="floating-timer" aria-label={`${mode} timer, ${display} remaining`}>
    <span className="floating-timer-mode">{mode === 'break' ? 'BREAK' : 'WORK'}</span>
    <strong>{display}</strong>
    <button type="button" onClick={toggleTimer} aria-label="Pause timer">||</button>
    <button type="button" onClick={resetTimer} aria-label="Reset timer">↻</button>
  </div>;
}