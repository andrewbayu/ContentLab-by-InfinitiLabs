import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, FileText, Filter, Link2, MessageSquare, Search, Send, Undo2 } from 'lucide-react';
import type { CommentItem, ContentItem, TeamMember } from '../services/sheets';

interface ClientPortalProps {
  items: ContentItem[];
  comments: CommentItem[];
  team?: TeamMember[];
  currentUser: TeamMember;
  mode: 'overview' | 'review';
  reportsCount: number;
  onNavigateToReview: () => void;
  onUpdateItem: (item: ContentItem) => Promise<void>;
  onAddComment: (contentId: string, text: string, attachmentUrl?: string, mentionedUserIds?: string[]) => Promise<void>;
}

const isReadyForReview = (item: ContentItem) => item.status === 'Review/Editing';

export const ClientPortal: React.FC<ClientPortalProps> = ({
  items, comments, team = [], currentUser, mode, reportsCount, onNavigateToReview, onUpdateItem, onAddComment,
}) => {
  const contentItems = useMemo(() => items.filter((item) => item.taskType === 'Content'), [items]);
  const [selectedId, setSelectedId] = useState(contentItems[0]?.id || '');
  const [comment, setComment] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [saving, setSaving] = useState(false);

  const reviewItems = useMemo(() => contentItems.filter((item) => {
    const query = search.toLowerCase();
    return (!query || `${item.title} ${item.brand || ''} ${item.channel}`.toLowerCase().includes(query))
      && (statusFilter === 'All' || item.status === statusFilter);
  }), [contentItems, search, statusFilter]);
  const selected = reviewItems.find((item) => item.id === selectedId) || reviewItems[0];
  const selectedComments = useMemo(() => comments.filter((entry) => entry.contentId === selected?.id), [comments, selected?.id]);

  const awaitingReview = contentItems.filter(isReadyForReview);
  const approved = contentItems.filter((item) => item.status === 'Scheduled' || item.status === 'Published');
  const recent = [...contentItems].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 4);

  const availableTeamMembers = useMemo(() => team.filter((member) => member.role !== 'client'), [team]);

  const updateReview = async (approvedItem: boolean) => {
    if (!selected) return;
    setSaving(true);
    try {
      await onUpdateItem({ ...selected, status: approvedItem ? 'Scheduled' : 'Review/Editing', actorId: currentUser.id });
    } finally { setSaving(false); }
  };
  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    setSaving(true);
    try {
      const normalizedComment = comment.trim().toLowerCase();
      const activeMentionIds = mentionedUserIds.filter((id) => {
        const member = team.find((entry) => entry.id === id);
        return member && normalizedComment.includes(`@${member.name.toLowerCase()}`);
      });
      await onAddComment(selected.id, comment.trim(), attachmentUrl.trim() || undefined, activeMentionIds);
      setComment('');
      setAttachmentUrl('');
      setMentionedUserIds([]);
    } finally { setSaving(false); }
  };

  const handleInsertMention = (member: TeamMember) => {
    setComment((prev) => {
      // Replace a trailing partial "@query" (what the user is typing) so we never produce "@@name".
      const base = prev.replace(/@[^\s@]*$/, '');
      const needsSpace = base.length > 0 && !/\s$/.test(base);
      return `${base}${needsSpace ? ' ' : ''}@${member.name} `;
    });
    setMentionedUserIds((current) => current.includes(member.id) ? current : [...current, member.id]);
  };

  if (mode === 'overview') {
    return <main className="client-portal page-container">
      <div className="client-portal-heading">
        <div><span className="analytics-eyebrow">Client workspace</span><h2>Welcome, {currentUser.name}</h2><p>A clear view of what needs your attention.</p></div>
        <span className="client-portal-scope">{currentUser.client || 'Your workspace'}</span>
      </div>
      <section className="client-summary-grid" aria-label="Workspace summary">
        <article className="client-summary-card summary-action"><ClipboardCheck size={20} /><div><span>Needs your review</span><strong>{awaitingReview.length}</strong><small>{awaitingReview.length ? 'Content ready for feedback' : 'Nothing waiting right now'}</small></div></article>
        <article className="client-summary-card"><CheckCircle2 size={20} /><div><span>Approved / scheduled</span><strong>{approved.length}</strong><small>Content moving forward</small></div></article>
        <article className="client-summary-card"><FileText size={20} /><div><span>Shared reports</span><strong>{reportsCount}</strong><small>Files available to your team</small></div></article>
      </section>
      <section className="client-overview-panel">
        <div className="client-overview-panel-copy"><span className="analytics-eyebrow">Next step</span><h3>{awaitingReview.length ? `${awaitingReview.length} item${awaitingReview.length === 1 ? '' : 's'} ready for your review` : 'You are all caught up'}</h3><p>{awaitingReview.length ? 'Open Content Review to approve a draft or tell the team what to revise.' : 'New content shared by the team will appear here when it is ready.'}</p></div>
        <button type="button" className="btn btn-primary" onClick={onNavigateToReview}><ClipboardCheck size={15} /> Open Content Review</button>
      </section>
      <section className="client-latest-panel">
        <div className="client-section-title"><strong>Latest shared work</strong><button type="button" className="client-text-action" onClick={onNavigateToReview}>View all <ArrowRight size={14} /></button></div>
        {recent.length ? <div className="client-latest-list">{recent.map((item) => <button type="button" key={item.id} className="client-latest-row" onClick={onNavigateToReview}><div><strong>{item.title}</strong><span>{item.brand || item.client} · {item.channel}</span></div><span className={isReadyForReview(item) ? 'client-status-ready' : 'client-status-neutral'}>{isReadyForReview(item) ? 'Ready for review' : item.status}</span></button>)}</div> : <div className="client-overview-empty"><CheckCircle2 size={25} /><strong>No shared content yet</strong><span>Your team will add content for review here.</span></div>}
      </section>
    </main>;
  }

  return <main className="client-portal page-container">
    <div className="client-portal-heading"><div><span className="analytics-eyebrow">Content Review</span><h2>Review shared content</h2><p>Approve drafts or send clear feedback to the team.</p></div><span className="client-portal-scope">{currentUser.client || 'Your workspace'}</span></div>
    {contentItems.length === 0 ? <div className="client-portal-empty"><CheckCircle2 size={30} /><strong>No content ready for review</strong><span>Your team will share new drafts here.</span></div> : <div className="client-portal-layout">
      <section className="client-review-list"><div className="client-section-title"><strong>Shared content</strong><span>{reviewItems.length} of {contentItems.length}</span></div><div className="client-review-filters"><label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search content..." /></label><label><Filter size={14} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Idea</option><option>Review/Editing</option><option>Scheduled</option><option>Published</option></select></label></div>{reviewItems.length === 0 ? <p className="client-muted client-filter-empty">No matching content.</p> : reviewItems.map((item) => <button type="button" key={item.id} className={`client-review-item ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><span>{item.brand || item.client} · {item.channel}</span><small>{isReadyForReview(item) ? 'Ready for review' : item.status}</small></button>)}</section>
      {selected && <section className="client-review-detail"><div className="client-review-detail-head"><div><span>{selected.brand || selected.client} · {selected.channel}</span><h3>{selected.title}</h3></div><span className="client-review-status">{isReadyForReview(selected) ? 'Ready for review' : selected.status}</span></div><div className="client-review-copy"><h4>Brief</h4><p>{selected.brief || 'No brief provided.'}</p>{selected.publishDate && <small>Planned publish date: {selected.publishDate}</small>}{selected.assetsLink && <a href={selected.assetsLink} target="_blank" rel="noreferrer">Open shared assets</a>}</div><div className="client-comments"><h4><MessageSquare size={15} /> Feedback & discussion ({selectedComments.length})</h4>{selectedComments.map((entry) => <div className="client-comment" key={entry.id}><strong>{entry.author}</strong><span>{entry.text}</span>{entry.attachmentUrl && <a href={entry.attachmentUrl} target="_blank" rel="noreferrer"><Link2 size={12} /> Open attachment</a>}</div>)}{selectedComments.length === 0 && <p className="client-muted">No feedback yet. Start the conversation below.</p>}<form onSubmit={submitComment}>{availableTeamMembers.length > 0 && <div className="task-mention-suggestions" style={{ marginBottom: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', marginRight: '6px' }}>Mention team:</span>{availableTeamMembers.map((member) => <button key={member.id} type="button" className="tag-select-pill" onClick={() => handleInsertMention(member)} style={{ padding: '1px 6px', fontSize: '10px', borderStyle: 'dashed' }}>{member.name}</button>)}</div>}<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write feedback for the team..." rows={3} /><input className="client-attachment-input" type="url" value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} placeholder="Optional Google Drive attachment link" /><button className="btn btn-secondary" disabled={saving || !comment.trim()}><Send size={14} /> Send feedback</button></form></div><div className="client-review-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => updateReview(false)}><Undo2 size={14} /> Request changes</button><button className="btn btn-primary" disabled={saving} onClick={() => updateReview(true)}><CheckCircle2 size={14} /> Approve</button></div></section>}
    </div>}
  </main>;
};
