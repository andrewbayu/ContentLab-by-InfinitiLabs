import { useState, useEffect, useMemo, useRef } from 'react';
import { AppShell } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { ClientPortal } from './components/ClientPortal';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { SettingsView } from './components/SettingsView';
import { TaskModal } from './components/TaskModal';
import { LoginPage } from './components/LoginPage';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { DocumentsView } from './components/DocumentsView';
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
  createDocument,
  updateDocument,
  deleteDocument,
  getVariablesConfig,
  saveVariablesConfig,
  getCustomTags,
  saveCustomTags,
  getCachedWorkspaceData,
  saveCachedWorkspaceData,
  isUserInvolved,
  isMockMode
} from './services/sheets';
import type { ContentItem, TeamMember, Channel, VariablesConfig, CommentItem, ClientBrand, KpiDefinition, KpiUpdate, DocumentItem } from './services/sheets';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

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

  const [initialCache] = useState(() => getCachedWorkspaceData());
  const [items, setItems] = useState<ContentItem[]>(() => initialCache?.content || []);
  const [team, setTeam] = useState<TeamMember[]>(() => initialCache?.team || []);
  const [channels, setChannels] = useState<Channel[]>(() => initialCache?.channels || []);
  const [comments, setComments] = useState<CommentItem[]>(() => initialCache?.comments || []);
  const [clients, setClients] = useState<ClientBrand[]>(() => initialCache?.clients || []);
  const [kpiDefinitions, setKpiDefinitions] = useState<KpiDefinition[]>(() => initialCache?.kpiDefinitions || []);
  const [kpiUpdates, setKpiUpdates] = useState<KpiUpdate[]>(() => initialCache?.kpiUpdates || []);
  const [documents, setDocuments] = useState<DocumentItem[]>(() => initialCache?.documents || []);
  const [scopeKey, setScopeKey] = useState(() => localStorage.getItem('contentlab_scope_key') || 'all');
  const [taskView, setTaskView] = useState<TaskView>(() => (localStorage.getItem('contentlab_task_view') as TaskView) || 'all');
  
  // Custom configurations & tags registry
  const [variablesConfig, setVariablesConfig] = useState<VariablesConfig>(getVariablesConfig());
  const [customTags, setCustomTags] = useState<string[]>(getCustomTags());
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(isAuthenticated && !initialCache);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingWrites, setPendingWrites] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialCache?.savedAt || null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [initialStatusForModal, setInitialStatusForModal] = useState<ContentItem['status'] | undefined>(undefined);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMock, setIsMock] = useState<boolean>(isMockMode());
  const hasWorkspaceData = useRef<boolean>(!!initialCache);

  // Load spreadsheet database
  const loadData = async (showLoading = true) => {
    if (!isAuthenticated) return;
    if (showLoading && !hasWorkspaceData.current) setIsInitialLoading(true);
    setIsSyncing(true);
    try {
      const data = await fetchData();
      setItems(data.content);
      setTeam(data.team);
      setChannels(data.channels);
      setComments(data.comments || []);
      setClients(data.clients || []);
      setKpiDefinitions(data.kpiDefinitions || []);
      setKpiUpdates(data.kpiUpdates || []);
      setDocuments(data.documents || []);
      hasWorkspaceData.current = true;
      setLastSyncedAt(saveCachedWorkspaceData(data));

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
      setIsInitialLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isMock, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasWorkspaceData.current) return;
    const cacheTimer = window.setTimeout(() => {
      saveCachedWorkspaceData({
        content: items,
        team,
        channels,
        comments,
        clients,
        kpiDefinitions,
        kpiUpdates,
        documents,
      });
    }, 120);
    return () => window.clearTimeout(cacheTimer);
  }, [isAuthenticated, items, team, channels, comments, clients, kpiDefinitions, kpiUpdates, documents]);

  const beginWrite = () => setPendingWrites((count) => count + 1);
  const endWrite = () => setPendingWrites((count) => Math.max(0, count - 1));

  useEffect(() => {
    if (activeTab === 'settings' && currentUser?.role !== 'super') {
      setActiveTab('dashboard');
    }
    if (currentUser?.role === 'client' && activeTab !== 'dashboard') setActiveTab('dashboard');
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
    beginWrite();

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
          creatorId: existing.creatorId,
          createdBy: existing.createdBy,
          actorId: currentUser?.id,
          updatedAt: new Date().toISOString(),
        };

        const updated = await updateContent(updatedPayload);
        setItems((prev) => prev.map((item) => (item.id === itemPayload.id ? updated : item)));
        addToast(`Successfully updated "${itemPayload.title}"`, 'success');
      } else {
        const createdPayload = {
          ...itemPayload,
          createdBy: currentUser?.name || 'Anonymous',
          creatorId: currentUser?.id || '',
          actorId: currentUser?.id || '',
        };
        const created = await createContent(createdPayload);
        setItems((prev) => [created, ...prev]);
        addToast(`Successfully created "${itemPayload.title}"`, 'success');
      }
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'Unknown sync error';
      addToast(`Failed to save task. ${message}`, 'error');
      loadData(false);
    } finally {
      endWrite();
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
      actorId: currentUser?.id,
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));
    beginWrite();

    try {
      await updateContent(updatedItem);
      addToast(`Rescheduled to ${newDate}`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Sync failed. Reverting date...', 'error');
      setItems(originalItems);
    } finally {
      endWrite();
    }
  };

  // Drag and drop kanban status change
  const handleMoveItem = async (id: string, newStatus: ContentItem['status']) => {
    const originalItems = [...items];
    const targetItem = items.find((item) => item.id === id);
    if (!targetItem || targetItem.status === newStatus) return;
    const allowedStatuses: ContentItem['status'][] = targetItem.taskType === 'General'
      ? ['To Do', 'In Progress', 'Done']
      : ['Idea', 'Scripting/Writing', 'Production/Design', 'Review/Editing', 'Scheduled', 'Published'];
    if (!allowedStatuses.includes(newStatus)) {
      addToast('Status tersebut tidak sesuai dengan jenis task.', 'error');
      return;
    }
    if (!['Idea', 'To Do'].includes(newStatus) && !targetItem.ownerId && !targetItem.assignee) {
      setSelectedItem(targetItem);
      setIsModalOpen(true);
      addToast('Pilih satu PIC sebelum task masuk tahap aktif.', 'error');
      return;
    }

    const updatedItem: ContentItem = {
      ...targetItem,
      status: newStatus,
      actorId: currentUser?.id,
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));
    beginWrite();

    try {
      await updateContent(updatedItem);
      addToast(`Status updated to "${newStatus}"`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Sync failed. Reverting status...', 'error');
      setItems(originalItems);
    } finally {
      endWrite();
    }
  };

  // Delete task
  const handleDeleteItem = async (id: string) => {
    setIsModalOpen(false);
    const originalItems = [...items];
    const itemToDelete = items.find((item) => item.id === id);

    setItems((prev) => prev.filter((item) => item.id !== id));
    beginWrite();

    try {
      await deleteContent(id);
      addToast(`Successfully deleted "${itemToDelete?.title || 'Task'}"`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Failed to delete task in Google Sheet. Reverting...', 'error');
      setItems(originalItems);
    } finally {
      endWrite();
      setSelectedItem(null);
    }
  };

  // Discussion comment thread action
  const handleAddComment = async (contentId: string, text: string, attachmentUrl?: string) => {
    if (!currentUser) return;
    beginWrite();
    try {
      const created = await createComment({
        contentId,
        author: currentUser.name,
        text,
        attachmentUrl
      });
      setComments((prev) => [...prev, created]);
      addToast('Comment posted successfully!', 'success');
    } catch (e) {
      console.error(e);
      addToast('Failed to save comment.', 'error');
    } finally {
      endWrite();
    }
  };

  const handleClientUpdateItem = async (item: ContentItem) => {
    beginWrite();
    try {
      const updated = await updateContent(item);
      setItems((prev) => prev.map((entry) => entry.id === updated.id ? updated : entry));
      addToast('Review status saved.', 'success');
    } finally {
      endWrite();
    }
  };

  // Crew Handlers
  const handleAddCreator = async (name: string, email: string): Promise<TeamMember> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
    beginWrite();
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
      endWrite();
    }
  };

  const handleDeleteCreator = async (id: string) => {
    if (currentUser?.role !== 'super') return;
    beginWrite();
    try {
      await deleteTeamMember(id);
      setTeam((prev) => prev.filter((t) => t.id !== id));
      addToast('Crew member removed from team registry.', 'success');
    } catch (e) {
      addToast('Failed to remove crew member.', 'error');
    } finally {
      endWrite();
    }
  };

  // Channel Handlers
  const handleAddChannel = async (name: string, color: string): Promise<Channel> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
    beginWrite();
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
      endWrite();
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (currentUser?.role !== 'super') return;
    beginWrite();
    try {
      await deleteChannel(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
      addToast('Channel removed from registry.', 'success');
    } catch (e) {
      addToast('Failed to remove platform channel.', 'error');
    } finally {
      endWrite();
    }
  };

  const handleAddClientBrand = async (client: string, brand: string, color: string): Promise<ClientBrand> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
    beginWrite();
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
      endWrite();
    }
  };

  const handleCreateKpiDefinition = async (definition: Omit<KpiDefinition, 'id' | 'createdAt'>): Promise<KpiDefinition> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
    beginWrite();
    try {
      const created = await createKpiDefinition(definition);
      setKpiDefinitions((previous) => [...previous, created]);
      addToast(`KPI "${created.name}" created for ${created.brand}.`, 'success');
      return created;
    } catch (error) {
      console.error(error);
      addToast('Failed to create KPI.', 'error');
      throw error;
    } finally {
      endWrite();
    }
  };

  const handleCreateKpiUpdate = async (update: Omit<KpiUpdate, 'id' | 'updatedAt'>): Promise<KpiUpdate> => {
    beginWrite();
    try {
      const created = await createKpiUpdate(update);
      setKpiUpdates((previous) => [...previous, created]);
      addToast('KPI progress updated.', 'success');
      return created;
    } catch (error) {
      console.error(error);
      addToast('Failed to update KPI progress.', 'error');
      throw error;
    } finally {
      endWrite();
    }
  };

  const handleCreateDocument = async (
    document: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DocumentItem> => {
    beginWrite();
    try {
      const created = await createDocument({ ...document, ownerId: currentUser?.id || document.ownerId });
      setDocuments((previous) => [created, ...previous]);
      addToast(`Saved "${created.title}".`, 'success');
      return created;
    } catch (error) {
      console.error(error);
      addToast('Failed to save document.', 'error');
      throw error;
    } finally {
      endWrite();
    }
  };

  const handleUpdateDocument = async (document: DocumentItem): Promise<DocumentItem> => {
    beginWrite();
    try {
      const updated = await updateDocument(document);
      setDocuments((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      addToast(`Updated "${updated.title}".`, 'success');
      return updated;
    } catch (error) {
      console.error(error);
      addToast('Failed to update document.', 'error');
      throw error;
    } finally {
      endWrite();
    }
  };

  const handleDeleteDocument = async (id: string): Promise<void> => {
    beginWrite();
    try {
      await deleteDocument(id);
      setDocuments((previous) => previous.filter((document) => document.id !== id));
      addToast('Document deleted.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to delete document.', 'error');
      throw error;
    } finally {
      endWrite();
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
    if (currentUser?.role === 'client') return item.client === currentUser.client;
    if (selectedBrand) return item.client === selectedBrand.client && item.brand === selectedBrand.brand;
    if (selectedClient) return item.client === selectedClient;
    return true;
  }), [items, selectedBrand, selectedClient, currentUser]);

  const filteredItems = useMemo(() => scopedItems.filter((item) => {
    if (taskView === 'content') return item.taskType === 'Content';
    if (taskView === 'general') return item.taskType === 'General';
    if (taskView === 'mine') return currentUser ? isUserInvolved(item, currentUser) : false;
    if (taskView === 'overdue') {
      const date = item.taskType === 'General' ? item.dueDate : item.publishDate;
      const done = item.status === 'Done' || item.status === 'Published';
      return !!date && date < new Date().toISOString().slice(0, 10) && !done;
    }
    return true;
  }), [scopedItems, taskView, currentUser]);

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
      syncStatus={pendingWrites > 0 ? 'saving' : isSyncing ? 'syncing' : 'saved'}
      lastSyncedAt={lastSyncedAt}
      onRefresh={() => loadData(false)}
    >
      {/* Pages Container */}
      <div style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isInitialLoading ? (
          <div className="workspace-skeleton" aria-label="Loading workspace">
            <div className="workspace-skeleton-heading skeleton-line" />
            <div className="workspace-skeleton-grid">
              {[0, 1, 2, 3, 4, 5].map((slot) => (
                <div className="workspace-skeleton-card" key={slot}>
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-line-short" />
                  <div className="skeleton-line skeleton-line-tiny" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
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
          currentUser.role === 'client' ? <ClientPortal items={scopedItems} documents={documents} comments={comments} currentUser={currentUser} onUpdateItem={handleClientUpdateItem} onAddComment={handleAddComment} /> : <DashboardView items={scopedItems} onEditItem={handleOpenEditModal} channels={channels} variablesConfig={variablesConfig} currentUser={currentUser} />
        )}
        
        {activeTab === 'board' && (
          <KanbanBoard
            items={filteredItems}
            onMoveItem={handleMoveItem}
            onEditItem={handleOpenEditModal}
            onOpenCreateModalWithStatus={handleOpenCreateModalWithStatus}
            channels={channels}
            variablesConfig={variablesConfig}
            taskView={taskView}
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
            currentUser={currentUser}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsView
            documents={documents}
            currentUser={currentUser}
            clients={clients}
            tasks={items}
            onCreateDocument={handleCreateDocument}
            onUpdateDocument={handleUpdateDocument}
            onDeleteDocument={handleDeleteDocument}
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
          </>
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
        activeUserId={currentUser.id}
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
