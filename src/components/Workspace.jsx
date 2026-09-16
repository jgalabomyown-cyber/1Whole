import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { tracks, useAppContext } from '../context/AppContext.jsx';

function AiTerminal({ open, onToggle }) {
  const [chatHistory, setChatHistory] = useState([{ id: 'system', role: 'system', text: '> AI Core online. Standing by for payload syntax breakdown...' }]);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const responseTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(responseTimer.current), []);

  const submitQuery = (event) => {
    event.preventDefault();
    const prompt = query.trim();
    if (!prompt) return;
    setChatHistory((messages) => [...messages, { id: `${Date.now()}-user`, role: 'user', text: `$ ${prompt}` }]);
    setQuery('');
    setTyping(true);
    responseTimer.current = window.setTimeout(() => {
      setChatHistory((messages) => [...messages, { id: `${Date.now()}-assistant`, role: 'assistant', text: `> Analysis complete: ${prompt}` }]);
      setTyping(false);
    }, 700);
  };

  return <>
    <section className={`pane ai-terminal-pane${open ? ' active' : ''}`}><div className="pane-header"><Icon name="cpu" /> <span>SEC_OPS_AI_COPILOT</span><button className="ai-close-btn" aria-label="Close AI copilot" onClick={onToggle}>×</button></div><div className="pane-content"><div className="ai-chat-log" aria-live="polite">{chatHistory.map((message) => <div className={`ai-message ${message.role}`} key={message.id}>{message.text}</div>)}{typing && <div className="ai-message assistant ai-typing">&gt; AI is processing...</div>}</div><form className="ai-terminal-form" onSubmit={submitQuery}><input className="ai-terminal-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="$ query_copilot --analyze-logs..." aria-label="Ask AI copilot" /></form></div></section>
    <button className="floating-ai-fab" aria-label={open ? 'Close AI copilot' : 'Open AI copilot'} onClick={onToggle}><Icon name={open ? 'x-lg' : 'cpu'} /></button>
  </>;
}

export default function Workspace({ onOpenScratch }) {
  const { activeTrack, trackCatalog } = useAppContext();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const fileInput = useRef(null);
  const objectUrlRef = useRef('');
  const detail = trackCatalog[activeTrack] || tracks['linux-fundamentals'];
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);
  const openUrl = (target) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setText('');
    setMediaUrl('');
    setMediaType('external');
    setUrl(target);
  };
  const loadFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUrl(`local://ingested_artifacts/${file.name}`);
    setText('');
    setMediaUrl('');
    setMediaType(file.type);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setMediaUrl(objectUrl);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(file);
  };
  return <main className="cyber-workspace-grid"><div className="left-pane-column"><section className="pane study-space-pane"><div className="pane-header"><Icon name="terminal-split" /> <span>WORKSPACE_CONTEXT</span></div><div className="pane-content"><h2 className="track-title-display">{detail.title}</h2><p className="track-desc">{detail.description}</p><div className="helpful-links-section"><h3>RECON & TARGET LABS</h3><ul className="cyber-links-list"><li><button className="media-router-btn" onClick={() => openUrl('https://linuxjourney.com')}><Icon name="link-45deg" /> $ cat linux_journey.web</button></li><li><button className="media-router-btn" onClick={() => openUrl('https://github.io')}><Icon name="link-45deg" /> $ cat gtfobins_privesc.web</button></li></ul></div></div></section><AiTerminal open={aiOpen} onToggle={() => setAiOpen((value) => !value)} /></div><section className="pane right-media-pane"><div className="pane-header media-header-controls"><div className="header-left-title"><Icon name="globe" /> <span>INTEGRATED_MEDIA_CANVAS</span></div><label className="media-action-label"><Icon name="file-earmark-arrow-up" /> INGEST_MEDIA<input ref={fileInput} type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={loadFile} hidden /></label></div><div className="browser-address-bar"><button className="browser-nav-btn" onClick={() => window.history.back()}><Icon name="arrow-left" /></button><button className="browser-nav-btn" onClick={() => window.location.reload()}><Icon name="arrow-clockwise" /></button><div className="current-url-display">{url || 'session://media_canvas_sandbox'}</div></div><div className="pane-content media-display-area">{text ? <div className="text-document-viewer">{text}</div> : mediaUrl ? <iframe className="media-frame-viewport" src={mediaUrl} title={mediaType === 'application/pdf' ? 'PDF document preview' : 'Media canvas'} /> : url ? <iframe className="media-frame-viewport" src={url} title="Media canvas" /> : <div className="media-fallback-placeholder"><Icon name="browser-safari" /><p>No active media frame or target spawned. Load a reference target from your workspace links or upload a local documentation artifact above.</p></div>}</div></section><button className="floating-notebook-fab" aria-label="Open scratchpad" onClick={onOpenScratch}><Icon name="journal-code" /></button></main>;
}
