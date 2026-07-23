import React, { useState } from 'react';
import { isUserInvolved } from '../services/sheets';
import { getGeneratedAvatar } from '../utils/avatar';
import type { ContentItem, Channel, VariablesConfig, TeamMember } from '../services/sheets';
import { 
  Layers, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Eye, 
  ThumbsUp, 
  Award, 
  Zap, 
  BarChart3, 
  User, 
  CheckSquare, 
  ArrowRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  items: ContentItem[];
  channels: Channel[];
  variablesConfig: VariablesConfig;
  onEditItem: (item: ContentItem) => void;
  currentUser: TeamMember;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  channels,
  variablesConfig,
  onEditItem,
  currentUser,
}) => {
  const [dashboardTab, setDashboardTab] = useState<'personal' | 'studio'>('personal');

  // Time-based greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // --- GENERAL CALCULATIONS (STUDIO OVERVIEW) ---
  const totalCount = items.length;
  const isComplete = (item: ContentItem) => item.status === 'Published' || item.status === 'Done';
  const getTargetDate = (item: ContentItem) => item.taskType === 'General' ? (item.dueDate || '') : item.publishDate;
  
  const inProduction = items.filter(
    (item) =>
      item.status === 'Scripting/Writing' ||
      item.status === 'Production/Design' ||
      item.status === 'Review/Editing' ||
      item.status === 'In Progress'
  ).length;

  const publishedItems = items.filter((item) => item.taskType === 'Content' && item.status === 'Published');
  const publishedCount = items.filter((item) => isComplete(item) || item.status === 'Scheduled').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueItems = items.filter(
    (item) =>
      !isComplete(item) &&
      getTargetDate(item) &&
      getTargetDate(item) < todayStr
  );
  const overdueCount = overdueItems.length;

  // Calculate General KPI Metrics
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

  // Sort by views for General Leaderboard
  const topPerforming = [...publishedItems]
    .filter((item) => parseInt(item.views || '0', 10) > 0)
    .sort((a, b) => parseInt(b.views || '0', 10) - parseInt(a.views || '0', 10))
    .slice(0, 4);

  // Format Efficiency (average views)
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

  const maxAvgViews = formatList.length > 0 ? Math.max(...formatList.map((f) => f.avgViews)) : 100;

  // General Channel distribution
  const channelCounts: Record<string, number> = {};
  items.filter((item) => item.taskType === 'Content').forEach((item) => {
    channelCounts[item.channel] = (channelCounts[item.channel] || 0) + 1;
  });
  const channelsList = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]);

  // General Upcoming Schedule
  const upcomingContent = [...items]
    .filter((item) => !isComplete(item))
    .sort((a, b) => {
      if (!getTargetDate(a)) return 1;
      if (!getTargetDate(b)) return -1;
      return getTargetDate(a).localeCompare(getTargetDate(b));
    })
    .slice(0, 4);


  // --- PERSONAL CALCULATIONS (WORKSPACE SAYA) ---
  const myItems = items.filter((item) => isUserInvolved(item, currentUser));

  // 1. Personal Active Tasks (Backlog)
  const myActiveTasks = myItems.filter(
    (item) => !isComplete(item)
  ).length;

  // 2. Personal Pending Subtasks Checklists & Combined List
  interface PersonalChecklistItem {
    itemId: string;
    itemTitle: string;
    subtaskId: string;
    label: string;
    done: boolean;
    link?: string;
    parentItem: ContentItem;
  }

  let myPendingSubtaskCount = 0;
  const myAllSubtasks: PersonalChecklistItem[] = [];

  myItems.forEach((item) => {
    if (isComplete(item)) return;
    try {
      const list = item.checklist ? JSON.parse(item.checklist) : [];
      list.forEach((sub: any) => {
        const itemObj: PersonalChecklistItem = {
          itemId: item.id,
          itemTitle: item.title,
          subtaskId: sub.id,
          label: sub.label,
          done: !!sub.done,
          link: sub.link || '',
          parentItem: item
        };
        myAllSubtasks.push(itemObj);
        if (!sub.done) {
          myPendingSubtaskCount++;
        }
      });
    } catch(e) {
      console.error(e);
    }
  });

  // Filter only pending ones for the action list dashboard
  const myPendingChecklistItems = myAllSubtasks.filter(itm => !itm.done).slice(0, 5);

  // 3. Personal views generated
  let myPublishedViews = 0;
  myItems.forEach((item) => {
    if (item.taskType === 'Content' && item.status === 'Published') {
      myPublishedViews += parseInt(item.views || '0', 10);
    }
  });

  // 4. My Upcoming Publications
  const myUpcoming = myItems
    .filter((item) => !isComplete(item))
    .sort((a, b) => {
      if (!getTargetDate(a)) return 1;
      if (!getTargetDate(b)) return -1;
      return getTargetDate(a).localeCompare(getTargetDate(b));
    })
    .slice(0, 4);


  // Style helpers
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
      case 'To Do': return 'status-idea-text';
      case 'In Progress': return 'status-prod-text';
      case 'Done': return 'status-published-text';
      default: return '';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="page-container dashboard-page" style={{ overflowY: 'auto' }}>
      
      {/* Navigation sub-tabs (segmented control) */}
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
        <button
          role="tab"
          aria-selected={dashboardTab === 'personal'}
          className={`dashboard-tab ${dashboardTab === 'personal' ? 'active' : ''}`}
          onClick={() => setDashboardTab('personal')}
        >
          <User size={14} />
          Workspace Saya
        </button>

        <button
          role="tab"
          aria-selected={dashboardTab === 'studio'}
          className={`dashboard-tab ${dashboardTab === 'studio' ? 'active' : ''}`}
          onClick={() => setDashboardTab('studio')}
        >
          <BarChart3 size={14} />
          Studio Overview
        </button>
      </div>

      {/* =========================================
          TAB: WORKSPACE SAYA (PERSONAL VIEW)
          ========================================= */}
      {dashboardTab === 'personal' && (
        <div style={{ animation: 'fadeIn var(--transition-fast)' }}>
          {/* Greeting Box banner */}
          <div className="dashboard-greeting" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: 'var(--primary-glow)',
            border: '1px solid rgba(37, 99, 235, 0.15)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            marginBottom: '24px'
          }}>
            <img 
              src={getGeneratedAvatar(currentUser.name)} 
              alt={currentUser.name} 
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid white', boxShadow: 'var(--shadow-sm)' }}
            />
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 750, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {getGreeting()}, {currentUser.name}! <Sparkles size={16} style={{ color: 'var(--primary)' }} />
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                You have {myActiveTasks} active task{myActiveTasks === 1 ? '' : 's'} and {myPendingSubtaskCount} pending checklist item{myPendingSubtaskCount === 1 ? '' : 's'}.
              </p>
            </div>
          </div>

          {/* Personal Metrics row */}
          <div className="metrics-grid" style={{ marginBottom: '28px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="metric-card">
              <div className="metric-header">
              <span className="metric-title">Active tasks</span>
                <Clock size={18} style={{ color: '#2563eb' }} />
              </div>
              <span className="metric-value">{myActiveTasks}</span>
              <span className="metric-trend text-secondary">Tasks assigned to you</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
              <span className="metric-title">Pending checklist</span>
                <CheckSquare size={18} style={{ color: '#db2777' }} />
              </div>
              <span className="metric-value" style={myPendingSubtaskCount > 0 ? { color: '#db2777' } : {}}>{myPendingSubtaskCount}</span>
              <span className="metric-trend text-secondary">Assets waiting for updates</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
              <span className="metric-title">My content views</span>
                <Eye size={18} style={{ color: '#10b981' }} />
              </div>
              <span className="metric-value" style={{ color: '#10b981' }}>{formatNumber(myPublishedViews)}</span>
              <span className="metric-trend text-secondary">From published content</span>
            </div>
          </div>

          {/* Personal Content Insights */}
          <div className="dashboard-insights">
            
            {/* My Pending Checklists Tasks */}
            <div className="insight-panel dashboard-action-panel">
              <div className="insight-header">
                <h3 className="insight-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={16} className="text-secondary" />
                  Needs your attention
                </h3>
                <span className="text-secondary" style={{ fontSize: '12px' }}>{myPendingSubtaskCount} item{myPendingSubtaskCount === 1 ? '' : 's'} require action</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myPendingChecklistItems.length > 0 ? (
                  myPendingChecklistItems.map((chk) => (
                    <div 
                      key={chk.subtaskId}
                      style={{
                        padding: '12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 650, color: 'var(--text-primary)' }}>
                          {chk.label}
                        </span>
                        
                        {/* Parent item badge */}
                        <span 
                          onClick={() => onEditItem(chk.parentItem)}
                          className="tag-badge clickable-row"
                          style={{
                            fontSize: '10px',
                            cursor: 'pointer',
                            backgroundColor: 'white',
                            borderColor: 'var(--border-strong)',
                            color: 'var(--primary)',
                            padding: '2px 8px'
                          }}
                          title="Buka detail rencana konten"
                        >
                          {chk.itemTitle} <ArrowRight size={10} style={{ marginLeft: '3px', display: 'inline-block' }} />
                        </span>
                      </div>
                      
                      {/* Quick link status info */}
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Status Konten: <strong>{chk.parentItem.status}</strong> | Channel: <strong>{chk.parentItem.channel}</strong>
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-subtle)', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                    <CheckCircle size={22} style={{ color: '#16a34a' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Semua checklist selesai</span>
                    <span>Semua checklist aset Anda sudah selesai. Kerja yang luar biasa!</span>
                  </div>
                )}
              </div>
            </div>

            {/* My Upcoming Publications */}
            <div className="insight-panel dashboard-upcoming-panel">
              <div className="insight-header">
                <h3 className="insight-title">Upcoming publishing</h3>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Next in your calendar</span>
              </div>

              <div className="recent-activity-list">
                {myUpcoming.length > 0 ? (
                  myUpcoming.map((item) => (
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
                          <span className="tag-badge" style={getChannelStyle(item.channel)}>{item.brand || item.channel || item.taskType}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '12px' }}>
                          {(item.taskType === 'General' || variablesConfig.publishDate) && (
                            <span className="activity-time">
                              {item.taskType === 'General' ? 'Due Date' : 'Publish Date'}: <strong>{getTargetDate(item) || 'TBD'}</strong>
                            </span>
                          )}
                          <span className={getStatusClass(item.status)} style={{ fontWeight: 500 }}>
                            {item.status}
                          </span>
                          {item.assetsLink && (
                            <a 
                              href={item.assetsLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--primary)', fontWeight: 500 }}
                            >
                              Open Folder <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Belum ada task terdekat yang ditugaskan kepada Anda.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================
          TAB: STUDIO OVERVIEW (GENERAL VIEW)
          ========================================= */}
      {dashboardTab === 'studio' && (
        <div style={{ animation: 'fadeIn var(--transition-fast)' }}>
          {/* Operational Metrics Row */}
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
                <span className="metric-title">In Progress</span>
                <Clock size={18} style={{ color: '#2563eb' }} />
              </div>
              <span className="metric-value">{inProduction}</span>
              <span className="metric-trend text-secondary">
                {totalCount > 0 ? Math.round((inProduction / totalCount) * 100) : 0}% of total backlog
              </span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Completed & Scheduled</span>
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

          {/* Performance KPI Row */}
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={16} className="text-secondary" />
            <span>Studio Performance KPI</span>
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

          {/* Performance Charts Insights Grid */}
          <div className="dashboard-insights" style={{ marginBottom: '28px' }}>
            
            {/* Top Performing Leaderboard */}
            <div className="insight-panel">
              <div className="insight-header">
                <h3 className="insight-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={16} style={{ color: '#d97706' }} />
                  Leaderboard Konten Terbaik
                </h3>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Berdasarkan views</span>
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
                          <span className="tag-badge" style={getChannelStyle(item.channel)}>{item.brand || item.channel || item.taskType}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Eye size={10} /> <strong>{formatNumber(parseInt(item.views || '0', 10))}</strong> Views</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><ThumbsUp size={10} /> <strong>{formatNumber(parseInt(item.likes || '0', 10))}</strong> Likes</span>
                          <span>PIC: {item.assignee || 'Unassigned'}</span>
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

            {/* Content Format efficiency bars */}
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

          {/* Operational drilldowns */}
          <div className="dashboard-insights">
            {/* Upcoming Publications */}
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
                          {(item.taskType === 'General' || variablesConfig.publishDate) && (
                            <span className="activity-time">
                              {item.taskType === 'General' ? 'Due Date' : 'Publish Date'}: <strong>{getTargetDate(item) || 'TBD'}</strong>
                            </span>
                          )}
                          <span className={getStatusClass(item.status)} style={{ fontWeight: 500 }}>
                            {item.status}
                          </span>
                          <span className="text-muted">| PIC: {item.assignee || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No upcoming tasks. Create a task or update target dates!
                  </div>
                )}
              </div>
            </div>

            {/* Channel distribution */}
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
      )}

    </div>
  );
};
