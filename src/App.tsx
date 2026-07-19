import { useState, useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { SettingsView } from './components/SettingsView';
import { TaskModal } from './components/TaskModal';
import { LoginPage } from './components/LoginPage';
import {
  fetchData,
  createContent,
  updateContent,
  deleteContent,
  createChannel,
  deleteChannel,
  createTeamMember,
  deleteTeamMember,
  createComment,
  getVariablesConfig,
  saveVariablesConfig,
  getCustomTags,
  saveCustomTags,
  getActiveUser,
  saveActiveUser,
  isMockMode
} from './services/sheets';
import type { ContentItem, TeamMember, Channel, VariablesConfig, CommentItem } from './services/sheets';
import { RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    localStorage.getItem('contentlab_is_authenticated') === 'true'
  );

  const [items, setItems] = useState<ContentItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  
  // Custom configurations & active user
  const [variablesConfig, setVariablesConfig] = useState<VariablesConfig>(getVariablesConfig());
  const [customTags, setCustomTags] = useState<string[]>(getCustomTags());
  const [activeUser, setActiveUser] = useState<string>(getActiveUser());
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [initialStatusForModal, setInitialStatusForModal] = useState<ContentItem['status'] | undefined>(undefined);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMock, setIsMock] = useState<boolean>(isMockMode());

  // Load spreadsheet data
  const loadData = async (showLoading = true) => {
    if (!isAuthenticated) return;
    if (showLoading) setIsLoading(true);
    try {
      const data = await fetchData();
      setItems(data.content);
      setTeam(data.team);
      setChannels(data.channels);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      addToast('Error loading data from Google Sheets.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isMock, isAuthenticated]);

  // Handle connection script changes
  const handleConnectionChange = () => {
    setIsMock(isMockMode());
  };

  // Toast System
  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('contentlab_is_authenticated');
    setIsAuthenticated(false);
    addToast('Signed out of ContentLab.', 'info');
  };

  // Create or Update content planner
  const handleSaveItem = async (
    itemPayload: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    setIsModalOpen(false);
    setIsLoading(true);

    const isEdit = !!itemPayload.id;

    try {
      if (isEdit && itemPayload.id) {
        const existing = items.find((i) => i.id === itemPayload.id);
        if (!existing) throw new Error('Content item not found');

        const updatedPayload: ContentItem = {
          ...existing,
          ...itemPayload,
          id: itemPayload.id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        };

        setItems((prev) => prev.map((item) => (item.id === itemPayload.id ? updatedPayload : item)));
        
        await updateContent(updatedPayload);
        addToast(`Successfully updated "${itemPayload.title}"`, 'success');
      } else {
        const createdPayload = {
          ...itemPayload,
          createdBy: activeUser || 'Anonymous'
        };
        const created = await createContent(createdPayload);
        setItems((prev) => [created, ...prev]);
        addToast(`Successfully created "${itemPayload.title}"`, 'success');
      }
    } catch (e) {
      console.error(e);
      addToast(`Failed to save content. Sync failed.`, 'error');
      loadData(false);
    } finally {
      setIsLoading(false);
      setSelectedItem(null);
    }
  };

  // Move content item status (drag and drop)
  const handleMoveItem = async (id: string, newStatus: ContentItem['status']) => {
    const originalItems = [...items];
    const targetItem = items.find((item) => item.id === id);
    if (!targetItem || targetItem.status === newStatus) return;

    const updatedItem: ContentItem = {
      ...targetItem,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));

    try {
      await updateContent(updatedItem);
      addToast(`Status updated to "${newStatus}"`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Sync failed. Reverting status...', 'error');
      setItems(originalItems);
    }
  };

  // Delete content planner
  const handleDeleteItem = async (id: string) => {
    setIsModalOpen(false);
    const originalItems = [...items];
    const itemToDelete = items.find((item) => item.id === id);

    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteContent(id);
      addToast(`Successfully deleted "${itemToDelete?.title || 'Content Plan'}"`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Failed to delete content in Google Sheet. Reverting...', 'error');
      setItems(originalItems);
    } finally {
      setSelectedItem(null);
    }
  };

  // Discussion comments
  const handleAddComment = async (contentId: string, text: string) => {
    if (!activeUser) {
      addToast('Harap pilih profil Anda di pojok kanan atas sebelum mengirim komentar!', 'error');
      return;
    }
    try {
      const created = await createComment({
        contentId,
        author: activeUser,
        text
      });
      setComments((prev) => [...prev, created]);
      addToast('Komentar diskusi terkirim!', 'success');
    } catch (e) {
      console.error(e);
      addToast('Gagal mengirim komentar.', 'error');
    }
  };

  // Crew Handlers
  const handleAddCreator = async (name: string, email: string): Promise<TeamMember> => {
    setIsLoading(true);
    try {
      const created = await createTeamMember({ name, email });
      setTeam((prev) => [...prev, created]);
      addToast(`Added creator "${name}" to Team!`, 'success');
      return created;
    } catch (e) {
      console.error(e);
      addToast('Failed to add creator to Google Sheet.', 'error');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCreator = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteTeamMember(id);
      setTeam((prev) => prev.filter((t) => t.id !== id));
      addToast('Crew member removed from team registry.', 'success');
    } catch (e) {
      addToast('Failed to remove crew member.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Channel Handlers
  const handleAddChannel = async (name: string, color: string): Promise<Channel> => {
    setIsLoading(true);
    try {
      const created = await createChannel({ name, color });
      setChannels((prev) => [...prev, created]);
      addToast(`Added channel "${name}" with color ${color}!`, 'success');
      return created;
    } catch (e) {
      console.error(e);
      addToast('Failed to add channel to Google Sheet.', 'error');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteChannel(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
      addToast('Channel removed from registry.', 'success');
    } catch (e) {
      addToast('Failed to remove platform channel.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Variable Toggles Handlers
  const handleSaveVariablesConfig = (config: VariablesConfig) => {
    saveVariablesConfig(config);
    setVariablesConfig(config);
  };

  // Custom Tags Handlers
  const handleAddTag = (tag: string) => {
    const updated = [...customTags, tag];
    saveCustomTags(updated);
    setCustomTags(updated);
  };

  const handleDeleteTag = (tag: string) => {
    const updated = customTags.filter((t) => t !== tag);
    saveCustomTags(updated);
    setCustomTags(updated);
    addToast(`Tag "${tag}" deleted.`, 'success');
  };

  const handleActiveUserChange = (user: string) => {
    setActiveUser(user);
    saveActiveUser(user);
    addToast(`Switched active profile to "${user || 'None'}"`, 'info');
  };

  const handleOpenCreateModal = () => {
    setSelectedItem(null);
    setInitialStatusForModal(undefined);
    setIsModalOpen(true);
  };

  const handleOpenCreateModalWithStatus = (status: ContentItem['status']) => {
    setSelectedItem(null);
    setInitialStatusForModal(status);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ContentItem) => {
    setSelectedItem(item);
    setInitialStatusForModal(undefined);
    setIsModalOpen(true);
  };

  // Render Login view if user is not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
        {/* Toast Alert System overlay for login failure notifications */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.type === 'success' && <CheckCircle2 size={16} style={{ color: '#16a34a' }} />}
              {toast.type === 'error' && <AlertCircle size={16} style={{ color: '#dc2626' }} />}
              <span className="toast-text">{toast.message}</span>
              <button className="toast-close" onClick={() => removeToast(toast.id)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenCreateModal={handleOpenCreateModal}
      isMock={isMock}
      activeUser={activeUser}
      setActiveUser={handleActiveUserChange}
      team={team}
      onLogout={handleLogout}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 9999,
          color: 'var(--text-primary)'
        }}>
          <RefreshCw className="nav-item-icon" style={{ width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em' }}>Syncing ContentLab Sheets...</span>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Pages Container */}
      <div style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            items={items}
            onEditItem={handleOpenEditModal}
            channels={channels}
            variablesConfig={variablesConfig}
          />
        )}
        
        {activeTab === 'board' && (
          <KanbanBoard
            items={items}
            onMoveItem={handleMoveItem}
            onEditItem={handleOpenEditModal}
            onOpenCreateModalWithStatus={handleOpenCreateModalWithStatus}
            channels={channels}
            variablesConfig={variablesConfig}
            activeUser={activeUser}
          />
        )}

        {activeTab === 'list' && (
          <ListView
            items={items}
            onEditItem={handleOpenEditModal}
            channels={channels}
            variablesConfig={variablesConfig}
            activeUser={activeUser}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onConnectionChange={handleConnectionChange}
            addToast={addToast}
            variablesConfig={variablesConfig}
            onSaveVariablesConfig={handleSaveVariablesConfig}
            tags={customTags}
            onAddTag={handleAddTag}
            onDeleteTag={handleDeleteTag}
            team={team}
            onAddCreator={handleAddCreator}
            onDeleteCreator={handleDeleteCreator}
            channels={channels}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
          />
        )}
      </div>

      {/* Task Creation & Editing Drawer Slide-Over */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        item={selectedItem}
        initialStatus={initialStatusForModal}
        team={team}
        channels={channels}
        variablesConfig={variablesConfig}
        customTags={customTags}
        activeUser={activeUser}
        comments={comments}
        onAddComment={handleAddComment}
        onAddCreator={handleAddCreator}
        onAddChannel={handleAddChannel}
      />

      {/* Toast Alert System overlay */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={16} style={{ color: '#16a34a' }} />}
            {toast.type === 'error' && <AlertCircle size={16} style={{ color: '#dc2626' }} />}
            <span className="toast-text">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export default App;
