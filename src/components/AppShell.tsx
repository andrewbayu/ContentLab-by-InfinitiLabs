import React, { useState } from 'react';
import type { TeamMember } from '../services/sheets';
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
  Calendar
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  isMock: boolean;
  currentUser: TeamMember | null;
  onLogout: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  isMock,
  currentUser,
  onLogout,
}) => {
  // Desktop state: visible by default (isSidebarCollapsed = false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Mobile state: hidden by default (isMobileOpen = false)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const handleDrawerToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar - Collapsible & Slide-over Drawer */}
      <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'open' : ''}`}>
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
          >
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <LayoutDashboard className="nav-item-icon" />
            Dashboard
          </button>
          
          <button
            className={`nav-item ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => handleNavClick('board')}
          >
            <Kanban className="nav-item-icon" />
            Kanban Board
          </button>

          <button
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => handleNavClick('calendar')}
          >
            <Calendar className="nav-item-icon" />
            Content Calendar
          </button>

          <button
            className={`nav-item ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => handleNavClick('list')}
          >
            <ListTodo className="nav-item-icon" />
            Content List
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings')}
          >
            <Settings className="nav-item-icon" />
            Settings Manager
          </button>

          {/* Spacer to push logout to bottom */}
          <div style={{ flexGrow: 1 }} />

          {/* Sign Out Button */}
          <button
            className="nav-item"
            onClick={() => {
              onLogout();
              setIsMobileOpen(false);
            }}
            style={{ 
              color: '#dc2626', 
              borderTop: '1px solid var(--border-subtle)', 
              borderRadius: '0', 
              paddingTop: '16px', 
              marginTop: '16px' 
            }}
          >
            <LogOut className="nav-item-icon" />
            Sign Out
          </button>
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
              Sandbox Mode (Local)
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
            >
              <Menu size={20} style={{ display: 'block' }} />
            </button>

            <h2 className="header-title">
              {activeTab === 'dashboard' && 'Dashboard Analytics'}
              {activeTab === 'board' && 'Content Kanban Board'}
              {activeTab === 'calendar' && 'Content Calendar Planner'}
              {activeTab === 'list' && 'Content Schedule List'}
              {activeTab === 'settings' && 'Settings Center'}
            </h2>
          </div>
          
          <div className="header-actions">
            {/* Authenticated User Profile Avatar Info */}
            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '16px' }}>
                <img 
                  src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"}
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
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active Crew</span>
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={onOpenCreateModal}>
              <Plus size={16} />
              <span>Create Content</span>
            </button>
          </div>
        </header>

        <main className="app-main-content" style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
