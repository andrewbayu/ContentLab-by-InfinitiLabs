import React, { useState, useMemo } from 'react';
import type { ContentItem, Channel, VariablesConfig } from '../services/sheets';
import { Search, Calendar, ArrowUpDown, ExternalLink, LayoutGrid, List, UserCheck } from 'lucide-react';

interface ListViewProps {
  items: ContentItem[];
  channels: Channel[];
  variablesConfig: VariablesConfig;
  onEditItem: (item: ContentItem) => void;
  activeUser: string;
}

type SortField = 'title' | 'channel' | 'format' | 'status' | 'priority' | 'publishDate';
type SortOrder = 'asc' | 'desc';

export const ListView: React.FC<ListViewProps> = ({
  items,
  channels,
  variablesConfig,
  onEditItem,
  activeUser,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('publishDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  
  // Default visual layout format is 'cards'
  const [viewLayout, setViewLayout] = useState<'cards' | 'list'>('cards');

  // Gather unique options for filters
  const assignees = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.assignee) set.add(item.assignee);
    });
    return Array.from(set);
  }, [items]);

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.brief.toLowerCase().includes(search.toLowerCase()) ||
          (item.tags && item.tags.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = !statusFilter || item.status === statusFilter;
        const matchesChannel = !channelFilter || item.channel === channelFilter;
        const matchesAssignee = !assigneeFilter || item.assignee === assigneeFilter;
        return matchesSearch && matchesStatus && matchesChannel && matchesAssignee;
      })
      .sort((a, b) => {
        let valA: string | number = a[sortField as keyof ContentItem] || '';
        let valB: string | number = b[sortField as keyof ContentItem] || '';

        // Priority sorting comparison helper
        if (sortField === 'priority') {
          const priorityWeight = (p: string) => {
            switch (p) {
              case 'Urgent': return 4;
              case 'High': return 3;
              case 'Medium': return 2;
              case 'Low': return 1;
              default: return 0;
            }
          };
          valA = priorityWeight(a.priority);
          valB = priorityWeight(b.priority);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [items, search, statusFilter, channelFilter, assigneeFilter, sortField, sortOrder]);

  // Apply Active User Tasks Filter
  const displayedItems = useMemo(() => {
    return filteredAndSortedItems.filter((item) => {
      if (onlyMyTasks && activeUser) {
        return item.assignee.toLowerCase() === activeUser.toLowerCase();
      }
      return true;
    });
  }, [filteredAndSortedItems, onlyMyTasks, activeUser]);

  // Dynamic style mapper helper
  const getChannelStyle = (channelName: string) => {
    const ch = channels.find((c) => c.name.toLowerCase() === channelName.toLowerCase());
    if (ch) {
      return {
        backgroundColor: `${ch.color}15`,
        color: ch.color,
        border: `1px solid ${ch.color}25`,
        hexColor: ch.color,
      };
    }
    return {
      backgroundColor: 'rgba(113, 113, 122, 0.08)',
      color: '#475569',
      border: '1px solid rgba(113, 113, 122, 0.15)',
      hexColor: '#71717a',
    };
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Idea': return { backgroundColor: 'var(--status-idea-bg)', color: 'var(--status-idea-text)' };
      case 'Scripting/Writing': return { backgroundColor: 'var(--status-script-bg)', color: 'var(--status-script-text)' };
      case 'Production/Design': return { backgroundColor: 'var(--status-prod-bg)', color: 'var(--status-prod-text)' };
      case 'Review/Editing': return { backgroundColor: 'var(--status-review-bg)', color: 'var(--status-review-text)' };
      case 'Scheduled': return { backgroundColor: 'var(--status-scheduled-bg)', color: 'var(--status-scheduled-text)' };
      case 'Published': return { backgroundColor: 'var(--status-published-bg)', color: 'var(--status-published-text)' };
      default: return {};
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'var(--priority-urgent)';
      case 'High': return 'var(--priority-high)';
      case 'Medium': return 'var(--priority-medium)';
      default: return 'var(--priority-low)';
    }
  };

  return (
    <div className="page-container" style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Filtering Toolbar */}
      <div className="list-view-controls">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search content, briefs, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {/* Active User My Tasks Filter Button */}
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
              cursor: activeUser ? 'pointer' : 'not-allowed',
              marginRight: '6px'
            }}
            title={!activeUser ? "Pilih profil Anda di kanan atas dulu" : "Saring tugas saya"}
          >
            <UserCheck size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
            <span>My Tasks</span>
          </button>

          {/* Visual Layout Format Toggle */}
          <div className="layout-toggle-group" style={{ marginRight: '8px' }}>
            <button
              type="button"
              className={`layout-toggle-btn ${viewLayout === 'cards' ? 'active' : ''}`}
              onClick={() => setViewLayout('cards')}
              title="Cards View"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`layout-toggle-btn ${viewLayout === 'list' ? 'active' : ''}`}
              onClick={() => setViewLayout('list')}
              title="Table List View"
            >
              <List size={14} />
              <span>Table List</span>
            </button>
          </div>

          <select
            className="select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Idea">Idea</option>
            <option value="Scripting/Writing">Scripting/Writing</option>
            <option value="Production/Design">Production/Design</option>
            <option value="Review/Editing">Review/Editing</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Published">Published</option>
          </select>

          <select
            className="select-filter"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            <option value="">All Channels</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.name}>{ch.name}</option>
            ))}
          </select>

          <select
            className="select-filter"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">All Assignees</option>
            {assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* RENDER DUAL VISUAL LAYOUTS */}
      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {viewLayout === 'cards' ? (
          /* DEFAULT: CARDS VIEW GRID LAYOUT */
          <div className="cards-grid">
            {displayedItems.length > 0 ? (
              displayedItems.map((item) => {
                const channelStyle = getChannelStyle(item.channel);
                const tagList = item.tags ? item.tags.split(',').filter(Boolean) : [];
                
                return (
                  <div
                    key={item.id}
                    className="scheduler-card"
                    onClick={() => onEditItem(item)}
                  >
                    {/* Top Platform Color Accent Banner Line */}
                    <div
                      className="card-header-banner"
                      style={{ backgroundColor: channelStyle.hexColor }}
                    />
                    
                    <div className="scheduler-card-body">
                      {/* Badge Tags Row */}
                      <div className="scheduler-card-meta">
                        <span className="tag-badge" style={channelStyle}>
                          {item.channel}
                        </span>
                        <span className="format-tag">{item.format}</span>
                      </div>

                      {/* Title */}
                      <h4 className="scheduler-card-title">{item.title}</h4>

                      {/* Brief text */}
                      {variablesConfig.brief && item.brief && (
                        <p className="scheduler-card-brief">{item.brief}</p>
                      )}

                      {/* Custom Tags pills */}
                      {variablesConfig.tags && tagList.length > 0 && (
                        <div className="scheduler-card-tags">
                          {tagList.map((tag) => (
                            <span key={tag} className="pill-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Extra context variables */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {variablesConfig.budget && item.budget && (
                          <div style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                            Cost: <strong>{item.budget}</strong>
                          </div>
                        )}
                        {variablesConfig.targetAudience && item.targetAudience && (
                          <div style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid var(--border-subtle)', borderRadius: '4px', maxWidth: '100%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={`Audience: ${item.targetAudience}`}>
                            Audience: <strong>{item.targetAudience}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Info Bar Footer */}
                    <div className="scheduler-card-footer">
                      {variablesConfig.publishDate && item.publishDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                          <Calendar size={13} />
                          <span>{item.publishDate}</span>
                        </div>
                      ) : (
                        <div className="text-muted">No date set</div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Status indicators */}
                        <span
                          className="status-badge"
                          style={{
                            ...getStatusStyle(item.status),
                            padding: '2px 8px',
                            fontSize: '11px'
                          }}
                        >
                          {item.status}
                        </span>

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
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                No content matching the filters found.
              </div>
            )}
          </div>
        ) : (
          /* TABLE LIST VIEW LAYOUT */
          <div className="list-table-container">
            <table className="list-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('title')}>
                    Title <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                  </th>
                  <th onClick={() => handleSort('channel')}>
                    Channel <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                  </th>
                  <th onClick={() => handleSort('format')}>
                    Format <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                  </th>
                  <th onClick={() => handleSort('status')}>
                    Status <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                  </th>
                  <th onClick={() => handleSort('priority')}>
                    Priority <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                  </th>
                  {variablesConfig.publishDate && (
                    <th onClick={() => handleSort('publishDate')}>
                      Publish Date <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                    </th>
                  )}
                  <th>Creator</th>
                  {variablesConfig.tags && <th>Tags</th>}
                  {variablesConfig.budget && <th>Budget</th>}
                  <th>Assets</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.length > 0 ? (
                  displayedItems.map((item) => (
                    <tr key={item.id} className="clickable-row" onClick={() => onEditItem(item)}>
                      <td className="row-title" style={{ maxWidth: '300px' }}>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        {variablesConfig.brief && item.brief && (
                          <div className="text-secondary" style={{ fontSize: '12px', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.brief}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="tag-badge" style={getChannelStyle(item.channel)}>
                          {item.channel}
                        </span>
                      </td>
                      <td>
                        <span className="format-tag">{item.format}</span>
                      </td>
                      <td>
                        <span className="status-badge" style={getStatusStyle(item.status)}>
                          <span 
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: getStatusStyle(item.status).color
                            }}
                          />
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <span className="priority-indicator">
                          <span 
                            className="priority-dot" 
                            style={{ backgroundColor: getPriorityColor(item.priority) }} 
                          />
                          {item.priority}
                        </span>
                      </td>
                      {variablesConfig.publishDate && (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <Calendar size={13} className="text-muted" />
                            <span>{item.publishDate || 'TBD'}</span>
                          </div>
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar-ring" style={{ width: '24px', height: '24px', fontSize: '11px' }}>
                            {item.assignee ? item.assignee.charAt(0) : '?'}
                          </div>
                          <span style={{ fontSize: '13px' }}>{item.assignee || 'Unassigned'}</span>
                        </div>
                      </td>
                      {variablesConfig.tags && (
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '160px' }}>
                            {item.tags ? item.tags.split(',').filter(Boolean).map(tag => (
                              <span key={tag} className="pill-tag" style={{ fontSize: '10px', padding: '1px 6px' }}>{tag}</span>
                            )) : <span className="text-muted">—</span>}
                          </div>
                        </td>
                      )}
                      {variablesConfig.budget && (
                        <td style={{ fontWeight: 550, color: 'var(--text-primary)' }}>
                          {item.budget || <span className="text-muted">—</span>}
                        </td>
                      )}
                      <td onClick={(e) => e.stopPropagation()}>
                        {item.assetsLink ? (
                          <a
                            href={item.assetsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-icon-only"
                            style={{ padding: '6px', borderRadius: '4px' }}
                            title="Open Assets Draft"
                          >
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                      No content matching the filters found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
