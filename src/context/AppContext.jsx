import { createContext, useContext, useEffect, useState } from 'react';
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
  const [view, setView] = useState(() => window.location.pathname.endsWith('note.html') ? 'notes' : 'workspace');
  const [activeTrack, setActiveTrack] = useState('linux-fundamentals');
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [remoteTracks, setRemoteTracks] = useState({});
  const [savedTracks, setSavedTracks] = useLocalStorage('onewhole-tracks', {});
  const trackCatalog = { ...tracks, ...remoteTracks, ...savedTracks };

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

  const goToWorkspace = () => setView('workspace');
  const goToNotes = () => setView('notes');
  const goToProfile = () => setView('profile');

  return <AppContext.Provider value={{
    view,
    setView,
    activeTrack,
    setActiveTrack,
    searchTerm,
    setSearchTerm,
    user,
    authLoading,
    currentUser,
    userProfile,
    trackCatalog,
    updateTrackCatalog,
    goToWorkspace,
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
