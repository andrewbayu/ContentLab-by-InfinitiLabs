import React, { useState } from 'react';
import type { ContentItem, Channel, VariablesConfig } from '../services/sheets';
import { Calendar, Link, Plus, FileText, Video, RefreshCw, UserCheck } from 'lucide-react';

interface KanbanBoardProps {
  items: ContentItem[];
  channels: Channel[];
  variablesConfig: VariablesConfig;
  onMoveItem: (id: string, newStatus: ContentItem['status']) => void;
  onEditItem: (item: ContentItem) => void;
  onOpenCreateModalWithStatus: (status: ContentItem['status']) => void;
  activeUser: string;
}

const COLUMNS: { label: string; status: ContentItem['status'] }[] = [
  { label: 'Ideas / Backlog', status: 'Idea' },
  { label: 'Scripting / Writing', status: 'Scripting/Writing' },
  { label: 'Production / Design', status: 'Production/Design' },
  { label: 'Review / Editing', status: 'Review/Editing' },
  { label: 'Scheduled', status: 'Scheduled' },
  { label: 'Published', status: 'Published' },
  { label: 'To Do', status: 'To Do' },
  { label: 'In Progress', status: 'In Progress' },
  { label: 'Done', status: 'Done' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  items,
  channels,
  variablesConfig,
  onMoveItem,
  onEditItem,
  onOpenCreateModalWithStatus,
  activeUser,
}) => {
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDraggedOverColumn(status);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: ContentItem['status']) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) {
      onMoveItem(itemId, targetStatus);
    }
  };

  // Filter items assigned to the active user if toggled
  const displayedItems = items.filter((item) => {
    if (onlyMyTasks && activeUser) {
      return item.assignee.toLowerCase() === activeUser.toLowerCase();
    }
    return true;
  });

  // Dynamic style mapper helper
  const getChannelStyle = (channelName: string) => {
    const ch = channels.find((c) => c.name.toLowerCase() === channelName.toLowerCase());
    if (ch) {
      return {
        backgroundColor: `${ch.color}15`,
        color: ch.color,
        border: `1px solid ${ch.color}25`,
      };
    }
    return {
      backgroundColor: 'rgba(113, 113, 122, 0.08)',
      color: '#475569',
      border: '1px solid rgba(113, 113, 122, 0.15)',
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'var(--priority-urgent)';
      case 'High': return 'var(--priority-high)';
      case 'Medium': return 'var(--priority-medium)';
      default: return 'var(--priority-low)';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'Video': return <Video size={12} />;
      case 'Short': return <RefreshCw size={12} />;
      default: return <FileText size={12} />;
    }
  };

  return (
    <div className="page-container" style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Board toolbar filter for Active User tasks */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '4px 10px 12px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          type="button"
          onClick={() => setOnlyMyTasks(!onlyMyTasks)}
          disabled={!activeUser}
          className="btn"
          style={{
            borderColor: onlyMyTasks ? 'var(--primary)' : 'var(--border-strong)',
            backgroundColor: onlyMyTasks ? 'var(--primary-glow)' : 'white',
            color: onlyMyTasks ? 'var(--primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            padding: '6px 12px',
            opacity: activeUser ? 1 : 0.6,
            cursor: activeUser ? 'pointer' : 'not-allowed'
          }}
          title={!activeUser ? "Pilih profil Anda di kanan atas dulu" : "Saring tugas saya"}
        >
          <UserCheck size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
          <span>{onlyMyTasks ? 'Showing Only My Tasks' : 'Filter by My Tasks'}</span>
        </button>
      </div>

      <div className="kanban-board" style={{ flexGrow: 1, display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '8px', marginTop: '16px' }}>
        {COLUMNS.map((col) => {
          const colItems = displayedItems.filter((item) => item.status === col.status);
          const isOver = draggedOverColumn === col.status;

          return (
            <div
              key={col.status}
              className="kanban-column"
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              style={{
                backgroundColor: isOver ? 'rgba(37, 99, 235, 0.03)' : '',
                borderColor: isOver ? 'var(--primary)' : '',
                transition: 'background-color 200ms ease, border-color 200ms ease',
              }}
            >
              <div className="kanban-column-header">
                <div className="column-title-area">
                  <span className="column-title">{col.label}</span>
                  <span className="column-badge">{colItems.length}</span>
                </div>
                <button 
                  className="btn btn-secondary btn-icon-only" 
                  onClick={() => onOpenCreateModalWithStatus(col.status)}
                  style={{ padding: '4px', borderRadius: '4px' }}
                  title={`Add to ${col.label}`}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="kanban-cards-container">
                {colItems.length > 0 ? (
                  colItems.map((item) => {
                    const tagList = item.tags ? item.tags.split(',').filter(Boolean) : [];
                    return (
                      <div
                        key={item.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onClick={() => onEditItem(item)}
                      >
                        <div className="card-tags">
                          <span className="format-tag">{item.taskType}</span>
                          {item.brand && <span className="tag-badge">{item.client ? `${item.client} · ` : ''}{item.brand}</span>}
                          {item.taskType === 'Content' && <>
                            <span className="tag-badge" style={getChannelStyle(item.channel)}>{item.channel}</span>
                            <span className="format-tag">{getFormatIcon(item.format)}<span style={{ marginLeft: '4px' }}>{item.format}</span></span>
                          </>}
                        </div>

                        <h4 className="card-title">{item.title}</h4>
                        
                        {variablesConfig.brief && item.brief && (
                          <p className="card-brief" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>{item.brief}</p>
                        )}

                        {variablesConfig.tags && tagList.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                            {tagList.map(t => (
                              <span key={t} className="pill-tag" style={{ fontSize: '9px', padding: '1px 6px' }}>{t}</span>
                            ))}
                          </div>
                        )}

                        <div className="card-footer">
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {(item.taskType === 'General' ? item.dueDate : (variablesConfig.publishDate ? item.publishDate : '')) && (
                              <div className="card-meta-item">
                                <Calendar className="card-meta-icon" />
                                <span>{item.taskType === 'General' ? item.dueDate : item.publishDate}</span>
                              </div>
                            )}
                            {item.assetsLink && (
                              <div className="card-meta-item" title="Draft Assets Link">
                                <Link className="card-meta-icon" style={{ color: 'var(--primary)' }} />
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                              title={`Priority: ${item.priority}`}
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: getPriorityColor(item.priority)
                              }}
                            />
                            {item.assignee && (
                              <div className="avatar-ring" style={{ width: '22px', height: '22px', fontSize: '10px' }} title={`Creator: ${item.assignee}`}>
                                {item.assignee.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '8px',
                  }}>
                    Drop items here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
