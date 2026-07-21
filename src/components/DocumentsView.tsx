import React, { useMemo, useState } from 'react';
import { ExternalLink, FileText, Link2, Lock, Maximize2, Minimize2, Plus, Search, Star, Trash2, Users, X } from 'lucide-react';
import type { ClientBrand, ContentItem, DocumentItem, TeamMember } from '../services/sheets';
import '../styles/documents.css';

type DocumentDraft = Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'>;

interface DocumentsViewProps {
  documents: DocumentItem[];
  currentUser: TeamMember;
  clients: ClientBrand[];
  tasks: ContentItem[];
  onCreateDocument: (document: DocumentDraft) => Promise<DocumentItem>;
  onUpdateDocument: (document: DocumentItem) => Promise<DocumentItem>;
  onDeleteDocument: (id: string) => Promise<void>;
}

const blankDraft = (ownerId: string): DocumentDraft => ({
  title: '', type: 'Note', body: '', url: '', ownerId, visibility: 'personal',
  client: '', brand: '', taskId: '', tags: '', pinned: false,
});

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
};

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents, currentUser, clients, tasks, onCreateDocument, onUpdateDocument, onDeleteDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'mine' | 'team'>('mine');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [draft, setDraft] = useState<DocumentDraft>(() => blankDraft(currentUser.id));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);

  const clientNames = useMemo(
    () => [...new Set(clients.filter((entry) => entry.active).map((entry) => entry.client))].sort(),
    [clients],
  );
  const brands = useMemo(
    () => clients.filter((entry) => entry.active && (!draft.client || entry.client === draft.client)),
    [clients, draft.client],
  );
  const linkedTasks = useMemo(
    () => tasks.filter((task) => (!draft.client || task.client === draft.client) && (!draft.brand || task.brand === draft.brand)),
    [tasks, draft.client, draft.brand],
  );

  const visibleDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents
      .filter((document) => activeTab === 'mine'
        ? document.ownerId === currentUser.id
        : document.visibility === 'team')
      .filter((document) => !normalized || [document.title, document.body, document.tags, document.client, document.brand]
        .some((value) => String(value || '').toLowerCase().includes(normalized)))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [activeTab, currentUser.id, documents, query]);

  const openCreate = () => {
    setEditing(null);
    setDraft(blankDraft(currentUser.id));
    setEditorFullscreen(false);
    setDrawerOpen(true);
  };

  const openEdit = (document: DocumentItem) => {
    setEditing(document);
    setDraft({
      title: document.title, type: document.type, body: document.body, url: document.url,
      ownerId: document.ownerId, visibility: document.visibility, client: document.client,
      brand: document.brand, taskId: document.taskId, tags: document.tags, pinned: document.pinned,
    });
    setEditorFullscreen(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (!saving) setDrawerOpen(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || (draft.type === 'Link' && !draft.url.trim())) return;
    setSaving(true);
    try {
      const payload = {
        ...draft,
        title: draft.title.trim(), body: draft.body.trim(), url: draft.url.trim(), tags: draft.tags.trim(),
      };
      if (editing) await onUpdateDocument({ ...editing, ...payload });
      else await onCreateDocument(payload);
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !window.confirm(`Delete “${editing.title}”?`)) return;
    setSaving(true);
    try {
      await onDeleteDocument(editing.id);
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-container documents-page">
      <header className="documents-heading">
        <div>
          <span className="documents-eyebrow">Workspace library</span>
          <h2>Documents &amp; Notes</h2>
          <p>Keep quick notes and useful document links close to the work.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openCreate}><Plus size={16} /> New</button>
      </header>

      <div className="documents-toolbar">
        <div className="documents-tabs" role="tablist" aria-label="Document views">
          <button type="button" role="tab" aria-selected={activeTab === 'mine'} className={activeTab === 'mine' ? 'active' : ''} onClick={() => setActiveTab('mine')}>
            <Lock size={14} /> My Documents
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'team'} className={activeTab === 'team' ? 'active' : ''} onClick={() => setActiveTab('team')}>
            <Users size={14} /> Team
          </button>
        </div>
        <label className="documents-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search documents</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents..." />
        </label>
      </div>

      {visibleDocuments.length ? (
        <section className="documents-grid" aria-label={activeTab === 'mine' ? 'My documents' : 'Team documents'}>
          {visibleDocuments.map((document) => {
            const linkedTask = tasks.find((task) => task.id === document.taskId);
            return (
              <article key={document.id} className="document-card">
                <button type="button" className="document-card-open" onClick={() => openEdit(document)} aria-label={`Edit ${document.title}`}>
                  <span className={`document-type-icon ${document.type.toLowerCase()}`}>
                    {document.type === 'Link' ? <Link2 size={17} /> : <FileText size={17} />}
                  </span>
                  <span className="document-card-content">
                    <span className="document-card-title-row">
                      <strong>{document.title}</strong>{document.pinned && <Star size={14} fill="currentColor" aria-label="Pinned" />}
                    </span>
                    <span className="document-card-preview">{document.body || document.url || 'No description'}</span>
                  </span>
                </button>
                <footer className="document-card-footer">
                  <div className="document-chips">
                    {document.brand && <span>{document.client ? `${document.client} · ` : ''}{document.brand}</span>}
                    {linkedTask && <span>{linkedTask.title}</span>}
                  </div>
                  <span>Updated {formatUpdatedAt(document.updatedAt)}</span>
                </footer>
                {document.type === 'Link' && document.url && (
                  <a className="document-external-link" href={document.url} target="_blank" rel="noreferrer" aria-label={`Open ${document.title} in a new tab`}><ExternalLink size={14} /></a>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="documents-empty">
          <FileText size={28} />
          <strong>{query ? 'No matching documents' : activeTab === 'mine' ? 'No documents yet' : 'No team documents yet'}</strong>
          <span>{query ? 'Try a different search.' : 'Create a note or save a link to get started.'}</span>
          {!query && <button className="btn btn-secondary" type="button" onClick={openCreate}><Plus size={15} /> New document</button>}
        </section>
      )}

      {drawerOpen && (
        <div className="documents-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDrawer()}>
          <aside className={`documents-drawer${editorFullscreen ? ' is-fullscreen' : ''}`} role="dialog" aria-modal="true" aria-labelledby="document-drawer-title">
            <header>
              <div><span>{editing ? 'Edit document' : 'New document'}</span><h3 id="document-drawer-title">{editing?.title || 'Untitled'}</h3></div>
              <div className="documents-editor-actions">
                <button className="btn btn-secondary btn-icon-only" type="button" onClick={() => setEditorFullscreen((value) => !value)} aria-label={editorFullscreen ? 'Exit full screen' : 'Full screen'} title={editorFullscreen ? 'Exit full screen' : 'Full screen'}>
                  {editorFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button className="btn btn-secondary btn-icon-only" type="button" onClick={closeDrawer} aria-label="Close"><X size={17} /></button>
              </div>
            </header>
            <form onSubmit={handleSave}>
              <div className="documents-drawer-body">
                <fieldset className="document-type-switch">
                  <legend>Type</legend>
                  {(['Note', 'Link'] as const).map((type) => (
                    <button key={type} type="button" className={draft.type === type ? 'active' : ''} onClick={() => setDraft({ ...draft, type })}>
                      {type === 'Note' ? <FileText size={15} /> : <Link2 size={15} />}{type}
                    </button>
                  ))}
                </fieldset>
                <label className="form-group"><span className="form-label">Title</span><input className="form-input" autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                {draft.type === 'Link' && <label className="form-group"><span className="form-label">Document URL</span><input className="form-input" type="url" placeholder="https://" required value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>}
                <label className="form-group"><span className="form-label">{draft.type === 'Note' ? 'Note' : 'Description'}</span><textarea className="form-textarea document-body-input" rows={draft.type === 'Note' ? 10 : 5} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
                <div className="form-row">
                  <label className="form-group"><span className="form-label">Visibility</span><select className="form-select" value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as DocumentItem['visibility'] })}><option value="personal">Personal</option><option value="team">Team</option></select></label>
                  <label className="form-group"><span className="form-label">Client</span><select className="form-select" value={draft.client} onChange={(event) => setDraft({ ...draft, client: event.target.value, brand: '', taskId: '' })}><option value="">None</option>{clientNames.map((client) => <option key={client}>{client}</option>)}</select></label>
                </div>
                <div className="form-row">
                  <label className="form-group"><span className="form-label">Brand</span><select className="form-select" value={draft.brand} disabled={!draft.client} onChange={(event) => setDraft({ ...draft, brand: event.target.value, taskId: '' })}><option value="">None</option>{brands.map((entry) => <option key={entry.id} value={entry.brand}>{entry.brand}</option>)}</select></label>
                  <label className="form-group"><span className="form-label">Linked task</span><select className="form-select" value={draft.taskId} onChange={(event) => setDraft({ ...draft, taskId: event.target.value })}><option value="">None</option>{linkedTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
                </div>
                <label className="form-group"><span className="form-label">Tags <small>comma separated</small></span><input className="form-input" placeholder="Brief, Research" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} /></label>
                <label className="document-pin-toggle"><input type="checkbox" checked={draft.pinned} onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })} /><Star size={16} /> Pin to the top</label>
              </div>
              <footer>
                {editing && editing.ownerId === currentUser.id ? <button className="btn btn-danger" type="button" disabled={saving} onClick={handleDelete}><Trash2 size={15} /> Delete</button> : <span />}
                <div><button className="btn btn-secondary" type="button" disabled={saving} onClick={closeDrawer}>Cancel</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
};
