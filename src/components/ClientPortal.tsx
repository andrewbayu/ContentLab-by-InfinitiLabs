import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  LayoutGrid,
  Link2,
  List,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Undo2,
  User,
  X,
} from 'lucide-react';
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
  items,
  comments,
  team = [],
  currentUser,
  mode,
  reportsCount,
  onNavigateToReview,
  onUpdateItem,
  onAddComment,
}) => {
  const contentItems = useMemo(() => items.filter((item) => item.taskType === 'Content'), [items]);

  // View mode state: 'table' (default) or 'cards'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Drawer review state: selected item to view in right-side drawer
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<ContentItem | null>(null);

  const [comment, setComment] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [saving, setSaving] = useState(false);

  // Dynamically extract all available statuses present in contentItems + counts
  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    contentItems.forEach((item) => {
      if (item.status) {
        counts[item.status] = (counts[item.status] || 0) + 1;
      }
    });

    const standardOrder: ContentItem['status'][] = [
      'Idea',
      'Scripting/Writing',
      'Production/Design',
      'Review/Editing',
      'Scheduled',
      'Published',
      'To Do',
      'In Progress',
      'Done',
    ];

    const allStatuses = new Set<string>([
      ...standardOrder.filter((s) => counts[s]),
      ...Object.keys(counts),
    ]);

    return Array.from(allStatuses).map((status) => ({
      status,
      count: counts[status] || 0,
      label: status === 'Review/Editing'
        ? 'Review/Editing (Needs Action)'
        : status === 'Scheduled'
        ? 'Scheduled (Approved)'
        : status,
    }));
  }, [contentItems]);

  const reviewItems = useMemo(() => contentItems.filter((item) => {
    const query = search.toLowerCase();
    return (!query || `${item.title} ${item.brand || ''} ${item.channel}`.toLowerCase().includes(query))
      && (statusFilter === 'All' || item.status === statusFilter);
  }), [contentItems, search, statusFilter]);

  const activeComments = useMemo(() => {
    if (!selectedDrawerItem) return [];
    return comments.filter((entry) => entry.contentId === selectedDrawerItem.id);
  }, [comments, selectedDrawerItem]);

  const awaitingReview = contentItems.filter(isReadyForReview);
  const approved = contentItems.filter((item) => item.status === 'Scheduled' || item.status === 'Published');
  const recent = [...contentItems].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 4);

  const availableTeamMembers = useMemo(() => team.filter((member) => member.role !== 'client'), [team]);

  const updateReview = async (approvedItem: boolean) => {
    if (!selectedDrawerItem) return;
    setSaving(true);
    try {
      const updated = {
        ...selectedDrawerItem,
        status: approvedItem ? 'Scheduled' : 'Review/Editing' as ContentItem['status'],
        actorId: currentUser.id,
      };
      await onUpdateItem(updated);
      setSelectedDrawerItem(updated);
    } finally {
      setSaving(false);
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDrawerItem || !comment.trim()) return;
    setSaving(true);
    try {
      const normalizedComment = comment.trim().toLowerCase();
      const activeMentionIds = mentionedUserIds.filter((id) => {
        const member = team.find((entry) => entry.id === id);
        return member && normalizedComment.includes(`@${member.name.toLowerCase()}`);
      });
      await onAddComment(selectedDrawerItem.id, comment.trim(), attachmentUrl.trim() || undefined, activeMentionIds);
      setComment('');
      setAttachmentUrl('');
      setMentionedUserIds([]);
    } finally {
      setSaving(false);
    }
  };

  const handleInsertMention = (member: TeamMember) => {
    setComment((prev) => {
      const base = prev.replace(/@[^\s@]*$/, '');
      const needsSpace = base.length > 0 && !/\s$/.test(base);
      return `${base}${needsSpace ? ' ' : ''}@${member.name} `;
    });
    setMentionedUserIds((current) => (current.includes(member.id) ? current : [...current, member.id]));
  };

  // OVERVIEW MODE
  if (mode === 'overview') {
    return (
      <main className="client-portal page-container">
        <div className="client-portal-heading">
          <div>
            <span className="analytics-eyebrow">Client Workspace</span>
            <h2>Welcome back, {currentUser.name}</h2>
            <p>A clear view of content ready for review and team activity.</p>
          </div>
          <span className="client-portal-scope">{currentUser.client || 'Client Workspace'}</span>
        </div>

        <section className="client-summary-grid" aria-label="Workspace summary">
          <article className="client-summary-card summary-action" onClick={onNavigateToReview} role="button" tabIndex={0}>
            <ClipboardCheck size={22} />
            <div>
              <span>Needs Your Review</span>
              <strong>{awaitingReview.length} Items</strong>
              <small>{awaitingReview.length ? 'Content ready for feedback' : 'No items waiting for review'}</small>
            </div>
          </article>
          <article className="client-summary-card">
            <CheckCircle2 size={22} />
            <div>
              <span>Approved / Scheduled</span>
              <strong>{approved.length} Items</strong>
              <small>Content moving forward on schedule</small>
            </div>
          </article>
          <article className="client-summary-card">
            <FileText size={22} />
            <div>
              <span>Shared Reports</span>
              <strong>{reportsCount} Files</strong>
              <small>Documents & performance reports</small>
            </div>
          </article>
        </section>

        <section className="client-overview-panel">
          <div className="client-overview-panel-copy">
            <span className="analytics-eyebrow">Next Step</span>
            <h3>
              {awaitingReview.length
                ? `${awaitingReview.length} item${awaitingReview.length === 1 ? '' : 's'} ready for your review`
                : 'You are all caught up'}
            </h3>
            <p>
              {awaitingReview.length
                ? 'Open Content Review to approve drafts or request revisions from the team.'
                : 'New content shared by the team will appear here when ready.'}
            </p>
          </div>
          <button type="button" className="btn btn-primary client-main-action-btn" onClick={onNavigateToReview}>
            <ClipboardCheck size={16} /> Open Content Review
          </button>
        </section>

        <section className="client-latest-panel">
          <div className="client-section-title">
            <strong><Sparkles size={16} /> Latest Shared Work</strong>
            <button type="button" className="client-text-action" onClick={onNavigateToReview}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          {recent.length ? (
            <div className="client-latest-list">
              {recent.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="client-latest-row"
                  onClick={() => {
                    setSelectedDrawerItem(item);
                    onNavigateToReview();
                  }}
                >
                  <div className="client-latest-info">
                    <strong>{item.title}</strong>
                    <span>{item.brand || item.client} · {item.channel}</span>
                  </div>
                  <span className={isReadyForReview(item) ? 'client-status-badge ready' : 'client-status-badge neutral'}>
                    {isReadyForReview(item) ? 'Ready for Review' : item.status}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="client-overview-empty">
              <CheckCircle2 size={28} />
              <strong>No shared content yet</strong>
              <span>Your team will add content here when initial drafts are ready.</span>
            </div>
          )}
        </section>
      </main>
    );
  }

  // REVIEW MODE
  return (
    <main className="client-portal page-container">
      <div className="client-portal-heading">
        <div>
          <span className="analytics-eyebrow">Content Review</span>
          <h2>Review & Feedback</h2>
          <p>Review drafts, provide feedback to the team, or approve content for publishing.</p>
        </div>
        <span className="client-portal-scope">{currentUser.client || 'Client Workspace'}</span>
      </div>

      {/* Toolbar Controls: Search, Filter, View Mode Toggle */}
      <div className="client-toolbar">
        <div className="client-toolbar-filters">
          <label className="client-search-box">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, brand, or channel..."
            />
          </label>
          <label className="client-filter-box">
            <Filter size={15} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All Statuses ({contentItems.length})</option>
              {statusOptions.map((opt) => (
                <option key={opt.status} value={opt.status}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="client-toolbar-actions">
          <span className="client-count-chip">{reviewItems.length} Content Items</span>
          <div className="client-view-toggle-group">
            <button
              type="button"
              className={`client-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} /> Table View
            </button>
            <button
              type="button"
              className={`client-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards Grid View"
            >
              <LayoutGrid size={16} /> Cards Grid
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {reviewItems.length === 0 ? (
        <div className="client-portal-empty">
          <CheckCircle2 size={32} />
          <strong>No matching content found</strong>
          <span>Try adjusting your search query or status filter.</span>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (DEFAULT) */
        <div className="client-table-wrapper">
          <table className="client-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Title & Brand</th>
                <th style={{ width: '15%' }}>Channel</th>
                <th style={{ width: '18%' }}>Status</th>
                <th style={{ width: '17%' }}>Publish Date</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviewItems.map((item) => {
                const isPending = isReadyForReview(item);
                return (
                  <tr
                    key={item.id}
                    className="client-table-row"
                    onClick={() => setSelectedDrawerItem(item)}
                  >
                    <td>
                      <div className="client-table-title-cell">
                        <strong className="client-table-title" title={item.title}>{item.title}</strong>
                        <span className="client-table-sub">{item.brand || item.client || 'General'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="client-channel-badge">{item.channel}</span>
                    </td>
                    <td>
                      <span className={`client-status-pill ${isPending ? 'pending' : 'normal'}`}>
                        {isPending ? 'Needs Review' : item.status}
                      </span>
                    </td>
                    <td>
                      <span className="client-table-date">
                        {item.publishDate ? (
                          <><Calendar size={12} /> {item.publishDate}</>
                        ) : (
                          <span className="client-muted-text">-</span>
                        )}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm client-table-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDrawerItem(item);
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARDS 3-COLUMN GRID VIEW */
        <div className="client-cards-grid">
          {reviewItems.map((item) => {
            const isPending = isReadyForReview(item);
            return (
              <article
                key={item.id}
                className="client-grid-card"
                onClick={() => setSelectedDrawerItem(item)}
              >
                {item.coverImageUrl && (
                  <div className="client-card-cover-box">
                    <img src={item.coverImageUrl} alt={item.title} loading="lazy" />
                  </div>
                )}
                <div className="client-card-body">
                  <div className="client-card-meta-tags">
                    <span className="client-chip brand">{item.brand || item.client || 'Brand'}</span>
                    <span className="client-chip channel">{item.channel}</span>
                  </div>
                  <h4 className="client-card-title">{item.title}</h4>
                  <p className="client-card-brief">
                    {item.brief ? item.brief : 'No brief provided.'}
                  </p>
                </div>
                <div className="client-card-footer">
                  <span className={`client-status-pill ${isPending ? 'pending' : 'normal'}`}>
                    {isPending ? 'Needs Review' : item.status}
                  </span>
                  <button type="button" className="btn btn-secondary btn-sm">
                    Review
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* RIGHT SIDE DRAWER (SLIDE-IN PANEL) */}
      {selectedDrawerItem && (
        <div className="client-drawer-backdrop" onClick={() => setSelectedDrawerItem(null)}>
          <div className="client-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="client-drawer-header">
              <div className="client-drawer-header-info">
                <div className="client-meta-chips">
                  <span className="client-chip brand">{selectedDrawerItem.brand || selectedDrawerItem.client || 'Brand'}</span>
                  <span className="client-chip channel">{selectedDrawerItem.channel}</span>
                </div>
                <h3>{selectedDrawerItem.title}</h3>
              </div>
              <div className="client-drawer-header-actions">
                <span className={`client-status-badge-lg ${isReadyForReview(selectedDrawerItem) ? 'ready' : 'standard'}`}>
                  {isReadyForReview(selectedDrawerItem) ? 'Needs Your Review' : selectedDrawerItem.status}
                </span>
                <button
                  type="button"
                  className="client-drawer-close-btn"
                  onClick={() => setSelectedDrawerItem(null)}
                  title="Close Panel"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="client-drawer-body">
              {/* Cover Image Preview */}
              {selectedDrawerItem.coverImageUrl && (
                <div className="client-cover-preview">
                  <img src={selectedDrawerItem.coverImageUrl} alt={selectedDrawerItem.title} loading="lazy" />
                </div>
              )}

              {/* Brief & Assets */}
              <div className="client-review-copy">
                <h4>Content Brief</h4>
                <p>{selectedDrawerItem.brief || 'No brief provided.'}</p>

                <div className="client-review-meta-row">
                  {selectedDrawerItem.publishDate && (
                    <span className="client-meta-item">
                      <Clock size={14} /> Planned Publish Date: <strong>{selectedDrawerItem.publishDate}</strong>
                    </span>
                  )}
                  {selectedDrawerItem.assetsLink && (
                    <a href={selectedDrawerItem.assetsLink} target="_blank" rel="noreferrer" className="client-asset-link-btn">
                      <ExternalLink size={14} /> Open Shared Assets (Google Drive)
                    </a>
                  )}
                </div>
              </div>

              {/* Discussion & Feedback */}
              <div className="client-comments">
                <h4>
                  <MessageSquare size={16} /> Discussion & Feedback ({activeComments.length})
                </h4>

                <div className="client-comments-list">
                  {activeComments.map((entry) => (
                    <div className="client-comment-card" key={entry.id}>
                      <div className="client-comment-header">
                        <div className="client-comment-author">
                          <div className="client-avatar-badge">{entry.author.charAt(0).toUpperCase()}</div>
                          <strong>{entry.author}</strong>
                        </div>
                        <span className="client-comment-date">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="client-comment-text">{entry.text}</p>
                      {entry.attachmentUrl && (
                        <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="client-comment-attachment">
                          <Link2 size={13} /> Open Attachment
                        </a>
                      )}
                    </div>
                  ))}
                  {activeComments.length === 0 && (
                    <p className="client-muted client-empty-comments">No feedback yet. Write a message for the team below.</p>
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={submitComment} className="client-comment-form">
                  {availableTeamMembers.length > 0 && (
                    <div className="client-mention-bar">
                      <span className="client-mention-label"><User size={12} /> Tag team members:</span>
                      <div className="client-mention-pills">
                        {availableTeamMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            className="client-tag-pill"
                            onClick={() => handleInsertMention(member)}
                          >
                            @{member.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Write feedback, revision requests, or notes for the team..."
                    rows={3}
                  />
                  <input
                    className="client-attachment-input"
                    type="url"
                    value={attachmentUrl}
                    onChange={(event) => setAttachmentUrl(event.target.value)}
                    placeholder="Optional Google Drive attachment link"
                  />
                  <button type="submit" className="btn btn-secondary client-submit-btn" disabled={saving || !comment.trim()}>
                    <Send size={14} /> {saving ? 'Sending...' : 'Send Feedback'}
                  </button>
                </form>
              </div>
            </div>

            <div className="client-drawer-footer">
              <button
                type="button"
                className="btn btn-secondary client-action-btn reject"
                disabled={saving}
                onClick={() => updateReview(false)}
              >
                <Undo2 size={16} /> Request Revision
              </button>
              <button
                type="button"
                className="btn btn-primary client-action-btn approve"
                disabled={saving}
                onClick={() => updateReview(true)}
              >
                <CheckCircle2 size={16} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

