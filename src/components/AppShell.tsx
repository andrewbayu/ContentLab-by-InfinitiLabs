import React, { useState } from 'react';
import type { ClientBrand, TeamMember, NotificationItem } from '../services/sheets';
import { ScopeDropdown } from './ScopeDropdown';
import { 
  LayoutDashboard, 
  Kanban, 
  ListTodo, 
  Settings, 
  Plus, 
  Layers, 
  LogOut, 
  Menu, 
  X,
  Calendar,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  FileText,
  Files,
  ClipboardCheck,
  Bell,
} from 'lucide-react';
import { getGeneratedAvatar } from '../utils/avatar';

type SyncStatus = 'saved' | 'saving' | 'syncing';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  isMock: boolean;
  currentUser: TeamMember | null;
  onLogout: () => void;
  clients: ClientBrand[];
  scopeKey: string;
  onScopeChange: (scopeKey: string) => void;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  onRefresh: () => void;
  notifications?: NotificationItem[];
  onMarkNotificationRead?: (id: string) => Promise<void>;
  onMarkAllNotificationsRead?: () => Promise<void>;
  onOpenNotification?: (notification: NotificationItem) => Promise<void>;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  isMock,
  currentUser,
  onLogout,
  clients,
  scopeKey,
  onScopeChange,
  syncStatus,
  lastSyncedAt,
  onRefresh,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenNotification,
}) => {
  // Desktop state: visible by default (isSidebarCollapsed = false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Mobile state: hidden by default (isMobileOpen = false)
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const handleDrawerToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    setIsMobileOpen(!isMobileOpen);
  };

  const syncLabel = syncStatus === 'saving'
    ? 'Saving…'
    : syncStatus === 'syncing'
      ? 'Syncing…'
      : 'Saved';
  const syncTitle = lastSyncedAt
    ? `Last updated ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(lastSyncedAt))}`
    : 'Workspace is ready';
  const unreadNotifications = notifications.filter((notification) => !notification.read);

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar - Collapsible & Slide-over Drawer */}
      <aside className={`app-sidebar role-${currentUser?.role || 'team'} ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <div className="sidebar-logo">
              <Layers size={18} />
            </div>
            <div className="sidebar-brand">
              <span className="brand-name">ContentLab</span>
              <span className="brand-tag">Studio Planner</span>
            </div>
          </div>
          
          {/* Close Sidebar Drawer Button (Toggles Collapse / Close) */}
          <button 
            type="button"
            className="btn btn-secondary btn-icon-only" 
            onClick={() => {
              setIsSidebarCollapsed(true);
              setIsMobileOpen(false);
            }}
            style={{ border: 'none', padding: '6px' }}
            title="Collapse Menu"
            aria-label="Collapse sidebar menu"
          >
            <X size={16} />
          </button>
        </div>

        {currentUser?.role !== 'client' && (
          <ScopeDropdown
            clients={clients}
            scopeKey={scopeKey}
            onScopeChange={onScopeChange}
          />
        )}

        <nav className="sidebar-nav" aria-label="Main navigation">
          {currentUser?.role === 'client' ? (
            <>
              <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => handleNavClick('dashboard')}><LayoutDashboard className="nav-item-icon" />Overview</button>
              <button className={`nav-item ${activeTab === 'review' ? 'active' : ''}`} aria-current={activeTab === 'review' ? 'page' : undefined} onClick={() => handleNavClick('review')}><ClipboardCheck className="nav-item-icon" />Content Review</button>
              <button className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} aria-current={activeTab === 'calendar' ? 'page' : undefined} onClick={() => handleNavClick('calendar')}><Calendar className="nav-item-icon" />Content Calendar</button>
              <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} aria-current={activeTab === 'reports' ? 'page' : undefined} onClick={() => handleNavClick('reports')}><Files className="nav-item-icon" />Reports</button>
            </>
          ) : (
            <>
              <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => handleNavClick('dashboard')}><LayoutDashboard className="nav-item-icon" />Overview</button>
              <span className="nav-section-label">Planning</span>
              <button className={`nav-item ${activeTab === 'board' ? 'active' : ''}`} aria-current={activeTab === 'board' ? 'page' : undefined} onClick={() => handleNavClick('board')}><Kanban className="nav-item-icon" />Kanban Board</button>
              <button className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} aria-current={activeTab === 'calendar' ? 'page' : undefined} onClick={() => handleNavClick('calendar')}><Calendar className="nav-item-icon" />Task Calendar</button>
              <button className={`nav-item ${activeTab === 'list' ? 'active' : ''}`} aria-current={activeTab === 'list' ? 'page' : undefined} onClick={() => handleNavClick('list')}><ListTodo className="nav-item-icon" />Task List</button>
              <span className="nav-section-label">Knowledge</span>
              <button className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} aria-current={activeTab === 'documents' ? 'page' : undefined} onClick={() => handleNavClick('documents')}><FileText className="nav-item-icon" />Documents &amp; Notes</button>
              <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} aria-current={activeTab === 'reports' ? 'page' : undefined} onClick={() => handleNavClick('reports')}><Files className="nav-item-icon" />Reports</button>
              <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} aria-current={activeTab === 'analytics' ? 'page' : undefined} onClick={() => handleNavClick('analytics')}><BarChart3 className="nav-item-icon" />Analytics &amp; KPI</button>
              {currentUser?.role === 'super' && (
                <>
                  <span className="nav-section-label">Admin</span>
                  <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} aria-current={activeTab === 'settings' ? 'page' : undefined} onClick={() => handleNavClick('settings')}><Settings className="nav-item-icon" />Settings Manager</button>
                </>
              )}
            </>
          )}
          <div style={{ flexGrow: 1 }} />
          <button className="nav-item nav-signout" onClick={() => { onLogout(); setIsMobileOpen(false); }}><LogOut className="nav-item-icon" />Sign Out</button>
        </nav>

        {isMock && (
          <div className="sidebar-footer">
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.15)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--primary)',
              textAlign: 'center',
              fontWeight: 600
            }}>
              Supabase Not Connected
            </div>
          </div>
        )}
      </aside>

      {/* Main Container */}
      <div className="app-main">
        <header className="app-header">
          <div className="header-title-section">
            {/* Hamburger Burger Menu Button - Toggles sidebar collapse */}
            <button 
              type="button"
              className="btn btn-secondary btn-icon-only" 
              onClick={handleDrawerToggle}
              style={{ border: 'none', padding: '8px', marginRight: '12px' }}
              title="Toggle Menu"
              aria-label="Toggle sidebar menu"
            >
              <Menu size={20} style={{ display: 'block' }} />
            </button>

            <h2 className="header-title">
              {activeTab === 'dashboard' && (currentUser?.role === 'client' ? 'Client Workspace' : 'Workspace Overview')}
              {activeTab === 'review' && 'Content Review'}
              {activeTab === 'board' && 'Task Kanban Board'}
              {activeTab === 'calendar' && 'Task Calendar Planner'}
              {activeTab === 'list' && 'Task List'}
              {activeTab === 'documents' && 'Documents & Notes'}
              {activeTab === 'reports' && 'Reports'}
              {activeTab === 'analytics' && 'Analytics & KPI'}
              {activeTab === 'settings' && 'Settings Center'}
            </h2>
          </div>
          
          <div className="header-actions">
            <button
              type="button"
              className={`sync-indicator sync-${syncStatus}`}
              onClick={onRefresh}
              disabled={syncStatus !== 'saved'}
              title={syncTitle}
              aria-label={`${syncLabel}. ${syncTitle}`}
            >
              {syncStatus === 'saved'
                ? <CheckCircle2 size={14} />
                : <RefreshCw className="sync-spin" size={14} />}
              <span>{syncLabel}</span>
            </button>

            <div className="notification-center">
              <button
                type="button"
                className={`notification-trigger ${isNotificationsOpen ? 'active' : ''}`}
                onClick={() => setIsNotificationsOpen((open) => !open)}
                aria-label={`Notifications${unreadNotifications.length ? `, ${unreadNotifications.length} unread` : ''}`}
                aria-expanded={isNotificationsOpen}
              >
                <Bell size={17} />
                {unreadNotifications.length > 0 && <span className="notification-count">{unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}</span>}
              </button>
              {isNotificationsOpen && (
                <div className="notification-popover" role="dialog" aria-label="Notifications">
                  <div className="notification-popover-header">
                    <strong>Notifications</strong>
                    {unreadNotifications.length > 0 && onMarkAllNotificationsRead && (
                      <button type="button" onClick={() => void onMarkAllNotificationsRead()} className="notification-mark-all">Mark all read</button>
                    )}
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">No notifications yet.</div>
                    ) : notifications.slice(0, 20).map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className={`notification-item ${notification.read ? '' : 'unread'}`}
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          if (onOpenNotification) void onOpenNotification(notification);
                          else if (onMarkNotificationRead) void onMarkNotificationRead(notification.id);
                        }}
                      >
                        <span className="notification-dot" aria-hidden="true" />
                        <span className="notification-item-copy">
                          <strong>{notification.title || 'New notification'}</strong>
                          <span>{notification.body || 'Open ContentLab to review this update.'}</span>
                          <small>{new Date(notification.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Authenticated User Profile Avatar Info */}
            {currentUser && (
              <div className="header-user-chip" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '16px' }}>
                <img 
                  src={getGeneratedAvatar(currentUser.name)}
                  alt={currentUser.name} 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    objectFit: 'cover', 
                    border: '2px solid var(--primary-glow)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', textAlign: 'left' }}>
                  <span style={{ fontWeight: 650, color: 'var(--text-primary)', lineHeight: 1.2 }}>{currentUser.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {currentUser.role === 'super' ? 'Super Admin' : currentUser.role === 'client' ? 'Client' : 'Team Member'}
                  </span>
                </div>
              </div>
            )}

            {activeTab !== 'documents' && currentUser?.role !== 'client' && (
              <button className="btn btn-primary" onClick={onOpenCreateModal}>
                <Plus size={16} />
                <span>Create Task</span>
              </button>
            )}
          </div>
        </header>

        <main className="app-main-content" style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
