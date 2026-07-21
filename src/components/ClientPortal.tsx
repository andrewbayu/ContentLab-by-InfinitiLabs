import React, { useMemo, useState } from 'react';
import { CheckCircle2, MessageSquare, Send, Undo2 } from 'lucide-react';
import type { CommentItem, ContentItem, TeamMember } from '../services/sheets';

interface ClientPortalProps {
  items: ContentItem[];
  comments: CommentItem[];
  currentUser: TeamMember;
  onUpdateItem: (item: ContentItem) => Promise<void>;
  onAddComment: (contentId: string, text: string) => Promise<void>;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ items, comments, currentUser, onUpdateItem, onAddComment }) => {
  const [selectedId, setSelectedId] = useState(items[0]?.id || '');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const selectedComments = useMemo(() => comments.filter((entry) => entry.contentId === selected?.id), [comments, selected?.id]);

  const updateReview = async (status: 'Approved' | 'Changes Requested') => {
    if (!selected) return;
    setSaving(true);
    try {
      await onUpdateItem({ ...selected, status: status === 'Approved' ? 'Scheduled' : 'Review/Editing', actorId: currentUser.id });
    } finally {
      setSaving(false);
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    setSaving(true);
    try {
      await onAddComment(selected.id, comment.trim());
      setComment('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="client-portal page-container">
      <div className="client-portal-heading"><div><span className="analytics-eyebrow">Client review portal</span><h2>Welcome, {currentUser.name}</h2><p>Review content, leave feedback, and approve the next step.</p></div><span className="client-portal-scope">{currentUser.client || 'Your workspace'}</span></div>
      {items.length === 0 ? <div className="client-portal-empty"><CheckCircle2 size={30} /><strong>No content waiting for review</strong><span>Your team will share new drafts here.</span></div> : (
        <div className="client-portal-layout">
          <section className="client-review-list"><div className="client-section-title"><strong>Needs your review</strong><span>{items.length} item{items.length === 1 ? '' : 's'}</span></div>{items.map((item) => <button type="button" key={item.id} className={`client-review-item ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><span>{item.client} · {item.brand}</span><small>{item.status}</small></button>)}</section>
          {selected && <section className="client-review-detail"><div className="client-review-detail-head"><div><span>{selected.client} · {selected.brand}</span><h3>{selected.title}</h3></div><span className="client-review-status">{selected.status}</span></div><div className="client-review-copy"><h4>Brief</h4><p>{selected.brief || 'No brief provided.'}</p>{selected.assetsLink && <a href={selected.assetsLink} target="_blank" rel="noreferrer">Open shared assets</a>}</div><div className="client-comments"><h4><MessageSquare size={15} /> Feedback & discussion ({selectedComments.length})</h4>{selectedComments.map((entry) => <div className="client-comment" key={entry.id}><strong>{entry.author}</strong><span>{entry.text}</span></div>)}{selectedComments.length === 0 && <p className="client-muted">No feedback yet. Start the conversation below.</p>}<form onSubmit={submitComment}><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write feedback for the team..." rows={3} /><button className="btn btn-secondary" disabled={saving || !comment.trim()}><Send size={14} /> Send feedback</button></form></div><div className="client-review-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => updateReview('Changes Requested')}><Undo2 size={14} /> Request changes</button><button className="btn btn-primary" disabled={saving} onClick={() => updateReview('Approved')}><CheckCircle2 size={14} /> Approve</button></div></section>}
        </div>
      )}
    </main>
  );
};
