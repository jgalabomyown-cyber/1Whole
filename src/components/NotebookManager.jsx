import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { defaultNotes, tracks, useAppContext, useLocalStorage } from '../context/AppContext.jsx';

export default function NotebookManager() {
  const { trackCatalog, updateTrackCatalog, goToWorkspace, searchTerm, setSearchTerm } = useAppContext();
  const [selected, setSelected] = useState('linux-fundamentals');
  const [notes, setNotes] = useLocalStorage('onewhole-notebooks', defaultNotes);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [trackFormOpen, setTrackFormOpen] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);
  const [trackForm, setTrackForm] = useState({ id: '', title: '', description: '' });

  const modalRef = useRef(null);
  const openerRef = useRef(null);

  const visible = useMemo(() => {
    return notes
      .filter((note) => note.track === selected)
      .filter((note) => (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [notes, selected, searchTerm]);

  const beginEdit = (note = null, event = null) => {
    openerRef.current = event?.currentTarget || document.activeElement;
    setEditing(note?.id || 'new');
    setForm(note ? { title: note.title, content: note.content } : { title: '', content: '' });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  useEffect(() => {
    if (!editing) {
      openerRef.current?.focus?.();
      return;
    }

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        cancelEdit();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editing]);

  const addTrack = (event) => {
    event.preventDefault();
    const id = trackForm.id.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id || !trackForm.title.trim() || trackCatalog[id]) return;
    updateTrackCatalog((items) => ({ ...items, [id]: { title: trackForm.title.trim(), description: trackForm.description.trim() || 'A new study track.' } }));
    setSelected(id);
    setTrackForm({ id: '', title: '', description: '' });
    setTrackFormOpen(false);
  };

  const removeTrack = (id) => {
    if (tracks[id]) return;
    setNotes((items) => items.filter((note) => note.track !== id));
    updateTrackCatalog((items) => { const next = { ...items }; delete next[id]; return next; });
    setSelected('linux-fundamentals');
  };

  const save = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      const nextNotes = editing === 'new'
        ? [...notes, { id: `${Date.now()}`, track: selected, ...form }]
        : notes.map((note) => note.id === editing ? { ...note, ...form } : note);

      window.localStorage.setItem('onewhole-notebooks', JSON.stringify(nextNotes));
      setNotes(nextNotes);
      setEditing(null);
    } catch (err) {
      console.error('Storage quota / persistence error:', err);
      const isQuota = err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014;
      window.alert(
        isQuota
          ? 'STORAGE_ERROR: The browser refused to save this note because the local storage quota (~5MB) was exceeded. Please remove older notes or large attachments.'
          : `SAVE_ERROR: The browser refused to save this note (${err.message}).`
      );
    }
  };

  return (
    <main className="notebooks-page">
      <section className="notebooks-shell" aria-hidden={editing ? 'true' : undefined} inert={editing ? '' : undefined}>
        <div className="notebooks-page-header">
          <div>
            <div className="page-kicker">KNOWLEDGE_BASE // NOTEBOOK_MANAGER</div>
            <h2>Notebooks</h2>
            <p>Create and organize study notes by track. Changes are saved locally in this browser.</p>
          </div>
          <div className="notebooks-page-header-actions">
            <input
              className="notebook-search-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search notes..."
              aria-label="Search notes in selected track"
            />
            <button className="back-to-workspace-btn" onClick={goToWorkspace}>
              <Icon name="arrow-left" /> WORKSPACE
            </button>
          </div>
        </div>

        <div className="notebooks-layout">
          <aside className="notebook-track-list">
            <div className="notebook-list-heading">
              <div className="notebook-section-title">TRACKS</div>
              <div className="track-management-actions">
                <button className="track-add-btn" title="Add track" onClick={() => setTrackFormOpen((value) => !value)}>
                  <Icon name="plus-lg" />
                </button>
                <button
                  className={`track-remove-mode-btn${removeMode ? ' active' : ''}`}
                  title={removeMode ? 'Cancel track removal' : 'Choose tracks to remove'}
                  onClick={() => setRemoveMode((value) => !value)}
                >
                  <Icon name={removeMode ? 'dash-lg' : 'trash3'} />
                </button>
              </div>
            </div>

            {trackFormOpen && (
              <form className="track-editor" onSubmit={addTrack}>
                <input
                  placeholder="track-id"
                  value={trackForm.id}
                  onChange={(event) => setTrackForm({ ...trackForm, id: event.target.value })}
                  required
                />
                <input
                  placeholder="Track name"
                  value={trackForm.title}
                  onChange={(event) => setTrackForm({ ...trackForm, title: event.target.value })}
                  required
                />
                <textarea
                  placeholder="Description (optional)"
                  value={trackForm.description}
                  onChange={(event) => setTrackForm({ ...trackForm, description: event.target.value })}
                  rows="2"
                />
                <button className="save-notebook-btn" type="submit">ADD TRACK</button>
              </form>
            )}

            <div className="notebook-track-options">
              {Object.keys(trackCatalog).map((id) => (
                <div className={`notebook-track-row${selected === id ? ' active' : ''}`} key={id}>
                  <button className="notebook-track-option" onClick={() => { setSelected(id); cancelEdit(); }}>
                    $ {id}
                  </button>
                  {removeMode && (
                    <button
                      className={`track-delete-btn${tracks[id] ? ' disabled' : ''}`}
                      title={tracks[id] ? 'Built-in track cannot be removed' : 'Remove track'}
                      disabled={Boolean(tracks[id])}
                      onClick={() => removeTrack(id)}
                    >
                      <Icon name="dash-lg" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>

          <section className="notebook-manager">
            <div className="notebook-manager-header">
              <div>
                <div className="notebook-section-title">SELECTED TRACK</div>
                <h3 className="notebook-track-heading">{trackCatalog[selected]?.title || selected}</h3>
              </div>
              <button className="new-notebook-btn" onClick={(event) => beginEdit(null, event)}>
                <Icon name="plus-lg" /> NEW NOTEBOOK
              </button>
            </div>

            <div className="notebook-records">
              {visible.length ? (
                visible.map((note) => (
                  <article className="notebook-record" key={note.id}>
                    <div>
                      <h4>{note.title}</h4>
                      <p>{note.content}</p>
                    </div>
                    <div className="notebook-record-actions">
                      <button title="Edit notebook" onClick={(event) => beginEdit(note, event)}>
                        <Icon name="pencil" />
                      </button>
                      <button
                        title="Delete notebook"
                        onClick={() => setNotes((items) => items.filter((item) => item.id !== note.id))}
                      >
                        <Icon name="trash3" />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="notebook-empty">
                  <Icon name="journal-text" />
                  <p>No notebooks in this track yet.</p>
                  <button className="new-notebook-btn" onClick={(event) => beginEdit(null, event)}>
                    CREATE FIRST NOTE
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      {editing && (
        <div
          className="notebook-modal-overlay show"
          role="presentation"
          onClick={(event) => event.target === event.currentTarget && cancelEdit()}
        >
          <div
            ref={modalRef}
            className="notebook-editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notebook-editor-dialog-title"
          >
            <div className="modal-header">
              <div id="notebook-editor-dialog-title" className="modal-title">
                <Icon name="journal-text" /> NOTEBOOK_EDITOR // {editing === 'new' ? 'NEW ENTRY' : 'EDIT ENTRY'}
              </div>
              <button
                type="button"
                className="close-modal-btn"
                aria-label="Close notebook editor"
                onClick={cancelEdit}
              >
                ×
              </button>
            </div>

            <form className="notebook-editor-form" onSubmit={save}>
              <label>
                Title
                <input
                  name="title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  maxLength="80"
                  required
                  autoFocus
                />
              </label>

              <label>
                Notes
                <textarea
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  rows="8"
                  maxLength="5000"
                  required
                />
              </label>

              <div className="notebook-editor-actions">
                <button className="save-notebook-btn" type="submit">SAVE NOTE</button>
                <button className="cancel-notebook-btn" type="button" onClick={cancelEdit}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
