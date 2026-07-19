import React, { useState, useEffect } from 'react';
import type { ContentItem, TeamMember, Channel, VariablesConfig, CommentItem } from '../services/sheets';
import { X, Trash2, Link, Check, RefreshCw, Send, MessageSquare, AtSign } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  item: ContentItem | null;
  initialStatus?: ContentItem['status'];
  team: TeamMember[];
  channels: Channel[];
  variablesConfig: VariablesConfig;
  customTags: string[];
  activeUser: string;
  comments: CommentItem[];
  onAddComment: (contentId: string, text: string) => void;
  onAddCreator: (name: string, email: string) => Promise<TeamMember>;
  onAddChannel: (name: string, color: string) => Promise<Channel>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  item,
  initialStatus,
  team,
  channels,
  variablesConfig,
  customTags,
  activeUser,
  comments,
  onAddComment,
  onAddCreator,
  onAddChannel,
}) => {
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [status, setStatus] = useState<ContentItem['status']>('Idea');
  const [channel, setChannel] = useState('');
  const [format, setFormat] = useState<ContentItem['format']>('Video');
  const [priority, setPriority] = useState<ContentItem['priority']>('Medium');
  const [assignee, setAssignee] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [assetsLink, setAssetsLink] = useState('');

  // Extra optional variables
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [platformNotes, setPlatformNotes] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Comment Thread state
  const [commentText, setCommentText] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  // Inline creation states
  const [showAddCreatorForm, setShowAddCreatorForm] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState('');
  const [newCreatorEmail, setNewCreatorEmail] = useState('');
  const [isAddingCreator, setIsAddingCreator] = useState(false);

  const [showAddChannelForm, setShowAddChannelForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelColor, setNewChannelColor] = useState('#2563eb');
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  // Filter comments for this specific item
  const itemComments = comments.filter((c) => c.contentId === item?.id);

  // Update form fields when modal opens or item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setBrief(item.brief);
      setStatus(item.status);
      setChannel(item.channel);
      setFormat(item.format);
      setPriority(item.priority || 'Medium');
      setAssignee(item.assignee);
      setPublishDate(item.publishDate || '');
      setAssetsLink(item.assetsLink || '');
      
      // Load optional fields
      const tagList = item.tags ? item.tags.split(',').filter(Boolean) : [];
      setSelectedTags(tagList);
      setBudget(item.budget || '');
      setPlatformNotes(item.platformNotes || '');
      setTargetAudience(item.targetAudience || '');
    } else {
      setTitle('');
      setBrief('');
      setStatus(initialStatus || 'Idea');
      setChannel(channels.length > 0 ? channels[0].name : '');
      setFormat('Video');
      setPriority('Medium');
      setAssignee(activeUser || (team.length > 0 ? team[0].name : ''));
      setPublishDate('');
      setAssetsLink('');
      
      // Reset optional fields
      setSelectedTags([]);
      setBudget('');
      setPlatformNotes('');
      setTargetAudience('');
    }
    // Reset nested forms & comment box
    setShowAddCreatorForm(false);
    setShowAddChannelForm(false);
    setCommentText('');
    setShowMentionSuggestions(false);
  }, [item, initialStatus, isOpen, team, channels, activeUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: item?.id,
      title,
      brief: variablesConfig.brief ? brief : '',
      status,
      channel,
      format,
      priority,
      assignee,
      publishDate: variablesConfig.publishDate ? publishDate : '',
      assetsLink,
      tags: variablesConfig.tags ? selectedTags.join(',') : '',
      budget: variablesConfig.budget ? budget : '',
      platformNotes: variablesConfig.platformNotes ? platformNotes : '',
      targetAudience: variablesConfig.targetAudience ? targetAudience : '',
    });
  };

  const handleDelete = () => {
    if (item && onDelete && window.confirm('Are you sure you want to delete this content plan?')) {
      onDelete(item.id);
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !commentText.trim()) return;
    onAddComment(item.id, commentText.trim());
    setCommentText('');
    setShowMentionSuggestions(false);
  };

  const handleInsertMention = (name: string) => {
    setCommentText((prev) => prev + `@${name} `);
    setShowMentionSuggestions(false);
  };

  // Safe Mention parser helper
  const renderCommentText = (text: string) => {
    let rendered: React.ReactNode[] = [text];
    
    team.forEach((member) => {
      const mentionStr = `@${member.name}`;
      const newRendered: React.ReactNode[] = [];
      
      rendered.forEach((node) => {
        if (typeof node === 'string') {
          const parts = node.split(mentionStr);
          parts.forEach((part, i) => {
            newRendered.push(part);
            if (i < parts.length - 1) {
              newRendered.push(
                <strong 
                  key={`${member.id}-${i}`}
                  style={{ 
                    color: 'var(--primary)', 
                    backgroundColor: 'rgba(37, 99, 235, 0.08)', 
                    padding: '1px 6px', 
                    borderRadius: '4px', 
                    border: '1px solid rgba(37, 99, 235, 0.15)', 
                    fontSize: '12px',
                    display: 'inline-block',
                    margin: '0 2px'
                  }}
                >
                  {mentionStr}
                </strong>
              );
            }
          });
        } else {
          newRendered.push(node);
        }
      });
      rendered = newRendered;
    });
    
    return rendered;
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Handle adding a creator inline
  const handleCreateCreatorSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCreatorName.trim()) return;

    setIsAddingCreator(true);
    try {
      const created = await onAddCreator(newCreatorName.trim(), newCreatorEmail.trim());
      setAssignee(created.name);
      setNewCreatorName('');
      setNewCreatorEmail('');
      setShowAddCreatorForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingCreator(false);
    }
  };

  // Handle adding a channel inline
  const handleCreateChannelSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    setIsAddingChannel(true);
    try {
      const created = await onAddChannel(newChannelName.trim(), newChannelColor);
      setChannel(created.name);
      setNewChannelName('');
      setNewChannelColor('#2563eb');
      setShowAddChannelForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingChannel(false);
    }
  };

  const handleChannelDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__add_new__') {
      setShowAddChannelForm(true);
    } else {
      setChannel(val);
      setShowAddChannelForm(false);
    }
  };

  const handleAssigneeDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__add_new__') {
      setShowAddCreatorForm(true);
    } else {
      setAssignee(val);
      setShowAddCreatorForm(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{item ? 'Edit Content Plan' : 'Create Content Plan'}</h3>
          <button className="btn btn-secondary btn-icon-only" style={{ border: 'none' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-wrapper">
          <div className={`modal-columns-container ${!item ? 'single-column' : ''}`}>
            
            {/* LEFT COLUMN: Main Form Editor Fields */}
            <div className="modal-column-left">
              {/* Multi-user creator track banner */}
              {item && item.createdBy && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-app)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '4px'
                }}>
                  Planned & Created by: <strong>{item.createdBy}</strong>
                </div>
              )}

              {/* Title */}
              <div className="form-group">
                <label className="form-label">Content Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 5 Tips for Video Recording"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Brief / Copy (Togglable) */}
              {variablesConfig.brief && (
                <div className="form-group">
                  <label className="form-label">Content Brief & Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Write outline, ideas, or brief visual layouts..."
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    style={{ minHeight: '120px' }}
                  />
                </div>
              )}

              {/* Status and Format Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Production Status</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContentItem['status'])}
                  >
                    <option value="Idea">Idea</option>
                    <option value="Scripting/Writing">Scripting/Writing</option>
                    <option value="Production/Design">Production/Design</option>
                    <option value="Review/Editing">Review/Editing</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Published">Published</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Content Format</label>
                  <select
                    className="form-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ContentItem['format'])}
                  >
                    <option value="Video">Video (Landscape)</option>
                    <option value="Short">Short / Reel / Vertical</option>
                    <option value="Carousel">Carousel Slider</option>
                    <option value="Graphic">Single Image/Infographic</option>
                    <option value="Article">Blog Post / Article</option>
                  </select>
                </div>
              </div>

              {/* Platform Channel Section with dynamic adding */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Publishing Channel</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-select"
                    value={channel}
                    onChange={handleChannelDropdownChange}
                    style={{ flexGrow: 1 }}
                  >
                    <option value="">Select Channel</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.name}>
                        {ch.name}
                      </option>
                    ))}
                    <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                      ➕ Add Custom Channel...
                    </option>
                  </select>
                </div>

                {/* Inline Add Channel Form */}
                {showAddChannelForm && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    border: '1px dashed var(--primary)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>Add New Platform Channel</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Threads, X, Pinterest"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        style={{ flexGrow: 1 }}
                      />
                      <input
                        type="color"
                        value={newChannelColor}
                        onChange={(e) => setNewChannelColor(e.target.value)}
                        style={{
                          width: '38px',
                          height: '38px',
                          padding: 0,
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: 'transparent'
                        }}
                        title="Choose Label Color"
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-icon-only"
                        onClick={handleCreateChannelSubmit}
                        disabled={isAddingChannel}
                      >
                        {isAddingChannel ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon-only"
                        onClick={() => setShowAddChannelForm(false)}
                        style={{ padding: '10px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Creator / Assignee Section with dynamic adding */}
              <div className="form-group">
                <label className="form-label">Creator / Assignee</label>
                <select
                  className="form-select"
                  value={assignee}
                  onChange={handleAssigneeDropdownChange}
                >
                  <option value="">Unassigned</option>
                  {team.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                  <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                    ➕ Add New Creator...
                  </option>
                </select>

                {/* Inline Add Creator Form */}
                {showAddCreatorForm && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    border: '1px dashed var(--primary)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>Add New Creator Crew</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Creator Name"
                        value={newCreatorName}
                        onChange={(e) => setNewCreatorName(e.target.value)}
                      />
                      <input
                        type="email"
                        className="form-input"
                        placeholder="Email Address"
                        value={newCreatorEmail}
                        onChange={(e) => setNewCreatorEmail(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-icon-only"
                        onClick={handleCreateCreatorSubmit}
                        disabled={isAddingCreator}
                      >
                        {isAddingCreator ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon-only"
                        onClick={() => setShowAddCreatorForm(false)}
                        style={{ padding: '10px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Publish Date (Togglable) & Priority Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ContentItem['priority'])}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {variablesConfig.publishDate ? (
                  <div className="form-group">
                    <label className="form-label">Target Publish Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="form-group" style={{ visibility: 'hidden' }} />
                )}
              </div>

              {/* Custom Tags Section (Togglable) */}
              {variablesConfig.tags && (
                <div className="form-group">
                  <label className="form-label">Campaign Tags (Select Multiple)</label>
                  <div className="tags-select-container">
                    {customTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <span
                          key={tag}
                          className={`tag-select-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleTagClick(tag)}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Budget / Cost (Togglable) */}
              {variablesConfig.budget && (
                <div className="form-group">
                  <label className="form-label">Production Budget (IDR / USD)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 500000 atau $50"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              )}

              {/* Platform Notes / Caption Draft (Togglable) */}
              {variablesConfig.platformNotes && (
                <div className="form-group">
                  <label className="form-label">Copywriting Caption & Hashtags</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Draft caption, tweet text, or posting hashtags..."
                    value={platformNotes}
                    onChange={(e) => setPlatformNotes(e.target.value)}
                    style={{ minHeight: '80px' }}
                  />
                </div>
              )}

              {/* Target Audience Persona (Togglable) */}
              {variablesConfig.targetAudience && (
                <div className="form-group">
                  <label className="form-label">Target Viewer Persona / Audience</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Pemula UX Design, Startup Founders"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </div>
              )}

              {/* Assets Link */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link size={14} />
                  Assets Link (Google Drive / Figma / Draft)
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://drive.google.com/..."
                  value={assetsLink}
                  onChange={(e) => setAssetsLink(e.target.value)}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Revision & Discussion Thread */}
            {item && (
              <div className="modal-column-right">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                  <MessageSquare size={16} className="text-secondary" />
                  <span>Discussion & Revisions ({itemComments.length})</span>
                </h4>

                {/* Comments Feed List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflowY: 'auto', paddingRight: '4px', minHeight: '150px' }}>
                  {itemComments.length > 0 ? (
                    itemComments.map((comm) => (
                      <div 
                        key={comm.id} 
                        style={{ 
                          display: 'flex', 
                          gap: '10px', 
                          backgroundColor: '#f8fafc', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div className="avatar-ring" style={{ width: '26px', height: '26px', fontSize: '11px', flexShrink: 0 }}>
                          {comm.author.charAt(0)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 650, color: 'var(--text-primary)' }}>{comm.author}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {new Date(comm.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {renderCommentText(comm.text)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border-subtle)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      Belum ada diskusi revisi. Mulai diskusi di bawah dengan me-mention crew!
                    </div>
                  )}
                </div>

                {/* Add Comment Input Form Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                  <textarea
                    className="form-textarea"
                    placeholder={activeUser ? "Ketik komentar diskusi atau catatan revisi..." : "Pilih profil Anda di kanan atas dahulu untuk berdiskusi"}
                    value={commentText}
                    onChange={(e) => {
                      setCommentText(e.target.value);
                      if (e.target.value.endsWith('@')) {
                        setShowMentionSuggestions(true);
                      } else if (!e.target.value.includes('@') || e.target.value.endsWith(' ')) {
                        setShowMentionSuggestions(false);
                      }
                    }}
                    disabled={!activeUser}
                    style={{ minHeight: '54px', padding: '8px', fontSize: '12px', resize: 'none' }}
                  />

                  {/* Mention Suggestor Toolbar Panel */}
                  {(showMentionSuggestions || commentText.includes('@')) && team.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <AtSign size={10} /> Mention:
                      </span>
                      {team.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          className="tag-select-pill"
                          onClick={() => handleInsertMention(member.name)}
                          style={{ padding: '1px 6px', fontSize: '10px', borderStyle: 'dashed' }}
                        >
                          {member.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Tip: Ketik @ atau klik nama di atas untuk mention
                    </span>
                    <button
                      type="button"
                      onClick={handleSendComment}
                      disabled={!activeUser || !commentText.trim()}
                      className="btn btn-primary"
                      style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                    >
                      <Send size={10} />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {item && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ marginRight: 'auto' }}
                onClick={handleDelete}
              >
                <Trash2 size={14} />
                Delete Plan
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {item ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
