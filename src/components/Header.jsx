import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { getDownloadURL, ref } from 'firebase/storage';
import Icon from './Icon.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import { auth, storage } from '../firebase.js';

export default function Header({ onSidebar }) {
  const { activeTrack, setActiveTrack, trackCatalog, goToNotes, goToWorkspace, searchTerm, setSearchTerm, user, userProfile } = useAppContext();
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [trackOpen, setTrackOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const handleLogout = () => signOut(auth).catch((err) => console.error('[Firebase] Logout failed:', err));

  const toggleProfile = () => {
    setProfileOpen((value) => !value);
    setTrackOpen(false);
    setAudioOpen(false);
  };

  const trackVisible = (id) => {
    const query = (searchTerm || '').trim().toLowerCase();
    const trackName = (trackCatalog[id]?.title || id).toLowerCase();
    return !query || id.toLowerCase().includes(query) || trackName.includes(query);
  };

  const playAudio = (name) => {
    const loadAudio = user
      ? getDownloadURL(ref(storage, `music/${name}.mp3`))
      : Promise.reject(new Error('Authentication required'));

    loadAudio.then((url) => {
      audio.current.src = url;
      audio.current.loop = true;
      return audio.current.play();
    }).then(() => setAudioState('[ON]')).catch(() => setAudioState('[SIGN IN]'));
    setAudioOpen(false);
  };

  return <header><nav className="top-nav">
    <div className="left-top-nav"><button className="menu-btn" aria-label="Open command sidebar" onClick={onSidebar}>☰</button><button className="logo logo-link" onClick={goToWorkspace} aria-label="Go to Study Room"><span className="logo-full">1Whole</span><span className="logo-mobile">1W</span></button></div>
    <div className="center-top-nav"><div className="search-container"><input className="search-bar" type="text" placeholder="Search your archive" value={searchInput} onChange={handleSearchChange} /><button className="search-btn" aria-label="Search" onClick={() => setSearchTerm(searchInput)}><Icon name="search" /></button>{searchInput && <button className="search-clear-btn" type="button" aria-label="Clear search" onClick={clearSearch}>×</button>}</div>
      <div className="study-resources"><div className="tracks"><button className="track-dropdown-btn track-icon-btn" aria-label="Choose track" title="Choose track" onClick={() => { setTrackOpen((value) => !value); setAudioOpen(false); }}><Icon name="terminal" /> <Icon name="chevron-down" /><span className="track-label-mobile"> $ {activeTrack}</span></button>{trackOpen && <div className="track-menu-options show">{Object.keys(trackCatalog).filter(trackVisible).map((id) => <button className="track-item" key={id} onClick={() => { setActiveTrack(id); setTrackOpen(false); }}>$ {id}</button>)}</div>}</div><button className="notebooks-menu" onClick={goToNotes}><Icon name="journal-text" /><span className="notebooks-label">Notebooks</span></button></div>
    </div>
    <div className="nav-settings"><div className="study-audio"><button className="audio-menu-btn" onClick={() => { setAudioOpen((value) => !value); setTrackOpen(false); setProfileOpen(false); }}><Icon name="music-note-beamed" /> <span className="audio-label">Ambience ▾</span> <span className="audio-status">{audioState}</span></button>{audioOpen && <div className="audio-dropdown-menu show"><div className="audio-header">SELECT FREQUENCY</div>{['lofi', 'binaural', 'whitenoise'].map((name) => <button className="audio-track-item" key={name} onClick={() => playAudio(name)}>$ play {name === 'whitenoise' ? 'white-noise' : `${name}-beats`}</button>)}</div>}</div><div className="user-profile-block" onClick={toggleProfile} role="button" tabIndex="0" aria-expanded={profileOpen} aria-haspopup="menu" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleProfile(); } }}><div className="profile-details"><span className="profile-alias">{userProfile?.alias || user?.displayName || 'Authenticated user'}</span><span className="profile-email">{user?.email}</span></div><div className="avatar-wrapper"><img src={user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces'} alt="Operator Avatar" className="profile-avatar" /></div>{profileOpen && <div className="profile-dropdown-menu" role="menu" onClick={(event) => event.stopPropagation()}><button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setProfileOpen(false); goToWorkspace(); }}>Settings</button><button type="button" role="menuitem" onClick={(event) => event.stopPropagation()}>Profile</button><button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); handleLogout(); }}>Logout</button></div>}</div></div>
  </nav></header>;
}
