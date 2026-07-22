import React, { useMemo, useState } from 'react';
import { CheckCircle2, Filter, Link2, MessageSquare, Search, Send, Undo2 } from 'lucide-react';
import type { CommentItem, ContentItem, TeamMember } from '../services/sheets';

interface ClientPortalProps {
  items: ContentItem[];
  comments: CommentItem[];
  currentUser: TeamMember;
  onUpdateItem: (item: ContentItem) => Promise<void>;
  onAddComment: (contentId: string, text: string, attachmentUrl?: string) => Promise<void>;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ items, comments, currentUser, onUpdateItem, onAddComment }) => {
  const [selectedId, setSelectedId] = useState(items[0]?.id || '');
  const [comment, setComment] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [saving, setSaving] = useState(false);
  const filteredItems = useMemo(() => items.filter((item) => {
    const query = search.toLowerCase();
    return (!query || `${item.title} ${item.brand || ''} ${item.channel}`.toLowerCase().includes(query)) && (statusFilter === 'All' || item.status === statusFilter);
  }), [items, search, statusFilter]);
  const selected = filteredItems.find((item) => item.id === selectedId) || filteredItems[0];
  const selectedComments = useMemo(() => comments.filter((entry) => entry.contentId === selected?.id), [comments, selected?.id]);

  const updateReview = async (approved: boolean) => {
    if (!selected) return;
    setSaving(true);
    try { await onUpdateItem({ ...selected, status: approved ? 'Scheduled' : 'Review/Editing', actorId: currentUser.id }); } finally { setSaving(false); }
  };
  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    setSaving(true);
    try { await onAddComment(selected.id, comment.trim(), attachmentUrl.trim() || undefined); setComment(''); setAttachmentUrl(''); } finally { setSaving(false); }
  };

  return <main className="client-portal page-container">
    <div className="client-portal-heading"><div><span className="analytics-eyebrow">Client review portal</span><h2>Welcome, {currentUser.name}</h2><p>Review content, leave feedback, and approve the next step.</p></div><span className="client-portal-scope">{currentUser.client || 'Your workspace'}</span></div>
    {items.length === 0 ? <div className="client-portal-empty"><CheckCircle2 size={30} /><strong>No content waiting for review</strong><span>Your team will share new drafts here.</span></div> : <div className="client-portal-layout">
      <section className="client-review-list"><div className="client-section-title"><strong>Needs your review</strong><span>{filteredItems.length} of {items.length}</span></div><div className="client-review-filters"><label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search content..." /></label><label><Filter size={14} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>To Do</option><option>Idea</option><option>Review/Editing</option><option>Scheduled</option><option>Published</option></select></label></div>{filteredItems.length === 0 ? <p className="client-muted client-filter-empty">No matching content.</p> : filteredItems.map((item) => <button type="button" key={item.id} className={`client-review-item ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><span>{item.brand || item.client} · {item.channel}</span><small>{item.status}</small></button>)}</section>
      {selected && <section className="client-review-detail"><div className="client-review-detail-head"><div><span>{selected.brand || selected.client} · {selected.channel}</span><h3>{selected.title}</h3></div><span className="client-review-status">{selected.status}</span></div><div className="client-review-copy"><h4>Brief</h4><p>{selected.brief || 'No brief provided.'}</p>{selected.publishDate && <small>Planned publish date: {selected.publishDate}</small>}{selected.assetsLink && <a href={selected.assetsLink} target="_blank" rel="noreferrer">Open shared assets</a>}</div><div className="client-comments"><h4><MessageSquare size={15} /> Feedback & discussion ({selectedComments.length})</h4>{selectedComments.map((entry) => <div className="client-comment" key={entry.id}><strong>{entry.author}</strong><span>{entry.text}</span>{entry.attachmentUrl && <a href={entry.attachmentUrl} target="_blank" rel="noreferrer"><Link2 size={12} /> Open attachment</a>}</div>)}{selectedComments.length === 0 && <p className="client-muted">No feedback yet. Start the conversation below.</p>}<form onSubmit={submitComment}><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write feedback for the team..." rows={3} /><input className="client-attachment-input" type="url" value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} placeholder="Optional Google Drive attachment link" /><button className="btn btn-secondary" disabled={saving || !comment.trim()}><Send size={14} /> Send feedback</button></form></div><div className="client-review-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => updateReview(false)}><Undo2 size={14} /> Request changes</button><button className="btn btn-primary" disabled={saving} onClick={() => updateReview(true)}><CheckCircle2 size={14} /> Approve</button></div></section>}
    </div>}

  </main>;
};
