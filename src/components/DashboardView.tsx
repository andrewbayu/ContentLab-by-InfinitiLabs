import React from 'react';
import type { ContentItem, Channel, VariablesConfig } from '../services/sheets';
import { Layers, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';

interface DashboardViewProps {
  items: ContentItem[];
  channels: Channel[];
  variablesConfig: VariablesConfig;
  onEditItem: (item: ContentItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  channels,
  variablesConfig,
  onEditItem,
}) => {
  const totalCount = items.length;
  
  const inProduction = items.filter(
    (item) =>
      item.status === 'Scripting/Writing' ||
      item.status === 'Production/Design' ||
      item.status === 'Review/Editing'
  ).length;

  const published = items.filter(
    (item) => item.status === 'Published' || item.status === 'Scheduled'
  ).length;

  // Calculate Overdue
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueItems = items.filter(
    (item) =>
      item.status !== 'Published' &&
      item.publishDate &&
      item.publishDate < todayStr
  );
  const overdueCount = overdueItems.length;

  // Calculate Channel distribution
  const channelCounts: Record<string, number> = {};
  items.forEach((item) => {
    channelCounts[item.channel] = (channelCounts[item.channel] || 0) + 1;
  });

  const channelsList = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]);

  // Upcoming Schedule (uncompleted items sorted by publish date closest to today)
  const upcomingContent = [...items]
    .filter((item) => item.status !== 'Published')
    .sort((a, b) => {
      if (!a.publishDate) return 1;
      if (!b.publishDate) return -1;
      return a.publishDate.localeCompare(b.publishDate);
    })
    .slice(0, 4);

  // Status/Channel badges colors helper
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Idea': return 'status-idea-text';
      case 'Scripting/Writing': return 'status-script-text';
      case 'Production/Design': return 'status-prod-text';
      case 'Review/Editing': return 'status-review-text';
      case 'Scheduled': return 'status-scheduled-text';
      case 'Published': return 'status-published-text';
      default: return '';
    }
  };

  return (
    <div className="page-container">
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Plannings</span>
            <Layers size={18} className="text-secondary" />
          </div>
          <span className="metric-value">{totalCount}</span>
          <span className="metric-trend text-secondary">Active ideas & posts</span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">In Production</span>
            <Clock size={18} style={{ color: '#2563eb' }} />
          </div>
          <span className="metric-value">{inProduction}</span>
          <span className="metric-trend text-secondary">
            {totalCount > 0 ? Math.round((inProduction / totalCount) * 100) : 0}% of total backlog
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Live & Scheduled</span>
            <CheckCircle size={18} style={{ color: '#16a34a' }} />
          </div>
          <span className="metric-value">{published}</span>
          <span className="metric-trend text-secondary">
            {totalCount > 0 ? Math.round((published / totalCount) * 100) : 0}% success rate
          </span>
        </div>

        <div className="metric-card" style={overdueCount > 0 ? { borderColor: 'rgba(220, 38, 38, 0.4)' } : {}}>
          <div className="metric-header">
            <span className="metric-title">Overdue Publish</span>
            <AlertTriangle size={18} style={{ color: overdueCount > 0 ? '#dc2626' : '#94a3b8' }} />
          </div>
          <span className="metric-value" style={overdueCount > 0 ? { color: '#dc2626' } : {}}>{overdueCount}</span>
          <span className="metric-trend" style={overdueCount > 0 ? { color: '#dc2626' } : { color: 'var(--text-muted)' }}>
            {overdueCount > 0 ? 'Needs immediate attention' : 'All schedules on track'}
          </span>
        </div>
      </div>

      {/* Detail Panels */}
      <div className="dashboard-insights">
        {/* Upcoming Content Schedule */}
        <div className="insight-panel">
          <div className="insight-header">
            <h3 className="insight-title">Upcoming Publications</h3>
            <span className="text-secondary" style={{ fontSize: '12px' }}>Next in queue</span>
          </div>

          <div className="recent-activity-list">
            {upcomingContent.length > 0 ? (
              upcomingContent.map((item) => (
                <div 
                  key={item.id} 
                  className="activity-item clickable-row" 
                  onClick={() => onEditItem(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="activity-icon-container">
                    <Calendar size={16} />
                  </div>
                  <div className="activity-details" style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="activity-text" style={{ fontWeight: 600 }}>{item.title}</span>
                      <span className="tag-badge" style={getChannelStyle(item.channel)}>{item.channel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '12px' }}>
                      {variablesConfig.publishDate && (
                        <span className="activity-time">
                          Publish Date: <strong>{item.publishDate || 'TBD'}</strong>
                        </span>
                      )}
                      <span className={getStatusClass(item.status)} style={{ fontWeight: 500 }}>
                        {item.status}
                      </span>
                      <span className="text-muted">| Creator: {item.assignee || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No upcoming publications. Create a task or update schedules!
              </div>
            )}
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="insight-panel">
          <div className="insight-header">
            <h3 className="insight-title">Channel Distribution</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', height: '100%' }}>
            {channelsList.length > 0 ? (
              channelsList.map(([channel, count]) => {
                const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                const channelStyle = getChannelStyle(channel);
                return (
                  <div key={channel} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ fontWeight: 500 }}>{channel}</span>
                      <span className="text-secondary">{count} items ({percentage}%)</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--border-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${percentage}%`, 
                          height: '100%', 
                          borderRadius: '9999px',
                          backgroundColor: channelStyle.color
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No channel data. Create tasks to view metrics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
