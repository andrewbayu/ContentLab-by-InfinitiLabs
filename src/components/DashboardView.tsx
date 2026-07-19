import React from 'react';
import type { ContentItem, Channel, VariablesConfig } from '../services/sheets';
import { Layers, CheckCircle, Clock, AlertTriangle, Calendar, Eye, ThumbsUp, Award, Zap, BarChart3 } from 'lucide-react';

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

  const publishedItems = items.filter((item) => item.status === 'Published');
  const publishedCount = items.filter(
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

  // 1. Calculate KPI Metrics (Views, Likes, Engagement)
  let totalViews = 0;
  let totalLikes = 0;
  let totalEngagement = 0;
  let itemsWithMetricsCount = 0;

  publishedItems.forEach((item) => {
    const v = parseInt(item.views || '0', 10);
    const l = parseInt(item.likes || '0', 10);
    const e = parseInt(item.engagement || '0', 10);

    if (v > 0 || l > 0 || e > 0) {
      totalViews += v;
      totalLikes += l;
      totalEngagement += e;
      itemsWithMetricsCount++;
    }
  });

  const avgEngagement = itemsWithMetricsCount > 0 
    ? Math.round(totalEngagement / itemsWithMetricsCount) 
    : 0;

  // 2. Top Performing Leaderboard (Sorted by views)
  const topPerforming = [...publishedItems]
    .filter((item) => parseInt(item.views || '0', 10) > 0)
    .sort((a, b) => parseInt(b.views || '0', 10) - parseInt(a.views || '0', 10))
    .slice(0, 4);

  // 3. Platform Format Efficiency (Average views per format)
  const formatStats: Record<string, { totalViews: number; count: number }> = {};
  
  publishedItems.forEach((item) => {
    const formatType = item.format;
    const v = parseInt(item.views || '0', 10);
    
    if (v > 0) {
      if (!formatStats[formatType]) {
        formatStats[formatType] = { totalViews: 0, count: 0 };
      }
      formatStats[formatType].totalViews += v;
      formatStats[formatType].count += 1;
    }
  });

  const formatList = Object.entries(formatStats)
    .map(([formatName, data]) => ({
      name: formatName,
      avgViews: Math.round(data.totalViews / data.count),
      count: data.count
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  // Find max average views for scaling the meters
  const maxAvgViews = formatList.length > 0 ? Math.max(...formatList.map((f) => f.avgViews)) : 100;

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

  // Number formatter
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="page-container" style={{ overflowY: 'auto' }}>
      
      {/* 📊 CORE OPERATIONAL METRICS */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
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
          <span className="metric-value">{publishedCount}</span>
          <span className="metric-trend text-secondary">
            {totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0}% success rate
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

      {/* 🚀 PUBLISHED PERFORMANCE KPI METRICS ROW */}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChart3 size={16} className="text-secondary" />
        <span>Published Performance KPI (Real-time Sheets Data)</span>
      </h3>

      <div className="metrics-grid" style={{ marginBottom: '28px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, rgba(255,255,255,1) 100%)', borderColor: 'rgba(37, 99, 235, 0.1)' }}>
          <div className="metric-header">
            <span className="metric-title">Total Views</span>
            <Eye size={18} style={{ color: '#2563eb' }} />
          </div>
          <span className="metric-value" style={{ color: '#2563eb' }}>{formatNumber(totalViews)}</span>
          <span className="metric-trend text-secondary">Accumulated video & post plays</span>
        </div>

        <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(219, 39, 119, 0.02) 0%, rgba(255,255,255,1) 100%)', borderColor: 'rgba(219, 39, 119, 0.1)' }}>
          <div className="metric-header">
            <span className="metric-title">Total Likes</span>
            <ThumbsUp size={18} style={{ color: '#db2777' }} />
          </div>
          <span className="metric-value" style={{ color: '#db2777' }}>{formatNumber(totalLikes)}</span>
          <span className="metric-trend text-secondary">Viewer positive reactions</span>
        </div>

        <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(255,255,255,1) 100%)', borderColor: 'rgba(16, 185, 129, 0.1)' }}>
          <div className="metric-header">
            <span className="metric-title">Average Engagement</span>
            <Zap size={18} style={{ color: '#10b981' }} />
          </div>
          <span className="metric-value" style={{ color: '#10b981' }}>{formatNumber(avgEngagement)}</span>
          <span className="metric-trend text-secondary">Avg comments & shares / content</span>
        </div>
      </div>

      {/* 📈 PERFORMANCE INSIGHTS GRID */}
      <div className="dashboard-insights" style={{ marginBottom: '28px' }}>
        
        {/* Leaderboard: Top Performing Content */}
        <div className="insight-panel">
          <div className="insight-header">
            <h3 className="insight-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} style={{ color: '#d97706' }} />
              Top Performing Content
            </h3>
            <span className="text-secondary" style={{ fontSize: '12px' }}>By views</span>
          </div>

          <div className="recent-activity-list">
            {topPerforming.length > 0 ? (
              topPerforming.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="activity-item clickable-row" 
                  onClick={() => onEditItem(item)}
                  style={{ cursor: 'pointer', padding: '12px 14px' }}
                >
                  <div 
                    className="activity-icon-container" 
                    style={{ 
                      backgroundColor: idx === 0 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(0,0,0,0.04)',
                      color: idx === 0 ? '#d97706' : 'var(--text-secondary)',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div className="activity-details" style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="activity-text" style={{ fontWeight: 650 }}>{item.title}</span>
                      <span className="tag-badge" style={getChannelStyle(item.channel)}>{item.channel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Eye size={10} /> <strong>{formatNumber(parseInt(item.views || '0', 10))}</strong> Views</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><ThumbsUp size={10} /> <strong>{formatNumber(parseInt(item.likes || '0', 10))}</strong> Likes</span>
                      <span>Creator: {item.assignee || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Belum ada performa data yang tercatat. Masukkan views & likes pada konten status "Published"!
              </div>
            )}
          </div>
        </div>

        {/* Content Format Efficiency */}
        <div className="insight-panel">
          <div className="insight-header">
            <h3 className="insight-title">Format Efficiency</h3>
            <span className="text-secondary" style={{ fontSize: '12px' }}>Avg views per format</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', justifyContent: 'center', height: '100%' }}>
            {formatList.length > 0 ? (
              formatList.map((f) => {
                const percentage = Math.round((f.avgViews / maxAvgViews) * 100) || 5;
                return (
                  <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{f.name} ({f.count} posts)</span>
                      <span className="text-secondary" style={{ fontWeight: 600 }}>{formatNumber(f.avgViews)} views</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--border-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${percentage}%`, 
                          height: '100%', 
                          borderRadius: '9999px',
                          backgroundColor: 'var(--primary)'
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Masukkan data KPI views pada list konten untuk melihat perbandingan format.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 🗂️ PRE-EXISTING OPERATIONAL DRILLDOWN */}
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
