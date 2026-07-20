import { useState, useEffect, useMemo } from 'react';
import { AppShell } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { SettingsView } from './components/SettingsView';
import { TaskModal } from './components/TaskModal';
import { LoginPage } from './components/LoginPage';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import {
  fetchData,
  createContent,
  updateContent,
  deleteContent,
  createChannel,
  deleteChannel,
  createClientBrand,
  createTeamMember,
  deleteTeamMember,
  createComment,
  createKpiDefinition,
  createKpiUpdate,
  getVariablesConfig,
  saveVariablesConfig,
  getCustomTags,
  saveCustomTags,
  isMockMode
} from './services/sheets';
import type { ContentItem, TeamMember, Channel, VariablesConfig, CommentItem, ClientBrand, KpiDefinition, KpiUpdate } from './services/sheets';
import { RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type TaskView = 'all' | 'content' | 'general' | 'mine' | 'overdue';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !isMockMode() && localStorage.getItem('contentlab_is_authenticated') === 'true'
  );

  // Active Authenticated User profile state
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(() => {
    if (isMockMode()) return null;
    const saved = localStorage.getItem('contentlab_logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [items, setItems] = useState<ContentItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [clients, setClients] = useState<ClientBrand[]>([]);
  const [kpiDefinitions, setKpiDefinitions] = useState<KpiDefinition[]>([]);
  const [kpiUpdates, setKpiUpdates] = useState<KpiUpdate[]>([]);
  const [scopeKey, setScopeKey] = useState(() => localStorage.getItem('contentlab_scope_key') || 'all');
  const [taskView, setTaskView] = useState<TaskView>(() => (localStorage.getItem('contentlab_task_view') as TaskView) || 'all');
  
  // Custom configurations & tags registry
  const [variablesConfig, setVariablesConfig] = useState<VariablesConfig>(getVariablesConfig());
  const [customTags, setCustomTags] = useState<string[]>(getCustomTags());
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [initialStatusForModal, setInitialStatusForModal] = useState<ContentItem['status'] | undefined>(undefined);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMock, setIsMock] = useState<boolean>(isMockMode());

  // Load spreadsheet database
  const loadData = async (showLoading = true) => {
    if (!isAuthenticated) return;
    if (showLoading) setIsLoading(true);
    try {
      const data = await fetchData();
      setItems(data.content);
      setTeam(data.team);
      setChannels(data.channels);
      setComments(data.comments || []);
      setClients(data.clients || []);
      setKpiDefinitions(data.kpiDefinitions || []);
      setKpiUpdates(data.kpiUpdates || []);

      // Keep only sessions that still exist in the live Team registry.
      if (currentUser) {
        const found = data.team.find((t) => t.id === currentUser.id || t.email === currentUser.email);
        if (found) {
          setCurrentUser(found);
          localStorage.setItem('contentlab_logged_user', JSON.stringify(found));
        } else {
          localStorage.removeItem('contentlab_is_authenticated');
          localStorage.removeItem('contentlab_logged_user');
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      }
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

  useEffect(() => {
    if (activeTab === 'settings' && currentUser?.role !== 'super') {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser?.role]);

  useEffect(() => {
    if (scopeKey.startsWith('brand:') && clients.length > 0 && !clients.some((entry) => `brand:${entry.id}` === scopeKey)) {
      setScopeKey('all');
      localStorage.setItem('contentlab_scope_key', 'all');
    }
  }, [clients, scopeKey]);

  // Handle connection settings change
  const handleConnectionChange = () => {
    setIsMock(isMockMode());
  };

  // Toast Alerts
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
    localStorage.removeItem('contentlab_logged_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    addToast('Signed out of ContentLab.', 'info');
  };

  // Save task
  const handleSaveItem = async (
    itemPayload: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    setIsModalOpen(false);
    setIsLoading(true);

    const isEdit = !!itemPayload.id;

    try {
      if (isEdit && itemPayload.id) {
        const existing = items.find((i) => i.id === itemPayload.id);
        if (!existing) throw new Error('Task not found');

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
          createdBy: currentUser?.name || 'Anonymous'
        };
        const created = await createContent(createdPayload);
        setItems((prev) => [created, ...prev]);
        addToast(`Successfully created "${itemPayload.title}"`, 'success');
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to save task. Sync failed.', 'error');
      loadData(false);
    } finally {
      setIsLoading(false);
      setSelectedItem(null);
    }
  };

  // Reschedule publish date
  const handleMoveDate = async (id: string, newDate: string) => {
    const originalItems = [...items];
    const targetItem = items.find((item) => item.id === id);
    if (!targetItem || targetItem.publishDate === newDate) return;

    const updatedItem: ContentItem = {
      ...targetItem,
      ...(targetItem.taskType === 'General' ? { dueDate: newDate } : { publishDate: newDate }),
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));

    try {
      await updateContent(updatedItem);
      addToast(`Rescheduled to ${newDate}`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Sync failed. Reverting date...', 'error');
      setItems(originalItems);
    }
  };

  // Drag and drop kanban status change
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

  // Delete task
  const handleDeleteItem = async (id: string) => {
    setIsModalOpen(false);
    const originalItems = [...items];
    const itemToDelete = items.find((item) => item.id === id);

    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteContent(id);
      addToast(`Successfully deleted "${itemToDelete?.title || 'Task'}"`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Failed to delete task in Google Sheet. Reverting...', 'error');
      setItems(originalItems);
    } finally {
      setSelectedItem(null);
    }
  };

  // Discussion comment thread action
  const handleAddComment = async (contentId: string, text: string) => {
    if (!currentUser) return;
    try {
      const created = await createComment({
        contentId,
        author: currentUser.name,
        text
      });
      setComments((prev) => [...prev, created]);
      addToast('Comment posted successfully!', 'success');
    } catch (e) {
      console.error(e);
      addToast('Failed to save comment.', 'error');
    }
  };

  // Crew Handlers
  const handleAddCreator = async (name: string, email: string): Promise<TeamMember> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
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
    if (currentUser?.role !== 'super') return;
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
    if (currentUser?.role !== 'super') throw new Error('Super access required');
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
    if (currentUser?.role !== 'super') return;
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

  const handleAddClientBrand = async (client: string, brand: string, color: string): Promise<ClientBrand> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
    setIsLoading(true);
    try {
      const created = await createClientBrand({ client, brand, color, active: true });
      setClients((prev) => [...prev, created]);
      addToast(`Added ${client} / ${brand}`, 'success');
      return created;
    } catch (e) {
      console.error(e);
      addToast('Failed to add client/brand.', 'error');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKpiDefinition = async (definition: Omit<KpiDefinition, 'id' | 'createdAt'>): Promise<KpiDefinition> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
    try {
      const created = await createKpiDefinition(definition);
      setKpiDefinitions((previous) => [...previous, created]);
      addToast(`KPI "${created.name}" created for ${created.brand}.`, 'success');
      return created;
    } catch (error) {
      console.error(error);
      addToast('Failed to create KPI.', 'error');
      throw error;
    }
  };

  const handleCreateKpiUpdate = async (update: Omit<KpiUpdate, 'id' | 'updatedAt'>): Promise<KpiUpdate> => {
    try {
      const created = await createKpiUpdate(update);
      setKpiUpdates((previous) => [...previous, created]);
      addToast('KPI progress updated.', 'success');
      return created;
    } catch (error) {
      console.error(error);
      addToast('Failed to update KPI progress.', 'error');
      throw error;
    }
  };

  // Variable toggles
  const handleSaveVariablesConfig = (config: VariablesConfig) => {
    saveVariablesConfig(config);
    setVariablesConfig(config);
  };

  // Custom tags
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

  const selectedBrand = useMemo(
    () => scopeKey.startsWith('brand:') ? clients.find((entry) => `brand:${entry.id}` === scopeKey) : undefined,
    [clients, scopeKey]
  );

  const selectedClient = scopeKey.startsWith('client:') ? scopeKey.slice(7) : '';

  const scopedItems = useMemo(() => items.filter((item) => {
    if (selectedBrand) return item.client === selectedBrand.client && item.brand === selectedBrand.brand;
    if (selectedClient) return item.client === selectedClient;
    return true;
  }), [items, selectedBrand, selectedClient]);

  const filteredItems = useMemo(() => scopedItems.filter((item) => {
    if (taskView === 'content') return item.taskType === 'Content';
    if (taskView === 'general') return item.taskType === 'General';
    if (taskView === 'mine') return item.assignee === currentUser?.name;
    if (taskView === 'overdue') {
      const date = item.taskType === 'General' ? item.dueDate : item.publishDate;
      const done = item.status === 'Done' || item.status === 'Published';
      return !!date && date < new Date().toISOString().slice(0, 10) && !done;
    }
    return true;
  }), [scopedItems, taskView, currentUser?.name]);

  const scopeLabel = selectedBrand
    ? `${selectedBrand.client} / ${selectedBrand.brand}`
    : selectedClient || 'InfinitiLabs / All Clients';

  const handleScopeChange = (nextScope: string) => {
    setScopeKey(nextScope);
    localStorage.setItem('contentlab_scope_key', nextScope);
  };

  const handleTaskViewChange = (nextView: TaskView) => {
    setTaskView(nextView);
    localStorage.setItem('contentlab_task_view', nextView);
  };

  // Render Login page if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <LoginPage 
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
            addToast(`Selamat datang kembali, ${user.name}!`, 'success');
          }} 
        />
        {/* Toast Alert overlay for login notifications */}
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
      currentUser={currentUser}
      onLogout={handleLogout}
      clients={clients}
      scopeKey={scopeKey}
      onScopeChange={handleScopeChange}
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
        {['board', 'calendar', 'list'].includes(activeTab) && (
          <div className="task-view-bar">
            <div className="task-view-tabs">
              {([
                ['all', 'All Work'],
                ['content', 'Content'],
                ['general', 'General'],
                ['mine', 'My Work'],
                ['overdue', 'Overdue'],
              ] as [TaskView, string][]).map(([value, label]) => (
                <button key={value} className={`task-view-tab ${taskView === value ? 'active' : ''}`} onClick={() => handleTaskViewChange(value)}>{label}</button>
              ))}
            </div>
            <div className="task-view-context"><strong>{scopeLabel}</strong><span>{filteredItems.length} of {scopedItems.length} tasks</span></div>
          </div>
        )}
        {activeTab === 'dashboard' && (
          <DashboardView
            items={scopedItems}
            onEditItem={handleOpenEditModal}
            channels={channels}
            variablesConfig={variablesConfig}
            currentUser={currentUser}
          />
        )}
        
        {activeTab === 'board' && (
          <KanbanBoard
            items={filteredItems}
            onMoveItem={handleMoveItem}
            onEditItem={handleOpenEditModal}
            onOpenCreateModalWithStatus={handleOpenCreateModalWithStatus}
            channels={channels}
            variablesConfig={variablesConfig}
            activeUser={currentUser.name}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            items={filteredItems}
            channels={channels}
            onEditItem={handleOpenEditModal}
            onMoveDate={handleMoveDate}
          />
        )}

        {activeTab === 'list' && (
          <ListView
            items={filteredItems}
            onEditItem={handleOpenEditModal}
            channels={channels}
            variablesConfig={variablesConfig}
            activeUser={currentUser.name}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            items={scopedItems}
            clients={clients}
            definitions={kpiDefinitions}
            updates={kpiUpdates}
            scopeKey={scopeKey}
            scopeLabel={scopeLabel}
            currentUser={currentUser}
            onCreateDefinition={handleCreateKpiDefinition}
            onCreateUpdate={handleCreateKpiUpdate}
          />
        )}

        {activeTab === 'settings' && currentUser.role === 'super' && (
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
            clients={clients}
            onAddClientBrand={handleAddClientBrand}
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
        clients={clients}
        defaultClientBrand={selectedBrand}
        variablesConfig={variablesConfig}
        customTags={customTags}
        activeUser={currentUser.name}
        comments={comments}
        onAddComment={handleAddComment}
        onAddCreator={handleAddCreator}
        onAddChannel={handleAddChannel}
        onAddClientBrand={handleAddClientBrand}
        canManageRegistries={currentUser.role === 'super'}
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
