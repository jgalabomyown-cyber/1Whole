import Icon from './Icon.jsx';
import { useAppContext } from '../context/AppContext.jsx';

export default function WorkspacesPage() {
  const { trackCatalog, currentWorkspace, switchWorkspace } = useAppContext();

  return <main className="workspaces-page">
    <section className="workspaces-shell">
      <div className="page-kicker">CORE_WORKSPACE // SELECT_CONTEXT</div>
      <h1>Workspaces</h1>
      <p className="workspaces-intro">Choose a study environment to continue where you left off.</p>
      <div className="workspace-card-grid">
        {Object.entries(trackCatalog).map(([workspaceId, workspace]) => <button className={`workspace-card${currentWorkspace === workspaceId ? ' active' : ''}`} key={workspaceId} onClick={() => switchWorkspace(workspaceId)}>
          <span className="workspace-card-icon"><Icon name="terminal" /></span>
          <span className="workspace-card-content"><strong>{workspace.title || workspaceId}</strong><span>$ {workspaceId}</span><small>{workspace.description || 'Study workspace'}</small></span>
          {currentWorkspace === workspaceId && <span className="workspace-card-status">CURRENT</span>}
        </button>)}
      </div>
    </section>
  </main>;
}