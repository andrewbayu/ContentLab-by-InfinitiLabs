import React, { useState } from 'react';
import type { TeamMember } from '../services/sheets';
import { 
  LayoutDashboard, 
  Kanban, 
  ListTodo, 
  Settings, 
  Plus, 
  Layers, 
  User, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  isMock: boolean;
  activeUser: string;
  setActiveUser: (user: string) => void;
  team: TeamMember[];
  onLogout: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  isMock,
  activeUser,
  setActiveUser,
  team,
  onLogout,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Sidebar Overlay Backdrop */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar - Drawer Layout */}
      <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
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
          
          {/* Close Sidebar Drawer Button */}
          <button 
            type="button"
            className="btn btn-secondary btn-icon-only" 
            onClick={() => setIsSidebarOpen(false)}
            style={{ border: 'none', padding: '6px' }}
            title="Close Menu"
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
              setIsSidebarOpen(false);
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
            {/* Hamburger Burger Menu Button */}
            <button 
              type="button"
              className="btn btn-secondary btn-icon-only" 
              onClick={() => setIsSidebarOpen(true)}
              style={{ border: 'none', padding: '8px', marginRight: '12px' }}
              title="Open Menu"
            >
              <Menu size={20} style={{ display: 'block' }} />
            </button>

            <h2 className="header-title">
              {activeTab === 'dashboard' && 'Dashboard Analytics'}
              {activeTab === 'board' && 'Content Kanban Board'}
              {activeTab === 'list' && 'Content Schedule List'}
              {activeTab === 'settings' && 'Settings Center'}
            </h2>
          </div>
          
          <div className="header-actions">
            {/* Active User Profile Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: activeUser ? 'var(--primary-glow)' : 'rgba(217, 119, 6, 0.1)', 
                  border: activeUser ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid rgba(217, 119, 6, 0.3)',
                  color: activeUser ? 'var(--primary)' : '#d97706'
                }}
                title={activeUser ? `Logged in as ${activeUser}` : "No profile selected"}
              >
                <User size={15} />
              </div>
              
              <select
                className="select-filter"
                value={activeUser}
                onChange={(e) => setActiveUser(e.target.value)}
                style={{ 
                  padding: '6px 28px 6px 12px', 
                  fontSize: '13px', 
                  minWidth: '150px',
                  borderColor: activeUser ? 'var(--border-strong)' : '#d97706',
                  color: activeUser ? 'var(--text-primary)' : '#b45309',
                  fontWeight: activeUser ? 500 : 600
                }}
              >
                <option value="">Choose Profile...</option>
                {team.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

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
