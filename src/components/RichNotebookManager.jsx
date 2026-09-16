import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Icon from './Icon.jsx';
import { defaultNotes, tracks, useAppContext, useLocalStorage } from '../context/AppContext.jsx';

export const sanitizeHtml = (dirty) => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'pre', 'code',
      'br', 'span', 'img', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'hr'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style', 'title'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onkeydown'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[/?#]|$))/i
  });
};

export const migrateNotes = (value) => {
  if (!Array.isArray(value)) return defaultNotes;
  return value.filter((note) => note && typeof note === 'object').map((note) => ({
    id: String(note.id || `legacy-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    track: String(note.track || 'linux-fundamentals'),
    title: String(note.title || 'Untitled note'),
    content: sanitizeHtml(String(note.content || '')),
    updatedAt: note.updatedAt || null
  }));
};

export const PATH_LIBRARY = {
  'ethical-hacker': {
    title: 'Ethical Hacker Roadmap',
    description: 'A practical path through reconnaissance, exploitation, and responsible reporting.',
    aliases: ['ethical-hacker', 'ethical-hacker-roadmap', 'ethical-hacking', 'hacker', 'pentest', 'penetration-testing'],
    initialNotes: [
      { title: 'Recon Workflow', content: '<p>Define scope, enumerate assets, and record evidence before testing.</p>' },
      { title: 'Responsible Reporting', content: '<p>Document impact, reproduction steps, and remediation without exposing sensitive data.</p>' },
      { title: 'Vulnerability Assessment', content: '<p>Scan targets for common misconfigurations, open services, and unpatched software.</p>' },
      { title: 'Privilege Escalation', content: '<p>Inspect SUID binaries, sudo permissions, cron jobs, and misconfigured service accounts.</p>' }
    ]
  },
  'soc-analyst': {
    title: 'SOC Analyst Roadmap',
    description: 'Build the investigation habits needed to triage alerts and contain incidents.',
    aliases: ['soc-analyst', 'soc-analyst-roadmap', 'soc', 'security-analyst', 'blue-team', 'incident-response'],
    initialNotes: [
      { title: 'Alert Triage', content: '<p>Validate the signal, identify affected assets, and establish a clear incident timeline.</p>' },
      { title: 'Investigation Notes', content: '<p>Capture indicators, queries, decisions, and next actions as the investigation evolves.</p>' },
      { title: 'Log Analysis & SIEM', content: '<p>Filter and correlate authentication, network, and endpoint logs for anomalies.</p>' }
    ]
  },
  'cloud-security': {
    title: 'Cloud Security Roadmap',
    description: 'Learn identity, network, and workload controls for secure cloud environments.',
    aliases: ['cloud-security', 'cloud-security-roadmap', 'aws-security', 'azure-security', 'cloud'],
    initialNotes: [
      { title: 'Identity Baseline', content: '<p>Start with least privilege, strong authentication, and auditable role assignments.</p>' },
      { title: 'Cloud Logging', content: '<p>Centralize control-plane and workload logs, then test alert coverage with safe simulations.</p>' },
      { title: 'Infrastructure as Code Audit', content: '<p>Automate checks for public buckets and overly permissive security groups.</p>' }
    ]
  },
  'devsecops': {
    title: 'DevSecOps Roadmap',
    description: 'Integrate automated security testing and container defenses into CI/CD pipelines.',
    aliases: ['devsecops', 'devsecops-roadmap', 'ci-cd-security', 'appsec', 'container-security'],
    initialNotes: [
      { title: 'CI/CD Pipeline Scanning', content: '<p>Embed SAST and dependency vulnerability checks in pull requests.</p>' },
      { title: 'Container Hardening', content: '<p>Use minimal base images, drop unnecessary capabilities, and run as non-root.</p>' }
    ]
  }
};

export function findPathPreset(query) {
  const normalized = (query || '').trim().toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) return null;

  if (PATH_LIBRARY[slug]) return { key: slug, preset: PATH_LIBRARY[slug] };

  for (const [key, preset] of Object.entries(PATH_LIBRARY)) {
    if (key === slug) return { key, preset };
    if (preset.aliases?.some((alias) => alias === slug || normalized.includes(alias) || alias.includes(normalized))) {
      return { key, preset };
    }
    if (preset.title.toLowerCase() === normalized || preset.title.toLowerCase().includes(normalized) || normalized.includes(preset.title.toLowerCase())) {
      return { key, preset };
    }
  }

  const tokens = normalized.split(/[\s-]+/).filter((t) => t.length > 2);
  for (const [key, preset] of Object.entries(PATH_LIBRARY)) {
    if (tokens.some((token) => key.includes(token) || preset.title.toLowerCase().includes(token))) {
      return { key, preset };
    }
  }

  return null;
}

export function createUniqueNoteId(notes, prefix = 'note') {
  const existingIds = new Set(notes.map((note) => note.id));
  let id = `${prefix}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  while (existingIds.has(id)) {
    id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return id;
}

function LegacyRichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = sanitizeHtml(value || '');
    }
  }, [value]);

  const emitChange = () => {
    if (editorRef.current) {
      onChange(sanitizeHtml(editorRef.current.innerHTML));
    }
  };

  const applyFormatting = (tag, wrapperAttrs = {}) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) {
      const elem = document.createElement(tag);
      Object.entries(wrapperAttrs).forEach(([k, v]) => elem.setAttribute(k, v));
      elem.innerHTML = '&nbsp;';
      range.insertNode(elem);
      range.selectNodeContents(elem);
      selection.removeAllRanges();
      selection.addRange(range);
      emitChange();
      return;
    }

    let parent = range.commonAncestorContainer;
    if (parent.nodeType === Node.TEXT_NODE) parent = parent.parentNode;

    if (parent && parent !== editorRef.current && parent.tagName.toLowerCase() === tag.toLowerCase()) {
      const fragment = document.createDocumentFragment();
      while (parent.firstChild) fragment.appendChild(parent.firstChild);
      parent.parentNode.replaceChild(fragment, parent);
      emitChange();
      return;
    }

    try {
      const elem = document.createElement(tag);
      Object.entries(wrapperAttrs).forEach(([k, v]) => elem.setAttribute(k, v));
      elem.appendChild(range.extractContents());
      range.insertNode(elem);
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(elem);
      selection.addRange(newRange);
    } catch {
      return;
    }
    emitChange();
  };

  const toggleList = (type = 'ul') => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    const selectedHtml = range.collapsed ? 'List item...' : range.cloneContents();
    const list = document.createElement(type);
    const li = document.createElement('li');
    if (typeof selectedHtml === 'string') li.textContent = selectedHtml;
    else li.appendChild(selectedHtml);
    list.appendChild(li);

    range.deleteContents();
    range.insertNode(list);
    emitChange();
  };

  const addLink = (event) => {
    event.preventDefault();
    const url = linkUrl.trim();
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    applyFormatting('a', { href, target: '_blank', rel: 'noopener noreferrer' });
    setLinkUrl('');
  };

  const handlePaste = (event) => {
    const items = [...event.clipboardData.items];
    const image = items.find((item) => item.type.startsWith('image/'));
    const pdf = items.find((item) => item.type === 'application/pdf');

    if (image) {
      event.preventDefault();
      const file = image.getAsFile();
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        window.alert(`STORAGE_NOTICE: The pasted image is ${Math.round((file.size / (1024 * 1024)) * 10) / 10}MB. It will be automatically optimized to fit within the browser's 5MB localStorage quota.`);
      }

      const reader = new FileReader();
      reader.onload = () => {
        const tempImg = new Image();
        tempImg.onload = () => {
          let { width, height } = tempImg;
          const maxDim = 960;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(tempImg, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

          const img = document.createElement('img');
          img.src = compressedDataUrl;
          img.alt = 'Uploaded operational visual';
          const sel = window.getSelection();
          if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.insertNode(img);
          } else {
            editorRef.current?.appendChild(img);
          }
          emitChange();
        };
        tempImg.onerror = () => {
          const img = document.createElement('img');
          img.src = reader.result;
          img.alt = 'Uploaded operational visual';
          editorRef.current?.appendChild(img);
          emitChange();
        };
        tempImg.src = reader.result;
      };
      reader.readAsDataURL(file);
      return;
    }

    if (pdf) {
      event.preventDefault();
      const file = pdf.getAsFile();
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        window.alert('PDF_TOO_LARGE // Paste a PDF smaller than 5MB for notebook storage.');
        return;
      }

      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = file.name || 'View PDF Document';

      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(link);
        range.collapse(false);
        range.insertNode(document.createElement('br'));
      } else {
        editorRef.current?.appendChild(link);
      }
      emitChange();
      return;
    }

    const htmlData = event.clipboardData.getData('text/html');
    if (htmlData) {
      event.preventDefault();
      const clean = sanitizeHtml(htmlData);
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = clean;
        const frag = document.createDocumentFragment();
        while (div.firstChild) frag.appendChild(div.firstChild);
        range.insertNode(frag);
        emitChange();
      }
    }
  };

  return (
    <div className="rich-editor-shell">
      <div className="rich-editor-toolbar" role="toolbar" aria-label="Notebook formatting">
        <button type="button" title="Bold" aria-label="Bold text" onClick={() => applyFormatting('strong')}><Icon name="type-bold" /></button>
        <button type="button" title="Italic" aria-label="Italic text" onClick={() => applyFormatting('em')}><Icon name="type-italic" /></button>
        <button type="button" title="Bullet list" aria-label="Insert bullet list" onClick={() => toggleList('ul')}><Icon name="list-ul" /></button>
        <button type="button" title="Code block" aria-label="Insert code block" onClick={() => applyFormatting('pre')}><Icon name="code-slash" /></button>
        <form className="rich-link-form" onSubmit={addLink}>
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https:// link"
            aria-label="Link URL"
          />
          <button type="submit" title="Insert link" aria-label="Insert link"><Icon name="link-45deg" /></button>
        </form>
      </div>
      <div
        ref={editorRef}
        className="rich-editor"
        contentEditable
        role="textbox"
        aria-label="Notebook content"
        aria-multiline="true"
        data-placeholder="Write your operational notes..."
        onInput={emitChange}
        onPaste={handlePaste}
      />
    </div>
  );
}

export function RichTextEditor({ value, onChange }) {
  const [linkUrl, setLinkUrl] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
      }),
      Image.configure({ inline: false, allowBase64: true })
    ],
    content: sanitizeHtml(value || ''),
    editorProps: {
      attributes: {
        class: 'rich-editor',
        role: 'textbox',
        'aria-label': 'Notebook content',
        'aria-multiline': 'true'
      }
    },
    onUpdate: ({ editor: updatedEditor }) => onChange(sanitizeHtml(updatedEditor.getHTML()))
  });

  useEffect(() => {
    if (!editor) return;
    const cleanValue = sanitizeHtml(value || '');
    if (!editor.isFocused && cleanValue !== editor.getHTML()) editor.commands.setContent(cleanValue, false);
  }, [editor, value]);

  const addLink = (event) => {
    event.preventDefault();
    const url = linkUrl.trim();
    if (!url || !editor) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.startsWith('http') ? url : `https://${url}` }).run();
    setLinkUrl('');
  };

  const handlePaste = (event) => {
    const items = [...event.clipboardData.items];
    const image = items.find((item) => item.type.startsWith('image/'));
    const pdf = items.find((item) => item.type === 'application/pdf');

    if (pdf) {
      event.preventDefault();
      if (!editor) return;
      const file = pdf.getAsFile();
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        window.alert('PDF_TOO_LARGE // Paste a PDF smaller than 5MB for notebook storage.');
        return;
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = file.name || 'View PDF Document';
      editor.chain().focus().insertContent(link.outerHTML).run();
      return;
    }

    if (!image || !editor) return;
    event.preventDefault();
    const file = image.getAsFile();
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      window.alert('IMAGE_TOO_LARGE // Paste an image smaller than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const imageElement = new window.Image();
      imageElement.onload = () => {
        const maxDimension = 960;
        const scale = Math.min(1, maxDimension / Math.max(imageElement.width, imageElement.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(imageElement.width * scale));
        canvas.height = Math.max(1, Math.round(imageElement.height * scale));
        canvas.getContext('2d')?.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        if (compressed.length > 700 * 1024) {
          window.alert('IMAGE_TOO_LARGE // The compressed image is still too large for local notebook storage.');
          return;
        }
        editor.chain().focus().setImage({ src: compressed, alt: 'Uploaded operational visual' }).run();
      };
      imageElement.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rich-editor-shell">
      <div className="rich-editor-toolbar" role="toolbar" aria-label="Notebook formatting">
        <button type="button" title="Bold" aria-label="Bold text" onClick={() => editor?.chain().focus().toggleBold().run()}><Icon name="type-bold" /></button>
        <button type="button" title="Italic" aria-label="Italic text" onClick={() => editor?.chain().focus().toggleItalic().run()}><Icon name="type-italic" /></button>
        <button type="button" title="Bullet list" aria-label="Insert bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()}><Icon name="list-ul" /></button>
        <button type="button" title="Code block" aria-label="Insert code block" onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Icon name="code-slash" /></button>
        <form className="rich-link-form" onSubmit={addLink}>
          <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https:// link" aria-label="Link URL" />
          <button type="submit" title="Insert link" aria-label="Insert link"><Icon name="link-45deg" /></button>
        </form>
      </div>
      <EditorContent editor={editor} onPaste={handlePaste} />
    </div>
  );
}

export default function RichNotebookManager() {
  const { trackCatalog, updateTrackCatalog, goToWorkspace, searchTerm, setSearchTerm } = useAppContext();
  const [selected, setSelected] = useState('linux-fundamentals');
  const [notes, setNotes] = useLocalStorage('onewhole-notebooks', defaultNotes, migrateNotes);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', track: 'linux-fundamentals' });
  const [trackFormOpen, setTrackFormOpen] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);
  const [trackForm, setTrackForm] = useState({ id: '', title: '', description: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [pathStatus, setPathStatus] = useState('');
  const [pathGenerating, setPathGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  const modalRef = useRef(null);
  const openerRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = (message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleStorageError = (event) => {
      showToast(`STORAGE_QUOTA_EXCEEDED // LocalStorage full for ${event.detail?.key || 'notes'}`, 'error');
    };
    window.addEventListener('onewhole:storage-error', handleStorageError);
    return () => window.removeEventListener('onewhole:storage-error', handleStorageError);
  }, []);

  const visible = useMemo(() => {
    const query = (searchTerm || '').trim().toLowerCase();

    return notes.filter((note) => {
      const matchesTrack = !query ? note.track === selected : note.track === selected;
      if (!matchesTrack) return false;

      if (!query) return true;

      const title = String(note.title || '').toLowerCase();
      const content = String(note.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
      const trackName = String(trackCatalog[note.track]?.title || note.track || '').toLowerCase();

      return title.includes(query) || content.includes(query) || trackName.includes(query);
    });
  }, [notes, selected, searchTerm, trackCatalog]);

  const beginEdit = (note = null, event = null) => {
    openerRef.current = event?.currentTarget || document.activeElement;
    setEditing(note?.id || 'new');
    setForm(note ? { title: note.title, content: note.content, track: note.track } : { title: '', content: '', track: selected });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  useEffect(() => {
    if (editing && modalRef.current) {
      const titleInput = modalRef.current.querySelector('input[name="title"]');
      if (titleInput) {
        setTimeout(() => titleInput.focus(), 50);
      }

      const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
          cancelEdit();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    } else if (!editing && openerRef.current) {
      openerRef.current.focus?.();
    }
  }, [editing]);

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key === 'Tab' && modalRef.current) {
      const focusableSelectors = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
      const focusableElements = Array.from(modalRef.current.querySelectorAll(focusableSelectors));
      if (!focusableElements.length) return;
      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  const applyStarterTemplate = (type, event) => {
    const templates = {
      recon: {
        title: 'Target Reconnaissance Checklist',
        content: '<p><strong>Scope & Targets:</strong></p><ul><li>IP Range: 10.10.x.x/24</li><li>Target Domain: scope.target.corp</li></ul><p><strong>Nmap Enumeration Scan:</strong></p><pre><code>nmap -sV -sC -Pn -oA recon_initial &lt;target&gt;</code></pre><p><strong>Discovered Services & Attack Surface:</strong></p><ul><li>Port 22/SSH: OpenSSH 8.2p1</li><li>Port 80/443: Web application login portal</li></ul>'
      },
      triage: {
        title: 'Incident Triage & Alert Investigation',
        content: '<p><strong>Incident Identifier:</strong> SEC-INC-2026</p><p><strong>Severity:</strong> HIGH // Active Beaconing Alert</p><p><strong>Affected Endpoint:</strong> WS-ENG-042 (192.168.4.12)</p><p><strong>Telemetry & Timeline:</strong></p><ol><li><strong>10:14 UTC:</strong> Outbound connection to untrusted external IP detected.</li><li><strong>10:22 UTC:</strong> Host network isolation command dispatched.</li></ol><p><strong>Immediate Next Actions:</strong> Dump process memory and inspect scheduled tasks.</p>'
      },
      vuln: {
        title: 'Vulnerability Report: Assessment Finding',
        content: '<p><strong>Finding Title:</strong> Missing Access Control on Admin Endpoint</p><p><strong>Severity:</strong> High (CVSS 3.1: 8.1)</p><p><strong>Affected Component:</strong> /api/v1/internal/diagnostics</p><p><strong>Proof of Concept:</strong></p><pre><code>curl -i -X GET https://target.app/api/v1/internal/diagnostics -H "X-Forwarded-For: 127.0.0.1"</code></pre><p><strong>Remediation Recommendation:</strong> Enforce server-side role validation on all routing decorators.</p>'
      }
    };
    const tpl = templates[type];
    if (!tpl) return;
    openerRef.current = event?.currentTarget;
    setEditing('new');
    setForm({ title: tpl.title, content: tpl.content, track: selected });
  };

  const addTrack = (event) => {
    event.preventDefault();
    const id = trackForm.id.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id || !trackForm.title.trim() || trackCatalog[id]) return;
    try {
      updateTrackCatalog((items) => ({ ...items, [id]: { title: trackForm.title.trim(), description: trackForm.description.trim() || 'A new study track.' } }));
      setSelected(id);
      setTrackForm({ id: '', title: '', description: '' });
      setTrackFormOpen(false);
      showToast(`TRACK_CREATED // "${trackForm.title.trim()}" registered`, 'success');
    } catch (err) {
      showToast(`TRACK_ERROR // ${err.message}`, 'error');
    }
  };

  const removeTrack = (id) => {
    if (tracks[id]) return;
    try {
      setNotes((items) => items.filter((note) => note.track !== id));
      updateTrackCatalog((items) => { const next = { ...items }; delete next[id]; return next; });
      setSelected('linux-fundamentals');
      showToast(`TRACK_REMOVED // "${id}" purged`, 'info');
    } catch (err) {
      showToast(`REMOVE_ERROR // ${err.message}`, 'error');
    }
  };

  const persistNotes = (nextNotes) => {
    const serialized = JSON.stringify(nextNotes);
    const payloadSize = new TextEncoder().encode(serialized).length;
    if (payloadSize > 4 * 1024 * 1024) {
      throw new DOMException('Notebook payload exceeds the safe localStorage limit.', 'QuotaExceededError');
    }
    window.localStorage.setItem('onewhole-notebooks', serialized);
    return nextNotes;
  };

  const importPath = (query) => {
    const trimmed = (query || '').trim();
    if (!trimmed) return;
    try {
      const match = findPathPreset(trimmed);
      const slug = match ? match.key : trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const preset = match ? match.preset : {
        title: trimmed.split(/[\s-_]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Roadmap',
        description: `Curated learning roadmap for ${trimmed}.`,
        initialNotes: [
          { title: `${trimmed} Fundamentals`, content: `<p>Core objectives, tools, and study notes for ${trimmed}.</p>` },
          { title: 'Labs & Practical Milestones', content: `<p>Hands-on practice exercises and references.</p>` }
        ]
      };

      const alreadyImported = Boolean(trackCatalog[slug]);
      if (!alreadyImported) {
        updateTrackCatalog((items) => ({ ...items, [slug]: { title: preset.title, description: preset.description } }));
        const newNotes = [
          ...notes,
          ...preset.initialNotes.map((note, index) => ({
            id: createUniqueNoteId(notes, `${slug}-${index}`),
            track: slug,
            title: note.title,
            content: sanitizeHtml(note.content)
          }))
        ];
        persistNotes(newNotes);
        setNotes(newNotes);
      }
      setSelected(slug);
      setSearchQuery('');
      setPathStatus(alreadyImported ? `PATH READY // ${preset.title}` : `PATH IMPORTED // ${preset.title}`);
      showToast(alreadyImported ? `ROADMAP_SWITCHED // ${preset.title}` : `ROADMAP_IMPORTED // ${preset.title}`, 'success');
    } catch (err) {
      console.error('Import error:', err);
      showToast(`IMPORT_FAILED // Storage limit reached or error: ${err.message}`, 'error');
    }
  };

  const handlePathImport = (event) => {
    event.preventDefault();
    importPath(searchQuery);
  };

  const deleteNote = (id, noteTitle) => {
    try {
      const nextNotes = notes.filter((item) => item.id !== id);
      persistNotes(nextNotes);
      setNotes(nextNotes);
      showToast(`NOTE_DELETED // "${noteTitle || id}" removed`, 'info');
    } catch (err) {
      showToast(`DELETE_ERROR // ${err.message}`, 'error');
    }
  };

  const save = (event) => {
    event.preventDefault();
    const cleanTitle = form.title.trim();
    const cleanContent = sanitizeHtml(form.content);

    if (!cleanTitle || !cleanContent.replace(/<[^>]*>/g, '').trim()) {
      showToast('VALIDATION_ERROR // Note title and content cannot be empty', 'error');
      return;
    }

    const targetTrack = form.track || selected;
    const nextItem = {
      id: editing === 'new' ? createUniqueNoteId(notes) : editing,
      title: cleanTitle,
      content: cleanContent,
      track: targetTrack,
      updatedAt: new Date().toISOString()
    };

    try {
      const nextNotes = editing === 'new'
        ? [...notes, nextItem]
        : notes.map((note) => (note.id === editing ? nextItem : note));

      persistNotes(nextNotes);
      setNotes(nextNotes);
      setEditing(null);
      showToast(`NOTE_SAVED // "${cleanTitle}" synchronized`, 'success');
    } catch (err) {
      console.error('Storage error on save:', err);
      const isQuota = err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014;
      const errorMessage = isQuota
        ? 'STORAGE_QUOTA_EXCEEDED: The browser refused to save this note because localStorage (~5MB limit) is full. Please remove large images or delete older notes to free up space.'
        : `SAVE_ERROR: The browser refused to save this note (${err.message}).`;

      showToast(errorMessage, 'error');
      window.alert(errorMessage);
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
                <button className="track-add-btn" title="Add track" aria-label="Add new study track" onClick={() => setTrackFormOpen((value) => !value)}>
                  <Icon name="plus-lg" />
                </button>
                <button
                  className={`track-remove-mode-btn${removeMode ? ' active' : ''}`}
                  title={removeMode ? 'Cancel track removal' : 'Choose tracks to remove'}
                  aria-label={removeMode ? 'Cancel track removal mode' : 'Enter track removal mode'}
                  onClick={() => setRemoveMode((value) => !value)}
                >
                  <Icon name={removeMode ? 'dash-lg' : 'trash3'} />
                </button>
              </div>
            </div>

            <form className="path-import-form" onSubmit={handlePathImport}>
              <label htmlFor="study-path-search" className="notebook-section-title">ROADMAP LIBRARY // IMPORT PATH</label>
              <div className="path-import-controls">
                <input
                  id="study-path-search"
                  list="roadmap-library-presets"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="e.g. Ethical Hacker Roadmap"
                  aria-label="Search study paths"
                  disabled={pathGenerating}
                />
                <datalist id="roadmap-library-presets">
                  <option value="Ethical Hacker Roadmap" />
                  <option value="SOC Analyst Roadmap" />
                  <option value="Cloud Security Roadmap" />
                  <option value="DevSecOps Roadmap" />
                </datalist>
                <button className="save-notebook-btn" type="submit" disabled={pathGenerating}>
                  {pathGenerating ? 'GENERATING...' : 'IMPORT PATH'}
                </button>
              </div>
              {pathStatus && <p className="path-import-status" aria-live="polite">{pathStatus}</p>}
            </form>

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
                      aria-label={`Remove track ${trackCatalog[id]?.title || id}`}
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
              <div className="notebook-manager-actions">
                <button className="new-notebook-btn" onClick={(event) => beginEdit(null, event)}>
                  <Icon name="plus-lg" /> NEW NOTEBOOK
                </button>
              </div>
            </div>

            <div className="notebook-records">
              {visible.length ? (
                visible.map((note) => (
                  <article className="notebook-record" key={note.id}>
                    <div>
                      <h4>{note.title}</h4>
                      <div
                        className="notebook-record-content"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }}
                      />
                    </div>
                    <div className="notebook-record-actions">
                      <button title="Edit notebook" aria-label={`Edit notebook: ${note.title}`} onClick={(event) => beginEdit(note, event)}>
                        <Icon name="pencil" />
                      </button>
                      <button title="Delete notebook" aria-label={`Delete notebook: ${note.title}`} onClick={() => deleteNote(note.id, note.title)}>
                        <Icon name="trash3" />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="notebook-empty-container">
                  <div className="cyber-terminal-visual" aria-hidden="true">
                    <svg viewBox="0 0 400 160" className="cyber-terminal-svg">
                      <rect x="10" y="10" width="380" height="140" rx="8" fill="#0b0f19" stroke="rgba(0,255,0,0.3)" strokeWidth="1.5" />
                      <circle cx="30" cy="28" r="4" fill="#ef4444" />
                      <circle cx="45" cy="28" r="4" fill="#eab308" />
                      <circle cx="60" cy="28" r="4" fill="#22c55e" />
                      <line x1="10" y1="42" x2="390" y2="42" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
                      <text x="30" y="70" fill="#00ff00" fontFamily="Courier New, monospace" fontSize="11">&gt; SYSTEM_STATUS: READY // NO_ENTRIES_FOUND</text>
                      <text x="30" y="92" fill="#94a3b8" fontFamily="Courier New, monospace" fontSize="10">&gt; SELECT TRACK // RECORD FIELD TELEMETRY &amp; NOTES</text>
                      <text x="30" y="114" fill="#60a5fa" fontFamily="Courier New, monospace" fontSize="10">&gt; READY TO INITIALIZE NOTEBOOK PROTOCOL_</text>
                      <line x1="30" y1="130" x2="130" y2="130" stroke="#00ff00" strokeWidth="2" strokeDasharray="4 2" />
                    </svg>
                  </div>

                  <div className="empty-state-intro">
                    <h4>NO NOTES RECORDED IN THIS TRACK</h4>
                    <p>Start an operational notebook entry or choose a curated template below to pre-populate common security workflows.</p>
                  </div>

                  <div className="starter-templates-heading">QUICK-START NOTE TEMPLATES:</div>
                  <div className="starter-templates-grid">
                    <button type="button" className="starter-template-chip" onClick={(event) => applyStarterTemplate('recon', event)}>
                      <Icon name="search" /> <span>Recon Checklist</span>
                    </button>
                    <button type="button" className="starter-template-chip" onClick={(event) => applyStarterTemplate('triage', event)}>
                      <Icon name="shield-check" /> <span>Incident Triage Log</span>
                    </button>
                    <button type="button" className="starter-template-chip" onClick={(event) => applyStarterTemplate('vuln', event)}>
                      <Icon name="bug" /> <span>Vulnerability Finding</span>
                    </button>
                  </div>

                  <div className="empty-state-actions">
                    <button className="new-notebook-btn highlight" onClick={(event) => beginEdit(null, event)}>
                      <Icon name="plus-lg" /> INITIALIZE FIRST NOTE
                    </button>
                  </div>
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
            onKeyDown={handleModalKeyDown}
          >
            <div className="modal-header">
              <div id="notebook-editor-dialog-title" className="modal-title">
                <Icon name="journal-text" /> NOTEBOOK_EDITOR // {editing === 'new' ? 'NEW ENTRY' : 'EDIT ENTRY'}
              </div>
              <button
                type="button"
                className="close-modal-btn"
                aria-label="Close notebook editor dialog"
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
                  placeholder="e.g. Target Reconnaissance Notes"
                  required
                />
              </label>

              <label>
                Track
                <select
                  value={form.track}
                  onChange={(event) => setForm({ ...form, track: event.target.value })}
                  aria-label="Notebook track"
                >
                  {Object.keys(trackCatalog).map((id) => (
                    <option value={id} key={id}>{trackCatalog[id].title}</option>
                  ))}
                </select>
              </label>

              <label>
                Content
                <RichTextEditor
                  value={form.content}
                  onChange={(content) => setForm((current) => ({ ...current, content }))}
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

      {toast && (
        <div className={`cyber-toast cyber-toast-${toast.type}`} role="status" aria-live="polite">
          <div className="toast-indicator" />
          <div className="toast-content">
            <span className="toast-label">{toast.type.toUpperCase()}</span>
            <span className="toast-text">{toast.message}</span>
          </div>
          <button
            className="toast-close-btn"
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
