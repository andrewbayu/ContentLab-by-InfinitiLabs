import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Link2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Undo2,
  User,
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
  const [selectedId, setSelectedId] = useState(contentItems[0]?.id || '');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
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

  const handleSelectItem = (id: string) => {
    setSelectedId(id);
    setMobileDetailOpen(true);
  };

  const updateReview = async (approvedItem: boolean) => {
    if (!selected) return;
    setSaving(true);
    try {
      await onUpdateItem({ ...selected, status: approvedItem ? 'Scheduled' : 'Review/Editing', actorId: currentUser.id });
    } finally {
      setSaving(false);
    }
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

  if (mode === 'overview') {
    return (
      <main className="client-portal page-container">
        <div className="client-portal-heading">
          <div>
            <span className="analytics-eyebrow">Client Workspace</span>
            <h2>Welcome back, {currentUser.name}</h2>
            <p>Ringkasan konten dan pekerjaan yang memerlukan perhatian Anda.</p>
          </div>
          <span className="client-portal-scope">{currentUser.client || 'Workspace Klien'}</span>
        </div>

        <section className="client-summary-grid" aria-label="Workspace summary">
          <article className="client-summary-card summary-action" onClick={onNavigateToReview} role="button" tabIndex={0}>
            <ClipboardCheck size={22} />
            <div>
              <span>Perlu Review Anda</span>
              <strong>{awaitingReview.length} Konten</strong>
              <small>{awaitingReview.length ? 'Draft siap disetujui atau direvisi' : 'Belum ada antrean review'}</small>
            </div>
          </article>
          <article className="client-summary-card">
            <CheckCircle2 size={22} />
            <div>
              <span>Disetujui / Jadwal</span>
              <strong>{approved.length} Konten</strong>
              <small>Konten berjalan sesuai jadwal</small>
            </div>
          </article>
          <article className="client-summary-card">
            <FileText size={22} />
            <div>
              <span>Laporan Berbagi</span>
              <strong>{reportsCount} Laporan</strong>
              <small>Dokumen & laporan kinerja</small>
            </div>
          </article>
        </section>

        <section className="client-overview-panel">
          <div className="client-overview-panel-copy">
            <span className="analytics-eyebrow">Langkah Selanjutnya</span>
            <h3>
              {awaitingReview.length
                ? `${awaitingReview.length} konten siap untuk di-review`
                : 'Semua pekerjaan saat ini sudah selesai di-review'}
            </h3>
            <p>
              {awaitingReview.length
                ? 'Buka Review Konten untuk melihat draft, memberikan masukan, atau menyetujui jadwal publikasi.'
                : 'Draft baru dari tim akan otomatis muncul di sini begitu siap di-review.'}
            </p>
          </div>
          <button type="button" className="btn btn-primary client-main-action-btn" onClick={onNavigateToReview}>
            <ClipboardCheck size={16} /> Buka Review Konten
          </button>
        </section>

        <section className="client-latest-panel">
          <div className="client-section-title">
            <strong><Sparkles size={16} /> Perubahan & Draf Terbaru</strong>
            <button type="button" className="client-text-action" onClick={onNavigateToReview}>
              Lihat semua <ArrowRight size={14} />
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
                    handleSelectItem(item.id);
                    onNavigateToReview();
                  }}
                >
                  <div className="client-latest-info">
                    <strong>{item.title}</strong>
                    <span>{item.brand || item.client} · {item.channel}</span>
                  </div>
                  <span className={isReadyForReview(item) ? 'client-status-badge ready' : 'client-status-badge neutral'}>
                    {isReadyForReview(item) ? 'Siap Review' : item.status}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="client-overview-empty">
              <CheckCircle2 size={28} />
              <strong>Belum ada konten yang dibagikan</strong>
              <span>Tim akan menambahkan konten di sini begitu draft awal disiapkan.</span>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="client-portal page-container">
      <div className="client-portal-heading">
        <div>
          <span className="analytics-eyebrow">Content Review</span>
          <h2>Review & Feedback Konten</h2>
          <p>Tinjau draft, berikan masukan ke tim, atau setujui untuk dipublikasikan.</p>
        </div>
        <span className="client-portal-scope">{currentUser.client || 'Workspace Klien'}</span>
      </div>

      {contentItems.length === 0 ? (
        <div className="client-portal-empty">
          <CheckCircle2 size={32} />
          <strong>Belum ada konten untuk di-review</strong>
          <span>Draft baru yang dibuat oleh tim akan muncul di sini.</span>
        </div>
      ) : (
        <div className={`client-portal-layout ${mobileDetailOpen ? 'mobile-detail-active' : 'mobile-list-active'}`}>
          {/* List Sidebar Section */}
          <section className="client-review-list">
            <div className="client-section-title">
              <strong>Daftar Konten</strong>
              <span>{reviewItems.length} dari {contentItems.length}</span>
            </div>

            <div className="client-review-filters">
              <label className="client-search-box">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul, brand, atau channel..."
                />
              </label>
              <label className="client-filter-box">
                <Filter size={14} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="All">Semua Status</option>
                  <option value="Review/Editing">Review/Editing (Perlu Action)</option>
                  <option value="Idea">Idea</option>
                  <option value="Scheduled">Scheduled (Disetujui)</option>
                  <option value="Published">Published</option>
                </select>
              </label>
            </div>

            {reviewItems.length === 0 ? (
              <p className="client-muted client-filter-empty">Tidak ada konten yang sesuai dengan pencarian.</p>
            ) : (
              <div className="client-review-scroll-list">
                {reviewItems.map((item) => {
                  const isSelected = selected?.id === item.id;
                  const isPending = isReadyForReview(item);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`client-review-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectItem(item.id)}
                    >
                      <div className="client-review-item-header">
                        <strong>{item.title}</strong>
                        <span className={`client-status-pill ${isPending ? 'pending' : 'normal'}`}>
                          {isPending ? 'Perlu Review' : item.status}
                        </span>
                      </div>
                      <div className="client-review-item-meta">
                        <span>{item.brand || item.client || 'General'} · {item.channel}</span>
                        {item.publishDate && <small><Calendar size={11} /> {item.publishDate}</small>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Detail Review Section */}
          {selected ? (
            <section className="client-review-detail">
              {/* Mobile Back Button Header */}
              <button
                type="button"
                className="client-mobile-back-btn"
                onClick={() => setMobileDetailOpen(false)}
              >
                <ArrowLeft size={16} /> Kembali ke Daftar Konten
              </button>

              <div className="client-review-detail-head">
                <div>
                  <div className="client-meta-chips">
                    <span className="client-chip brand">{selected.brand || selected.client || 'Brand'}</span>
                    <span className="client-chip channel">{selected.channel}</span>
                  </div>
                  <h3>{selected.title}</h3>
                </div>
                <span className={`client-status-badge-lg ${isReadyForReview(selected) ? 'ready' : 'standard'}`}>
                  {isReadyForReview(selected) ? 'Perlu Review Anda' : selected.status}
                </span>
              </div>

              {/* Cover Image Preview (if present) */}
              {selected.coverImageUrl && (
                <div className="client-cover-preview">
                  <img src={selected.coverImageUrl} alt={selected.title} loading="lazy" />
                </div>
              )}

              {/* Brief & Assets */}
              <div className="client-review-copy">
                <h4>Brief Konten</h4>
                <p>{selected.brief || 'Belum ada ringkasan brief yang diberikan.'}</p>

                <div className="client-review-meta-row">
                  {selected.publishDate && (
                    <span className="client-meta-item">
                      <Clock size={13} /> Rencana Publikasi: <strong>{selected.publishDate}</strong>
                    </span>
                  )}
                  {selected.assetsLink && (
                    <a href={selected.assetsLink} target="_blank" rel="noreferrer" className="client-asset-link-btn">
                      <ExternalLink size={13} /> Buka Shared Assets (Google Drive)
                    </a>
                  )}
                </div>
              </div>

              {/* Comments & Discussion */}
              <div className="client-comments">
                <h4>
                  <MessageSquare size={16} /> Diskusi & Feedback ({selectedComments.length})
                </h4>

                <div className="client-comments-list">
                  {selectedComments.map((entry) => (
                    <div className="client-comment-card" key={entry.id}>
                      <div className="client-comment-header">
                        <div className="client-comment-author">
                          <div className="client-avatar-badge">{entry.author.charAt(0).toUpperCase()}</div>
                          <strong>{entry.author}</strong>
                        </div>
                        <span className="client-comment-date">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="client-comment-text">{entry.text}</p>
                      {entry.attachmentUrl && (
                        <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="client-comment-attachment">
                          <Link2 size={12} /> Buka Lampiran File
                        </a>
                      )}
                    </div>
                  ))}
                  {selectedComments.length === 0 && (
                    <p className="client-muted client-empty-comments">Belum ada feedback. Tuliskan pesan untuk tim di bawah ini.</p>
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={submitComment} className="client-comment-form">
                  {availableTeamMembers.length > 0 && (
                    <div className="client-mention-bar">
                      <span className="client-mention-label"><User size={11} /> Tag anggota tim:</span>
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
                    placeholder="Tuliskan saran, revisi, atau catatan untuk tim..."
                    rows={3}
                  />
                  <input
                    className="client-attachment-input"
                    type="url"
                    value={attachmentUrl}
                    onChange={(event) => setAttachmentUrl(event.target.value)}
                    placeholder="Tautan lampiran Google Drive (Opsional)"
                  />
                  <button type="submit" className="btn btn-secondary client-submit-btn" disabled={saving || !comment.trim()}>
                    <Send size={14} /> {saving ? 'Mengirim...' : 'Kirim Feedback'}
                  </button>
                </form>
              </div>

              {/* Review Action Buttons */}
              <div className="client-review-actions">
                <button
                  type="button"
                  className="btn btn-secondary client-action-btn reject"
                  disabled={saving}
                  onClick={() => updateReview(false)}
                >
                  <Undo2 size={16} /> Minta Revisi
                </button>
                <button
                  type="button"
                  className="btn btn-primary client-action-btn approve"
                  disabled={saving}
                  onClick={() => updateReview(true)}
                >
                  <CheckCircle2 size={16} /> Setujui Konten
                </button>
              </div>
            </section>
          ) : (
            <div className="client-portal-empty">
              <CheckCircle2 size={30} />
              <strong>Pilih konten untuk di-review</strong>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

