import { useState } from 'react';
import { AppProvider, useAppContext, useLocalStorage } from './context/AppContext.jsx';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Timer from './components/Timer.jsx';
import Workspace from './components/Workspace.jsx';
import NotebookManager, { RichTextEditor } from './components/RichNotebookManager.jsx';
import Icon from './components/Icon.jsx';

function AppShell() {
  const { view } = useAppContext();
  const [sidebar, setSidebar] = useState(false);
  const [scratchpad, setScratchpad] = useState(false);
  const [scratch, setScratch] = useLocalStorage('onewhole-notebook', '');

  return <>
    <Header onSidebar={() => setSidebar(true)} />
    <Sidebar open={sidebar} onClose={() => setSidebar(false)} />
    {view === 'workspace' && <><Timer /><Workspace onOpenScratch={() => setScratchpad(true)} /></>}
    {view === 'notes' && <NotebookManager />}
    {scratchpad && <div className="notebook-modal-overlay show" onClick={(event) => event.target === event.currentTarget && setScratchpad(false)}><div className="notebook-modal"><div className="modal-header"><div className="modal-title"><Icon name="journal-text" /> OPERATIONAL_JOURNAL.md</div><button className="close-modal-btn" aria-label="Close operational journal" onClick={() => setScratchpad(false)}>×</button></div><div className="modal-body"><RichTextEditor value={scratch} onChange={setScratch} /></div></div></div>}
  </>;
}

export default function App() {
  return <AppProvider><AppShell /></AppProvider>;
}
