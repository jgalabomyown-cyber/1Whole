import Icon from './Icon.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';

export default function Sidebar({ open, onClose }) {
  const { view, goToNotes, goToWorkspaces, goToWorkspace } = useAppContext();
  const handleLogout = () => signOut(auth).catch((err) => console.error('[Firebase] Logout failed:', err));
  return <div className={`sidebar-tray${open ? ' open' : ''}`} aria-hidden={!open}>
    <div className="sidebar-header"><span className="terminal-title">OP_CENTER_V1.0.0</span><button className="close-sidebar-btn" onClick={onClose}>×</button></div>
    <div className="sidebar-group"><div className="group-banner">01 // CORE_WORKSPACE</div>
      <button className={`sidebar-action-item ${view === 'workspaces' ? 'active' : ''}`} onClick={() => { goToWorkspaces(); onClose(); }}><Icon name="terminal" /> <span>$ workspaces</span>{view === 'workspaces' && <span className="badge-status online">ACTIVE</span>}</button>
      <button className={`sidebar-action-item notebook-manager-action ${view === 'notes' ? 'active' : ''}`} onClick={() => { goToNotes(); onClose(); }}><Icon name="journal-code" /> <span>$ note-manager</span>{view === 'notes' && <span className="badge-status online">ACTIVE</span>}</button>
    </div>
    {['02 // RECON_SCANNERS', '03 // EXPLOIT_STAGING', '04 // COMMUNICATIONS'].map((group) => <div className="sidebar-group" key={group}><div className="group-banner">{group}</div><button className="sidebar-action-item disabled"><Icon name="shield-lock" /> <span>$ module-locked</span><span className="badge-status locked">PHASE</span></button></div>)}
    <div className="sidebar-group sidebar-footer"><div className="group-banner">05 // ACCOUNT_CONTROL</div><button className="sidebar-action-item" onClick={() => { goToWorkspace(); onClose(); }}><Icon name="gear" /> <span>$ settings</span></button><button className="sidebar-action-item" onClick={() => { handleLogout(); onClose(); }}><Icon name="box-arrow-right" /> <span>$ logout</span></button></div>
  </div>;
}
