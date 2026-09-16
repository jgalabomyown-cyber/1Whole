import { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext.jsx';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Timer from './components/Timer.jsx';
import Workspace from './components/Workspace.jsx';
import NotebookManager from './components/RichNotebookManager.jsx';
import LandingPage from './components/LandingPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import FloatingTimer from './components/FloatingTimer.jsx';
import FloatingNotebook from './components/FloatingNotebook.jsx';
import WorkspacesPage from './components/WorkspacesPage.jsx';

function AppShell() {
  const { view, user, authLoading, workspaceLoading } = useAppContext();
  const [sidebar, setSidebar] = useState(false);

  if (authLoading) {
    return <main className="auth-loading" aria-live="polite">AUTHENTICATING...</main>;
  }

  if (!user) return <LandingPage />;

  if (workspaceLoading) {
    return <main className="workspace-transition" aria-live="polite">LOADING_WORKSPACE...</main>;
  }

  return <>
    <Header onSidebar={() => setSidebar(true)} />
    <Sidebar open={sidebar} onClose={() => setSidebar(false)} />
    {view === 'workspace' && <><Timer /><Workspace /></>}
    {view === 'workspaces' && <WorkspacesPage />}
    {view === 'notes' && <NotebookManager />}
    {view === 'profile' && <ProfilePage />}
    {view !== 'workspace' && <FloatingTimer />}
    {view === 'workspace' && <FloatingNotebook />}
  </>;
}

export default function App() {
  return <AppProvider><AppShell /></AppProvider>;
}
