import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

export const tracks = {
  'linux-fundamentals': {
    title: 'Linux Fundamentals',
    description: 'Deconstructing system architectures, privilege escalation scripts, and bash patterns.'
  },
  'network-recon-nmap': {
    title: 'Network Recon // Nmap',
    description: 'Mapping services, enumerating hosts, and interpreting reconnaissance results.'
  },
  'owasp-top-10-web': {
    title: 'OWASP Top 10 Web',
    description: 'Reviewing common web application risks and practical defensive testing patterns.'
  }
};

export const defaultNotes = [
  { id: 'linux-basics', track: 'linux-fundamentals', title: 'Command Line Notes', content: 'Useful commands and shell patterns.' }
];

const STORAGE_SAFE_LIMIT = 4 * 1024 * 1024;
const BREAK_SECONDS = 10 * 60;
const HEALTH_CHECK_SECONDS = 5 * 60;

function readRoute(pathname) {
  const workspaceMatch = pathname.match(/^\/workspace\/([^/]+)/);
  if (workspaceMatch) return { view: 'workspace', workspaceId: decodeURIComponent(workspaceMatch[1]) };
  if (pathname.endsWith('note.html') || pathname === '/notes') return { view: 'notes', workspaceId: null };
  if (pathname === '/workspaces') return { view: 'workspaces', workspaceId: null };
  if (pathname === '/profile') return { view: 'profile', workspaceId: null };
  return { view: 'workspace', workspaceId: 'linux-fundamentals' };
}

function notifyUser(title, body) {
  if (!('Notification' in window)) {
    window.alert(`${title}: ${body}`);
    return;
  }

  const showNotification = () => new window.Notification(title, { body });
  if (window.Notification.permission === 'granted') {
    showNotification();
  } else if (window.Notification.permission === 'default') {
    window.Notification.requestPermission().then((permission) => {
      if (permission === 'granted') showNotification();
    }).catch(() => undefined);
  }
}

export function useLocalStorage(key, initialValue, migrate = (value) => value) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved === null ? initialValue : migrate(JSON.parse(saved));
    } catch (err) {
      console.warn(`[useLocalStorage] Failed to read "${key}":`, err);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const serialized = JSON.stringify(value);
      const payloadSize = new TextEncoder().encode(serialized).length;
      if (payloadSize > STORAGE_SAFE_LIMIT) {
        throw new DOMException(`Storage payload for "${key}" exceeds the safe browser limit.`, 'QuotaExceededError');
      }
      window.localStorage.setItem(key, serialized);
    } catch (err) {
      console.error(`[useLocalStorage] Storage write failed for "${key}":`, err);
      window.dispatchEvent(new CustomEvent('onewhole:storage-error', {
        detail: { key, error: err }
      }));
    }
  }, [key, value]);

  return [value, setValue];
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [route, setRoute] = useState(() => readRoute(window.location.pathname));
  const [view, setView] = useState(() => readRoute(window.location.pathname).view);
  const [currentWorkspace, setCurrentWorkspace] = useState(() => readRoute(window.location.pathname).workspaceId || 'linux-fundamentals');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [activeTrack, setActiveTrack] = useState(() => readRoute(window.location.pathname).workspaceId || 'linux-fundamentals');
  const [searchTerm, setSearchTerm] = useState('');
  const [workspaceData, setWorkspaceData] = useLocalStorage('onewhole-workspaces', {});
  const [workspaceNotes, setWorkspaceNotes] = useLocalStorage('workspace_notes', {});
  const [legacyNotes, setLegacyNotes] = useLocalStorage('onewhole-notebooks', []);
  const workspaceSnapshot = workspaceData[currentWorkspace] || {};
  const [scratch, setScratch] = useState(workspaceSnapshot.scratch || '');
  const [workDuration, setWorkDuration] = useState(workspaceSnapshot.workDuration || 1200);
  const [secondsLeft, setSecondsLeft] = useState(workspaceSnapshot.secondsLeft || workspaceSnapshot.workDuration || 1200);
  const [isActive, setIsActive] = useState(Boolean(workspaceSnapshot.isActive));
  const [mode, setMode] = useState(workspaceSnapshot.mode || 'work');
  const workspaceStateRef = useRef({ scratch, workDuration, secondsLeft, isActive, mode });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [remoteTracks, setRemoteTracks] = useState({});
  const [savedTracks, setSavedTracks] = useLocalStorage('onewhole-tracks', {});
  const trackCatalog = { ...tracks, ...remoteTracks, ...savedTracks };
  const currentWorkspaceNotes = [
    ...(workspaceNotes[currentWorkspace] || []),
    ...(Array.isArray(legacyNotes) ? legacyNotes.filter((note) => note?.track === currentWorkspace) : [])
  ].filter((note, index, notes) => notes.findIndex((item) => item.id === note.id) === index);
  workspaceStateRef.current = { scratch, workDuration, secondsLeft, isActive, mode };

  useEffect(() => {
    const handlePopState = () => {
      saveWorkspaceSnapshot();
      const nextRoute = readRoute(window.location.pathname);
      setRoute(nextRoute);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      window.history.replaceState({}, '', `/workspace/${encodeURIComponent(currentWorkspace)}`);
    }
  }, []);

  useEffect(() => {
    setView(route.view);
    if (route.workspaceId) {
      if (route.workspaceId !== currentWorkspace) setWorkspaceLoading(true);
      setCurrentWorkspace(route.workspaceId);
      setActiveTrack(route.workspaceId);
    }
  }, [route, currentWorkspace]);

  useEffect(() => {
    if (!currentWorkspace) return;
    const snapshot = workspaceData[currentWorkspace] || {};
    setScratch(snapshot.scratch || '');
    setWorkDuration(snapshot.workDuration || 1200);
    setSecondsLeft(snapshot.secondsLeft || snapshot.workDuration || 1200);
    setIsActive(Boolean(snapshot.isActive));
    setMode(snapshot.mode || 'work');
    setWorkspaceLoading(false);
  }, [currentWorkspace]);

  const saveWorkspaceSnapshot = (workspaceId = currentWorkspace) => {
    if (!workspaceId) return;
    setWorkspaceData((items) => ({
      ...items,
      [workspaceId]: workspaceStateRef.current
    }));
  };

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoute(readRoute(path));
  };

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((remaining) => {
        if (remaining > 1) return remaining - 1;

        if (mode === 'work') {
          notifyUser('Work session complete', 'Time for a 10-minute break.');
          setMode('break');
          return BREAK_SECONDS;
        }

        notifyUser('Break complete', 'Your next Work session is starting.');
        setMode('work');
        return workDuration;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isActive, mode, workDuration]);

  useEffect(() => {
    if (!isActive || mode !== 'work') return undefined;

    const interval = window.setInterval(() => {
      notifyUser('Health Check', 'Take a sip of water and check your posture.');
    }, HEALTH_CHECK_SECONDS * 1000);

    return () => window.clearInterval(interval);
  }, [isActive, mode]);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setCurrentUser(nextUser);
    setAuthLoading(false);
  }), []);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return undefined;
    }

    let cancelled = false;
    getDoc(doc(db, 'users', currentUser.uid))
      .then((snapshot) => {
        if (cancelled) return;
        const profile = snapshot.exists() ? snapshot.data() : null;
        setUserProfile(profile);
        if (!currentUser.displayName && profile?.alias) {
          updateProfile(currentUser, { displayName: profile.alias }).catch((err) => {
            console.warn('[Firebase] Failed to sync profile alias:', err);
          });
        }
      })
      .catch((err) => console.warn('[Firebase] Failed to load user profile:', err));

    return () => { cancelled = true; };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, 'tracks'))
      .then((snapshot) => {
        if (cancelled) return;
        const nextTracks = {};
        snapshot.forEach((item) => {
          const track = item.data();
          nextTracks[track.id || item.id] = track;
        });
        setRemoteTracks(nextTracks);
      })
      .catch((err) => console.warn('[Firebase] Failed to load tracks:', err));

    return () => { cancelled = true; };
  }, []);

  const updateTrackCatalog = (update) => {
    setSavedTracks((saved) => {
      const current = { ...tracks, ...saved };
      const next = typeof update === 'function' ? update(current) : update;
      return Object.fromEntries(Object.entries(next).filter(([id]) => !tracks[id]));
    });
  };

  const switchWorkspace = (workspaceId) => {
    if (!workspaceId || (workspaceId === currentWorkspace && view === 'workspace')) return;
    saveWorkspaceSnapshot();
    navigate(`/workspace/${encodeURIComponent(workspaceId)}`);
  };
  const goToWorkspace = () => navigate(`/workspace/${encodeURIComponent(currentWorkspace)}`);
  const goToWorkspaces = () => { saveWorkspaceSnapshot(); navigate('/workspaces'); };
  const goToNotes = () => { saveWorkspaceSnapshot(); navigate('/notes'); };
  const goToProfile = () => { saveWorkspaceSnapshot(); navigate('/profile'); };
  const toggleTimer = () => setIsActive((active) => !active);
  const resetTimer = () => {
    setIsActive(false);
    setMode('work');
    setSecondsLeft(workDuration);
  };
  const setTimerDuration = (minutes) => {
    const nextDuration = Math.min(180, Math.max(1, Number(minutes) || 20)) * 60;
    setWorkDuration(nextDuration);
    setMode('work');
    setSecondsLeft(nextDuration);
    setIsActive(false);
  };
  const updateScratch = (value) => {
    setScratch(value);
    setWorkspaceData((items) => ({ ...items, [currentWorkspace]: { ...(items[currentWorkspace] || {}), scratch: value } }));
  };

  const addWorkspaceNote = ({ title, content }) => {
    const note = {
      id: `workspace-note-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      workspaceId: currentWorkspace,
      createdAt: new Date().toISOString()
    };
    setWorkspaceNotes((items) => ({
      ...items,
      [currentWorkspace]: [...(items[currentWorkspace] || []), note]
    }));
  };

  const removeWorkspaceNote = (noteId) => {
    setWorkspaceNotes((items) => ({
      ...items,
      [currentWorkspace]: (items[currentWorkspace] || []).filter((note) => note.id !== noteId)
    }));
  };

  const updateWorkspaceNote = (noteId, changes) => {
    if ((workspaceNotes[currentWorkspace] || []).some((note) => note.id === noteId)) {
      setWorkspaceNotes((items) => ({
        ...items,
        [currentWorkspace]: (items[currentWorkspace] || []).map((note) => note.id === noteId ? { ...note, ...changes } : note)
      }));
      return;
    }

    setLegacyNotes((items) => Array.isArray(items)
      ? items.map((note) => note.id === noteId ? { ...note, ...changes } : note)
      : items);
  };

  return <AppContext.Provider value={{
    view,
    setView,
    currentWorkspace,
    currentWorkspaceId: currentWorkspace,
    workspaceLoading,
    switchWorkspace,
    activeTrack,
    setActiveTrack,
    searchTerm,
    setSearchTerm,
    scratch,
    setScratch: updateScratch,
    workspaceNotes: currentWorkspaceNotes,
    addWorkspaceNote,
    removeWorkspaceNote,
    updateWorkspaceNote,
    secondsLeft,
    isActive,
    mode,
    workDuration,
    toggleTimer,
    resetTimer,
    setTimerDuration,
    user,
    authLoading,
    currentUser,
    userProfile,
    trackCatalog,
    updateTrackCatalog,
    goToWorkspace,
    goToWorkspaces,
    goToNotes,
    goToProfile
  }}>
    {children}
  </AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used inside AppProvider');
  return context;
}
