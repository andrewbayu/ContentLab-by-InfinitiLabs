import React, { useState, useMemo, memo } from 'react';
import { toDeterministicUuid, type ContentItem, type Channel, type VariablesConfig, type TaskType, type CommentItem, type TaskResource } from '../services/sheets';


import { Calendar, Link, Plus, FileText, Video, RefreshCw, Clapperboard, ListChecks, MessageSquare, Paperclip } from 'lucide-react';
import { RichTextPreview } from './RichText';

interface KanbanBoardProps {
  items: ContentItem[];
  resources: TaskResource[];
  comments?: CommentItem[];
  channels: Channel[];
  variablesConfig: VariablesConfig;
  onMoveItem: (id: string, newStatus: ContentItem['status']) => void;
  onEditItem: (item: ContentItem) => void;
  onOpenCreateModalWithStatus: (status: ContentItem['status']) => void;
  taskView: 'all' | 'content' | 'general' | 'mine' | 'overdue';
}

interface KanbanColumn {
  label: string;
  status: ContentItem['status'];
}

const CONTENT_COLUMNS: KanbanColumn[] = [
  { label: 'Ideas / Backlog', status: 'Idea' },
  { label: 'Scripting / Writing', status: 'Scripting/Writing' },
  { label: 'Production / Design', status: 'Production/Design' },
  { label: 'Review / Editing', status: 'Review/Editing' },
  { label: 'Scheduled', status: 'Scheduled' },
  { label: 'Published', status: 'Published' },
];

const GENERAL_COLUMNS: KanbanColumn[] = [
  { label: 'To Do', status: 'To Do' },
  { label: 'In Progress', status: 'In Progress' },
  { label: 'Done', status: 'Done' },
];

function KanbanBoardComponent({
  items,
  resources = [],
  comments = [],
  channels,
  variablesConfig,
  onMoveItem,
  onEditItem,
  onOpenCreateModalWithStatus,
  taskView,
}: KanbanBoardProps) {
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<TaskType | null>(null);
  const [mobileLane, setMobileLane] = useState<TaskType>('Content');
  const showContentLane = taskView !== 'general';
  const showGeneralLane = taskView !== 'content';
  const showLaneSwitch = showContentLane && showGeneralLane;

  const displayedItems = items;

  // Index comment counts by (canonical) task id ONCE per comments change, instead
  // of scanning the whole comments array for every card on every render. This turns
  // the old O(cards × comments) work into O(comments) build + O(1) per-card lookup.
  const commentCountByTask = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of comments) {
      const key = toDeterministicUuid(c.contentId) || String(c.contentId || '');
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [comments]);

  const resourceCountByTask = useMemo(() => {
    const map = new Map<string, number>();
    resources.forEach((resource) => {
      const key = toDeterministicUuid(resource.taskId) || resource.taskId;
      if (key) map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [resources]);

  // Pre-resolve channel styling into a lookup map so each card is O(1) instead of
  // running Array.find over all channels.
  const channelStyleMap = useMemo(() => {
    const map = new Map<string, React.CSSProperties>();
    for (const channel of channels) {
      map.set(channel.name.toLowerCase(), {
        backgroundColor: `${channel.color}15`,
        color: channel.color,
        border: `1px solid ${channel.color}25`,
      });
    }
    return map;
  }, [channels]);


  const handleDragStart = (event: React.DragEvent, item: ContentItem) => {
    event.dataTransfer.setData('text/plain', item.id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedItemType(item.taskType);
  };

  const handleDragOver = (event: React.DragEvent, status: ContentItem['status'], laneType: TaskType) => {
    if (draggedItemType !== laneType) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(status);
  };

  const resetDragState = () => {
    setDraggedOverColumn(null);
    setDraggedItemType(null);
  };

  const handleDrop = (event: React.DragEvent, targetStatus: ContentItem['status'], laneType: TaskType) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('text/plain');
    const draggedItem = displayedItems.find((item) => item.id === itemId);
    resetDragState();
    if (draggedItem?.taskType === laneType) onMoveItem(itemId, targetStatus);
  };

  const DEFAULT_CHANNEL_STYLE: React.CSSProperties = {
    backgroundColor: 'rgba(113, 113, 122, 0.08)',
    color: '#475569',
    border: '1px solid rgba(113, 113, 122, 0.15)',
  };
  const getChannelStyle = (channelName: string) =>
    channelStyleMap.get(channelName.toLowerCase()) || DEFAULT_CHANNEL_STYLE;


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

  const renderCard = (item: ContentItem) => {
    const tagList = item.tags ? item.tags.split(',').filter(Boolean) : [];
    const itemKey = toDeterministicUuid(item.id) || String(item.id || '');
    const itemCommentCount = commentCountByTask.get(itemKey) || 0;
    const itemResourceCount = resourceCountByTask.get(itemKey) || 0;

    return (
      <div
        key={item.id}
        className="kanban-card"
        draggable
        onDragStart={(event) => handleDragStart(event, item)}
        onDragEnd={resetDragState}
        onClick={() => onEditItem(item)}
      >
        {item.taskType === 'Content' && item.coverImageUrl && <img className="kanban-card-cover" src={item.coverImageUrl} alt="" loading="lazy" />}
        <div className="card-tags">
          {item.brand && <span className="tag-badge">{item.client ? `${item.client} · ` : ''}{item.brand}</span>}
          {item.taskType === 'Content' ? (
            <>
              <span className="tag-badge" style={getChannelStyle(item.channel)}>{item.channel}</span>
              <span className="format-tag">{getFormatIcon(item.format)}<span style={{ marginLeft: '4px' }}>{item.format}</span></span>
            </>
          ) : (
            <span className="format-tag">{item.category || 'General'}</span>
          )}
        </div>

        <h4 className="card-title">{item.title}</h4>

        {variablesConfig.brief && item.brief && <p className="card-brief kanban-card-brief"><RichTextPreview value={item.brief} /></p>}

        {variablesConfig.tags && tagList.length > 0 && (
          <div className="kanban-card-tags">
            {tagList.map((tag) => <span key={tag} className="pill-tag kanban-pill-tag">{tag}</span>)}
          </div>
        )}

        <div className="card-footer">
          <div className="kanban-card-meta">
            {(item.taskType === 'General' ? item.dueDate : (variablesConfig.publishDate ? item.publishDate : '')) && (
              <div className="card-meta-item">
                <Calendar className="card-meta-icon" />
                <span>{item.taskType === 'General' ? item.dueDate : item.publishDate}</span>
              </div>
            )}
            {item.assetsLink && (
              <div className="card-meta-item" title="Draft Assets Link">
                <Link className="card-meta-icon kanban-asset-icon" />
              </div>
            )}
            {itemCommentCount > 0 && (
              <div className="card-meta-item" title={`${itemCommentCount} comment(s)`} style={{ color: '#2563eb' }}>
                <MessageSquare className="card-meta-icon" size={12} />
                <span style={{ fontSize: '11px', fontWeight: 600 }}>{itemCommentCount}</span>
              </div>
            )}
            {itemResourceCount > 0 && (
              <div className="card-meta-item" title={`${itemResourceCount} resource(s)`} style={{ color: '#64748b' }}>
                <Paperclip className="card-meta-icon" size={12} />
                <span style={{ fontSize: '11px', fontWeight: 600 }}>{itemResourceCount}</span>
              </div>
            )}
          </div>

          <div className="kanban-card-owner">
            <span className="priority-dot" title={`Priority: ${item.priority}`} style={{ backgroundColor: getPriorityColor(item.priority) }} />
            {item.assignee && (
              <div className="avatar-ring kanban-avatar" title={`PIC: ${item.assignee}`}>
                {item.assignee.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLane = (laneType: TaskType, columns: KanbanColumn[]) => {
    const laneItems = displayedItems.filter((item) => item.taskType === laneType);
    const isContent = laneType === 'Content';
    const laneStatuses = new Set(columns.map((column) => column.status));
    return (
      <section className={`kanban-lane ${showLaneSwitch && mobileLane !== laneType ? 'mobile-lane-hidden' : ''}`} aria-labelledby={`${laneType.toLowerCase()}-lane-title`}>
        <div className="kanban-lane-heading">
          <div className={`kanban-lane-icon ${isContent ? 'content' : 'general'}`}>
            {isContent ? <Clapperboard size={15} /> : <ListChecks size={15} />}
          </div>
          <div>
            <div className="kanban-lane-title-row">
              <h3 id={`${laneType.toLowerCase()}-lane-title`}>{isContent ? 'Content Pipeline' : 'General Tasks'}</h3>
              <span>{laneItems.length}</span>
            </div>
            <p>{isContent ? 'Plan, produce, review, and publish content' : 'Track operational and non-content work'}</p>
          </div>
        </div>

        <div className={`kanban-board kanban-board-${laneType.toLowerCase()}`}>
          {columns.map((column) => {
            const columnItems = laneItems.filter((item) => item.status === column.status || (
              column.status === columns[0].status && !laneStatuses.has(item.status)
            ));
            const isOver = draggedOverColumn === column.status && draggedItemType === laneType;
            return (
              <div
                key={column.status}
                className={`kanban-column ${isOver ? 'drag-over' : ''}`}
                onDragOver={(event) => handleDragOver(event, column.status, laneType)}
                onDragLeave={() => setDraggedOverColumn(null)}
                onDrop={(event) => handleDrop(event, column.status, laneType)}
              >
                <div className="kanban-column-header">
                  <div className="column-title-area">
                    <span className="column-title">{column.label}</span>
                    <span className="column-badge">{columnItems.length}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon-only kanban-add-button"
                    onClick={() => onOpenCreateModalWithStatus(column.status)}
                    title={`Add to ${column.label}`}
                    aria-label={`Add ${laneType === 'Content' ? 'content' : 'task'} to ${column.label}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="kanban-cards-container">
                  {columnItems.length > 0 ? columnItems.map(renderCard) : <div className="kanban-empty-column">Drop items here</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="page-container kanban-page">
      <div className="kanban-toolbar">
        {showLaneSwitch && (
          <div className="kanban-mobile-switch" role="tablist" aria-label="Kanban lane">
            <button type="button" role="tab" aria-selected={mobileLane === 'Content'} className={mobileLane === 'Content' ? 'active' : ''} onClick={() => setMobileLane('Content')}>Content</button>
            <button type="button" role="tab" aria-selected={mobileLane === 'General'} className={mobileLane === 'General' ? 'active' : ''} onClick={() => setMobileLane('General')}>Tasks</button>
          </div>
        )}
      </div>

      <div className="kanban-lanes">
        {showContentLane && renderLane('Content', CONTENT_COLUMNS)}
        {showGeneralLane && renderLane('General', GENERAL_COLUMNS)}
      </div>
    </div>
  );
}

// Memoized so the board only re-renders when its own props change — not on every
// parent (App) re-render such as a toast appearing or an unrelated tab switch.
export const KanbanBoard = memo(KanbanBoardComponent);
