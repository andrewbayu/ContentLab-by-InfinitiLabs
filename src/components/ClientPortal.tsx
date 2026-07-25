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

  // Modal review state: selected item to view in modal
  const [selectedModalItem, setSelectedModalItem] = useState<ContentItem | null>(null);

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

  const activeComments = useMemo(() => {
    if (!selectedModalItem) return [];
    return comments.filter((entry) => entry.contentId === selectedModalItem.id);
  }, [comments, selectedModalItem]);

  const awaitingReview = contentItems.filter(isReadyForReview);
  const approved = contentItems.filter((item) => item.status === 'Scheduled' || item.status === 'Published');
  const recent = [...contentItems].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 4);

  const availableTeamMembers = useMemo(() => team.filter((member) => member.role !== 'client'), [team]);

  const updateReview = async (approvedItem: boolean) => {
    if (!selectedModalItem) return;
    setSaving(true);
    try {
      const updated = {
        ...selectedModalItem,
        status: approvedItem ? 'Scheduled' : 'Review/Editing' as ContentItem['status'],
        actorId: currentUser.id,
      };
      await onUpdateItem(updated);
      setSelectedModalItem(updated);
    } finally {
      setSaving(false);
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedModalItem || !comment.trim()) return;
    setSaving(true);
    try {
      const normalizedComment = comment.trim().toLowerCase();
      const activeMentionIds = mentionedUserIds.filter((id) => {
        const member = team.find((entry) => entry.id === id);
        return member && normalizedComment.includes(`@${member.name.toLowerCase()}`);
      });
      await onAddComment(selectedModalItem.id, comment.trim(), attachmentUrl.trim() || undefined, activeMentionIds);
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
                    setSelectedModalItem(item);
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

  // REVIEW MODE
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

      {/* Toolbar Controls: Search, Filter, View Mode Toggle */}
      <div className="client-toolbar">
        <div className="client-toolbar-filters">
          <label className="client-search-box">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, brand, atau channel..."
            />
          </label>
          <label className="client-filter-box">
            <Filter size={15} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">Semua Status ({contentItems.length})</option>
              <option value="Review/Editing">Review/Editing (Perlu Review)</option>
              <option value="Idea">Idea</option>
              <option value="Scheduled">Scheduled (Disetujui)</option>
              <option value="Published">Published</option>
            </select>
          </label>
        </div>

        <div className="client-toolbar-actions">
          <span className="client-count-chip">{reviewItems.length} Konten</span>
          <div className="client-view-toggle-group">
            <button
              type="button"
              className={`client-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Tampilan Tabel List"
            >
              <List size={16} /> Tabel List
            </button>
            <button
              type="button"
              className={`client-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Tampilan Cards 3 Kolom"
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
          <strong>Tidak ada konten yang sesuai</strong>
          <span>Coba ubah kata kunci pencarian atau filter status.</span>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (DEFAULT) */
        <div className="client-table-wrapper">
          <table className="client-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Judul Konten & Brand</th>
                <th style={{ width: '15%' }}>Channel</th>
                <th style={{ width: '18%' }}>Status</th>
                <th style={{ width: '17%' }}>Rencana Publikasi</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {reviewItems.map((item) => {
                const isPending = isReadyForReview(item);
                return (
                  <tr
                    key={item.id}
                    className="client-table-row"
                    onClick={() => setSelectedModalItem(item)}
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
                        {isPending ? 'Perlu Review' : item.status}
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
                          setSelectedModalItem(item);
                        }}
                      >
                        Tinjau
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
                onClick={() => setSelectedModalItem(item)}
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
                    {item.brief ? item.brief : 'Belum ada ringkasan brief.'}
                  </p>
                </div>
                <div className="client-card-footer">
                  <span className={`client-status-pill ${isPending ? 'pending' : 'normal'}`}>
                    {isPending ? 'Perlu Review' : item.status}
                  </span>
                  <button type="button" className="btn btn-secondary btn-sm">
                    Tinjau
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* DETAIL & REVIEW MODAL OVERLAY */}
      {selectedModalItem && (
        <div className="client-modal-backdrop" onClick={() => setSelectedModalItem(null)}>
          <div className="client-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="client-modal-header">
              <div className="client-modal-header-info">
                <div className="client-meta-chips">
                  <span className="client-chip brand">{selectedModalItem.brand || selectedModalItem.client || 'Brand'}</span>
                  <span className="client-chip channel">{selectedModalItem.channel}</span>
                </div>
                <h3>{selectedModalItem.title}</h3>
              </div>
              <div className="client-modal-header-actions">
                <span className={`client-status-badge-lg ${isReadyForReview(selectedModalItem) ? 'ready' : 'standard'}`}>
                  {isReadyForReview(selectedModalItem) ? 'Perlu Review Anda' : selectedModalItem.status}
                </span>
                <button
                  type="button"
                  className="client-modal-close-btn"
                  onClick={() => setSelectedModalItem(null)}
                  title="Tutup Modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="client-modal-body">
              {/* Cover Image Preview */}
              {selectedModalItem.coverImageUrl && (
                <div className="client-cover-preview">
                  <img src={selectedModalItem.coverImageUrl} alt={selectedModalItem.title} loading="lazy" />
                </div>
              )}

              {/* Brief & Assets */}
              <div className="client-review-copy">
                <h4>Brief Konten</h4>
                <p>{selectedModalItem.brief || 'Belum ada ringkasan brief yang diberikan.'}</p>

                <div className="client-review-meta-row">
                  {selectedModalItem.publishDate && (
                    <span className="client-meta-item">
                      <Clock size={14} /> Rencana Publikasi: <strong>{selectedModalItem.publishDate}</strong>
                    </span>
                  )}
                  {selectedModalItem.assetsLink && (
                    <a href={selectedModalItem.assetsLink} target="_blank" rel="noreferrer" className="client-asset-link-btn">
                      <ExternalLink size={14} /> Buka Shared Assets (Google Drive)
                    </a>
                  )}
                </div>
              </div>

              {/* Discussion & Feedback */}
              <div className="client-comments">
                <h4>
                  <MessageSquare size={16} /> Diskusi & Feedback ({activeComments.length})
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
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="client-comment-text">{entry.text}</p>
                      {entry.attachmentUrl && (
                        <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="client-comment-attachment">
                          <Link2 size={13} /> Buka Lampiran File
                        </a>
                      )}
                    </div>
                  ))}
                  {activeComments.length === 0 && (
                    <p className="client-muted client-empty-comments">Belum ada feedback. Tuliskan masukan untuk tim di bawah ini.</p>
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={submitComment} className="client-comment-form">
                  {availableTeamMembers.length > 0 && (
                    <div className="client-mention-bar">
                      <span className="client-mention-label"><User size={12} /> Tag anggota tim:</span>
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
            </div>

            <div className="client-modal-footer">
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
          </div>
        </div>
      )}
    </main>
  );
};

