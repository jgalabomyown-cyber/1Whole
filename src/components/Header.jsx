import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { useAppContext } from '../context/AppContext.jsx';

export default function Header({ onSidebar }) {
  const { activeTrack, setActiveTrack, trackCatalog, goToNotes, goToWorkspace, searchTerm, setSearchTerm } = useAppContext();
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [trackOpen, setTrackOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioState, setAudioState] = useState('[OFF]');
  const audio = useRef(new Audio());
  const debouncedSearch = useRef(null);

  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  useEffect(() => () => {
    if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
  }, []);

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;
    setSearchInput(nextValue);
    if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
    debouncedSearch.current = setTimeout(() => {
      setSearchTerm(nextValue);
    }, 200);
  };

  const clearSearch = () => {
    if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
    setSearchInput('');
    setSearchTerm('');
  };

  const trackVisible = (id) => {
    const query = (searchTerm || '').trim().toLowerCase();
    const trackName = (trackCatalog[id]?.title || id).toLowerCase();
    return !query || id.toLowerCase().includes(query) || trackName.includes(query);
  };

  const playAudio = (name) => {
    audio.current.src = `music/${name}.mp3`;
    audio.current.loop = true;
    audio.current.play().then(() => setAudioState('[ON]')).catch(() => setAudioState('[ADD FILE]'));
    setAudioOpen(false);
  };

  return <header><nav className="top-nav">
    <div className="left-top-nav"><button className="menu-btn" aria-label="Open command sidebar" onClick={onSidebar}>☰</button><button className="logo logo-link" onClick={goToWorkspace} aria-label="Go to Study Room"><span className="logo-full">1Whole</span><span className="logo-mobile">1W</span></button></div>
    <div className="center-top-nav"><div className="search-container"><input className="search-bar" type="text" placeholder="Search your archive" value={searchInput} onChange={handleSearchChange} /><button className="search-btn" aria-label="Search" onClick={() => setSearchTerm(searchInput)}><Icon name="search" /></button>{searchInput && <button className="search-clear-btn" type="button" aria-label="Clear search" onClick={clearSearch}>×</button>}</div>
      <div className="study-resources"><div className="tracks"><button className="track-dropdown-btn track-icon-btn" aria-label="Choose track" title="Choose track" onClick={() => { setTrackOpen((value) => !value); setAudioOpen(false); }}><Icon name="terminal" /> <Icon name="chevron-down" /><span className="track-label-mobile"> $ {activeTrack}</span></button>{trackOpen && <div className="track-menu-options show">{Object.keys(trackCatalog).filter(trackVisible).map((id) => <button className="track-item" key={id} onClick={() => { setActiveTrack(id); setTrackOpen(false); }}>$ {id}</button>)}</div>}</div><button className="notebooks-menu" onClick={goToNotes}><Icon name="journal-text" /><span className="notebooks-label">Notebooks</span></button></div>
    </div>
    <div className="nav-settings"><div className="study-audio"><button className="audio-menu-btn" onClick={() => { setAudioOpen((value) => !value); setTrackOpen(false); }}><Icon name="music-note-beamed" /> <span className="audio-label">Ambience ▾</span> <span className="audio-status">{audioState}</span></button>{audioOpen && <div className="audio-dropdown-menu show"><div className="audio-header">SELECT FREQUENCY</div>{['lofi', 'binaural', 'whitenoise'].map((name) => <button className="audio-track-item" key={name} onClick={() => playAudio(name)}>$ play {name === 'whitenoise' ? 'white-noise' : `${name}-beats`}</button>)}</div>}</div><div className="user-profile-block"><div className="profile-details"><span className="profile-alias">root_operator</span><span className="profile-email">sec-ops@onewhole.local</span></div><div className="avatar-wrapper"><img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces" alt="Operator Avatar" className="profile-avatar" /></div></div></div>
  </nav></header>;
}
