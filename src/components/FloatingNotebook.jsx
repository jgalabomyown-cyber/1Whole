import { useState } from 'react';
import Icon from './Icon.jsx';
import { RichTextEditor } from './RichNotebookManager.jsx';
import { useAppContext } from '../context/AppContext.jsx';

export default function FloatingNotebook() {
  const { currentWorkspaceId, workspaceNotes, addWorkspaceNote, removeWorkspaceNote, updateWorkspaceNote } = useAppContext();
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');

  const openEditor = (note = null) => {
    setOpen(false);
    setEditingNote(note);
    setEditorTitle(note?.title || '');
    setEditorContent(note?.content || '');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingNote(null);
    setEditorTitle('');
    setEditorContent('');
  };

  const saveNote = (event) => {
    event.preventDefault();
    if (!editorTitle.trim() || !editorContent.trim()) return;
    if (editingNote) updateWorkspaceNote(editingNote.id, { title: editorTitle.trim(), content: editorContent });
    else addWorkspaceNote({ title: editorTitle, content: editorContent });
    closeEditor();
  };

  return <div className={`floating-notebook${open ? ' open' : ''}`}>
    {open && <section className="floating-notebook-menu" aria-label={`Notes for ${currentWorkspaceId}`}>
      <div className="floating-notebook-header"><div><span className="notebook-section-title">WORKSPACE_NOTEBOOKS</span><strong>{currentWorkspaceId}</strong></div><button type="button" onClick={() => openEditor()} aria-label="Create notebook"><Icon name="plus-lg" /></button></div>
      <div className="floating-note-list">{workspaceNotes.length ? workspaceNotes.map((note) => <article className="floating-note-item" key={note.id}><strong>{note.title}</strong><div className="floating-note-actions"><button className="floating-note-edit" type="button" onClick={() => openEditor(note)} aria-label={`Edit ${note.title}`}><Icon name="pencil" /></button><button className="floating-note-delete" type="button" onClick={() => removeWorkspaceNote(note.id)} aria-label={`Delete ${note.title}`}><Icon name="trash3" /></button></div></article>) : <p className="floating-note-empty">No notebooks in this workspace yet.</p>}</div>
    </section>}
    <button className="floating-notebook-fab" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? 'Close workspace notes' : 'Open workspace notes'}><Icon name={open ? 'x-lg' : 'journal-code'} /></button>
    {editorOpen && <div className="notebook-modal-overlay show" role="presentation" onClick={(event) => event.target === event.currentTarget && closeEditor()}><div className="notebook-editor-modal" role="dialog" aria-modal="true" aria-labelledby="floating-notebook-editor-title"><div className="modal-header"><div id="floating-notebook-editor-title" className="modal-title"><Icon name="journal-text" /> NOTEBOOK_EDITOR // {editingNote ? 'EDIT ENTRY' : 'NEW ENTRY'}</div><button type="button" className="close-modal-btn" aria-label="Close notebook editor" onClick={closeEditor}>×</button></div><form className="notebook-editor-form" onSubmit={saveNote}><label>Title<input name="title" value={editorTitle} onChange={(event) => setEditorTitle(event.target.value)} maxLength="80" placeholder="e.g. Target Reconnaissance Notes" required /></label><label>Content<RichTextEditor value={editorContent} onChange={setEditorContent} /></label><div className="notebook-editor-actions"><button className="save-notebook-btn" type="submit">SAVE NOTE</button><button className="cancel-notebook-btn" type="button" onClick={closeEditor}>CANCEL</button></div></form></div></div>}
  </div>;
}