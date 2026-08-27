import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { AppShell } from './components/AppShell';
import { LoginPage } from './components/LoginPage';

// Route-level code splitting: each view ships in its own async chunk and is only
// downloaded when the user first navigates to it. Keeps the initial bundle lean.
const DashboardView = lazy(() => import('./components/DashboardView').then((m) => ({ default: m.DashboardView })));
const ClientPortal = lazy(() => import('./components/ClientPortal').then((m) => ({ default: m.ClientPortal })));
const KanbanBoard = lazy(() => import('./components/KanbanBoard').then((m) => ({ default: m.KanbanBoard })));
const ListView = lazy(() => import('./components/ListView').then((m) => ({ default: m.ListView })));
const SettingsView = lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })));
const TaskModal = lazy(() => import('./components/TaskModal').then((m) => ({ default: m.TaskModal })));
const CalendarView = lazy(() => import('./components/CalendarView').then((m) => ({ default: m.CalendarView })));
const AnalyticsView = lazy(() => import('./components/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const DocumentsView = lazy(() => import('./components/DocumentsView').then((m) => ({ default: m.DocumentsView })));
const ReportsView = lazy(() => import('./components/ReportsView').then((m) => ({ default: m.ReportsView })));
import {
  getVariablesConfig,
  saveVariablesConfig,
  getCustomTags,
  saveCustomTags,
  getCachedWorkspaceData,
  saveCachedWorkspaceData,
  isUserInvolved,
  hasClientAccess,
} from './services/sheets';
import {
  fetchSupabaseInitialData,
  createSupabaseContent,
  updateSupabaseContent,
  deleteSupabaseContent,
  createSupabaseTeamMember,
  updateSupabaseTeamMember,
  deleteSupabaseTeamMember,
  createSupabaseChannel,
  deleteSupabaseChannel,
  createSupabaseClientBrand,
  createSupabaseKpiDefinition,
  createSupabaseKpiUpdate,
  createSupabaseDocument,
  updateSupabaseDocument,
  deleteSupabaseDocument,
  createSupabaseComment,
  createSupabaseTaskResource,
  deleteSupabaseTaskResource,
  markSupabaseNotificationRead,
  markAllSupabaseNotificationsRead,
  subscribeToSupabaseRealtime,
  getSupabaseAuthUser,
  subscribeToSupabaseAuth,
  signOutSupabaseUser,
  isSupabaseAuthEnabled,
  isSupabaseDbConfigured,
} from './services/supabaseDb';
import type { ContentItem, TeamMember, Channel, VariablesConfig, CommentItem, ClientBrand, KpiDefinition, KpiUpdate, DocumentItem, TaskResource, NotificationItem, UserRole } from './services/sheets';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type TaskView = 'all' | 'content' | 'general' | 'mine' | 'overdue';

function App() {
  const authEnabled = isSupabaseAuthEnabled();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    authEnabled ? false : localStorage.getItem('contentlab_is_authenticated') === 'true'
  );

  // Active Authenticated User profile state
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(() => {
    if (authEnabled) return null;
    const saved = localStorage.getItem('contentlab_logged_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(authEnabled);

  const [initialCache] = useState(() => getCachedWorkspaceData());
  const [items, setItems] = useState<ContentItem[]>(() => initialCache?.content || []);
  const [team, setTeam] = useState<TeamMember[]>(() => initialCache?.team || []);
  const [channels, setChannels] = useState<Channel[]>(() => initialCache?.channels || []);
  const [comments, setComments] = useState<CommentItem[]>(() => initialCache?.comments || []);
  const [clients, setClients] = useState<ClientBrand[]>(() => initialCache?.clients || []);
  const [kpiDefinitions, setKpiDefinitions] = useState<KpiDefinition[]>(() => initialCache?.kpiDefinitions || []);
  const [kpiUpdates, setKpiUpdates] = useState<KpiUpdate[]>(() => initialCache?.kpiUpdates || []);
  const [documents, setDocuments] = useState<DocumentItem[]>(() => initialCache?.documents || []);
  const [resources, setResources] = useState<TaskResource[]>(() => initialCache?.resources || []);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => initialCache?.notifications || []);
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
  const [isMock, setIsMock] = useState<boolean>(!isSupabaseDbConfigured());
  const hasWorkspaceData = useRef<boolean>(!!initialCache);

  // Load the single operational database (Supabase)
  const loadData = async (showLoading = true) => {
    if (!isAuthenticated) return;
    if (showLoading && !hasWorkspaceData.current) setIsInitialLoading(true);
    setIsSyncing(true);
    try {
      const data = await fetchSupabaseInitialData(currentUser?.id);
      setItems(data.content);
      setTeam(data.team);
      setChannels(data.channels);
      setComments(data.comments || []);
      setClients(data.clients || []);
      setKpiDefinitions(data.kpiDefinitions || []);
      setKpiUpdates(data.kpiUpdates || []);
      setDocuments(data.documents || []);
      setResources(data.resources || []);
      setNotifications(data.notifications || []);
      hasWorkspaceData.current = true;
      setLastSyncedAt(saveCachedWorkspaceData(data));

      // Keep only sessions that still exist in the live Team registry.
      // Exceptions: (1) super-admin virtual user always stays, (2) empty team = DB not yet imported
      if (currentUser) {
        const isSuperAdminFallback = currentUser.id === 'super-admin-default';
        const teamIsEmpty = !data.team || data.team.length === 0;
        if (isSuperAdminFallback || teamIsEmpty) {
          // Keep the session — don't force logout for emergency admin or empty DB state
        } else {
          const found = data.team.find((t) => t.id === currentUser.id || t.email === currentUser.email);
          if (found) {
            setCurrentUser(found);
            localStorage.setItem('contentlab_logged_user', JSON.stringify(found));
          } else {
            handleLogout();
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      addToast('Error loading workspace from Supabase. Please refresh and try again.', 'error');
    } finally {
      setIsInitialLoading(false);
      setIsSyncing(false);
    }
  };

  // Keep a live pointer to the latest loadData so long-lived subscriptions/timers
  // always invoke the current closure (avoids stale state) without re-subscribing.
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  // Supabase Auth owns the session once the cutover flag is enabled. The
  // legacy localStorage session remains available only during the staged
  // migration so the current production build is not interrupted.
  useEffect(() => {
    if (!authEnabled) {
      setIsAuthChecking(false);
      return;
    }

    let active = true;
    const applyAuthUser = (user: TeamMember | null) => {
      if (!active) return;
      setCurrentUser(user);
      setIsAuthenticated(Boolean(user));
      if (user) {
        localStorage.removeItem('contentlab_is_authenticated');
        localStorage.removeItem('contentlab_logged_user');
      }
      setIsAuthChecking(false);
    };

    void getSupabaseAuthUser()
      .then(applyAuthUser)
      .catch((error) => {
        console.error('Failed to restore Supabase Auth session:', error);
        applyAuthUser(null);
      });

    const unsubscribe = subscribeToSupabaseAuth(applyAuthUser);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [authEnabled]);

  // Coalesce bursts of realtime events into a single refresh. Previously every
  // task/comment change triggered its own full-workspace refetch, so N concurrent
  // edits caused N full downloads. Debouncing collapses them into one.
  const reloadTimerRef = useRef<number | null>(null);
  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) window.clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = window.setTimeout(() => {
      reloadTimerRef.current = null;
      loadDataRef.current(false);
    }, 400);
  }, []);

  // Live refs to the latest state so the stable (useCallback) handlers below can
  // read fresh values without listing `items`/`currentUser` as deps — that would
  // recreate the handler on every data change and defeat child memoization.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;


  useEffect(() => {
    if (isAuthenticated) {
      loadDataRef.current();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribe = subscribeToSupabaseRealtime(scheduleReload, scheduleReload, scheduleReload, scheduleReload);
      const refreshOnFocus = () => loadDataRef.current(false);
      window.addEventListener('focus', refreshOnFocus);
      window.addEventListener('online', refreshOnFocus);
      return () => {
        unsubscribe();
        window.removeEventListener('focus', refreshOnFocus);
        window.removeEventListener('online', refreshOnFocus);
        if (reloadTimerRef.current) window.clearTimeout(reloadTimerRef.current);
      };
    }
  }, [isAuthenticated, scheduleReload]);


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
        resources,
        notifications,
      });
    }, 120);
    return () => window.clearTimeout(cacheTimer);
  }, [isAuthenticated, items, team, channels, comments, clients, kpiDefinitions, kpiUpdates, documents, resources, notifications]);

  const beginWrite = useCallback(() => setPendingWrites((count) => count + 1), []);
  const endWrite = useCallback(() => setPendingWrites((count) => Math.max(0, count - 1)), []);


  useEffect(() => {
    if (activeTab === 'settings' && currentUser?.role !== 'super') {
      setActiveTab('dashboard');
    }
    if (currentUser?.role === 'client' && !['dashboard', 'review', 'calendar', 'reports'].includes(activeTab)) setActiveTab('dashboard');
  }, [activeTab, currentUser?.role]);

  useEffect(() => {
    if (scopeKey.startsWith('brand:') && clients.length > 0 && !clients.some((entry) => `brand:${entry.id}` === scopeKey)) {
      setScopeKey('all');
      localStorage.setItem('contentlab_scope_key', 'all');
    }
  }, [clients, scopeKey]);

  // Handle connection settings change
  const handleConnectionChange = () => {
    setIsMock(!isSupabaseDbConfigured());
    void loadDataRef.current(false);
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
    if (authEnabled) void signOutSupabaseUser();
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
    setSelectedItem(null);
    beginWrite();

    const isEdit = !!itemPayload.id;
    const tempId = itemPayload.id || `temp_${Date.now()}`;

    if (isEdit && itemPayload.id) {
      const existing = items.find((i) => i.id === itemPayload.id);
      if (!existing) {
        endWrite();
        addToast('Task not found', 'error');
        return;
      }

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

      // 1. INSTANT UI UPDATE (0ms delay!)
      setItems((prev) => prev.map((item) => (item.id === itemPayload.id ? updatedPayload : item)));
      addToast(`Updated "${itemPayload.title}"`, 'success');

      // 2. SILENT BACKGROUND SYNC
      try {
        const serverUpdated = await updateSupabaseContent(updatedPayload);
        const merged: ContentItem = {
          ...updatedPayload,
          ...serverUpdated,
          coverImageUrl: serverUpdated?.coverImageUrl || updatedPayload.coverImageUrl || '',
          coverImageId: serverUpdated?.coverImageId || updatedPayload.coverImageId || '',
        };
        setItems((prev) => prev.map((item) => (item.id === itemPayload.id ? merged : item)));
      } catch (e) {
        console.error('Background sync failed for task update:', e);
        setItems((prev) => prev.map((item) => (item.id === itemPayload.id ? existing : item)));
        const message = e instanceof Error ? e.message : 'Supabase sync error';
        addToast(`Card update failed; changes were not saved (${message}).`, 'error');
      } finally {
        endWrite();
      }
    } else {
      const newTempItem: ContentItem = {
        id: tempId,
        title: itemPayload.title || '',
        brief: itemPayload.brief || '',
        status: itemPayload.status || 'Idea',
        channel: itemPayload.channel || 'Instagram',
        format: itemPayload.format || 'Feed/Reels',
        priority: itemPayload.priority || 'Medium',
        assignee: itemPayload.assignee || '',
        publishDate: itemPayload.publishDate || '',
        assetsLink: itemPayload.assetsLink || '',
        coverImageUrl: itemPayload.coverImageUrl || '',
        coverImageId: itemPayload.coverImageId || '',
        tags: itemPayload.tags || '',
        budget: itemPayload.budget || '',
        platformNotes: itemPayload.platformNotes || '',
        targetAudience: itemPayload.targetAudience || '',
        createdBy: currentUser?.name || 'Anonymous',
        checklist: itemPayload.checklist || '',
        views: itemPayload.views || '',
        likes: itemPayload.likes || '',
        engagement: itemPayload.engagement || '',
        taskType: itemPayload.taskType || 'Content',
        category: itemPayload.category || '',
        dueDate: itemPayload.dueDate || '',
        client: itemPayload.client || '',
        brand: itemPayload.brand || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creatorId: currentUser?.id || '',
        actorId: currentUser?.id || '',
      };

      // 1. INSTANT UI UPDATE (0ms delay!)
      setItems((prev) => [newTempItem, ...prev]);
      addToast(`Created "${itemPayload.title}"`, 'success');

      // 2. SILENT BACKGROUND SYNC
      try {
        const created = await createSupabaseContent({
              ...itemPayload,
              createdBy: currentUser?.name || 'Anonymous',
              creatorId: currentUser?.id || '',
              actorId: currentUser?.id || '',
            });
        const merged: ContentItem = {
          ...newTempItem,
          ...created,
          coverImageUrl: created?.coverImageUrl || newTempItem.coverImageUrl || '',
          coverImageId: created?.coverImageId || newTempItem.coverImageId || '',
        };
        setItems((prev) => prev.map((item) => (item.id === tempId ? merged : item)));
      } catch (e) {
        console.error('Background sync failed for task creation:', e);
        setItems((prev) => prev.filter((item) => item.id !== tempId));
        const message = e instanceof Error ? e.message : 'Supabase sync error';
        addToast(`Card creation failed; nothing was saved (${message}).`, 'error');
      } finally {
        endWrite();
      }
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
      await updateSupabaseContent(updatedItem);
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
      await updateSupabaseContent(updatedItem);
      addToast(`Status updated to "${newStatus}"`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Sync failed. Reverting status...', 'error');
      setItems(originalItems);
    } finally {
      endWrite();
    }
  };

  // Duplicate task (clone locally + sync to backend)
  const handleDuplicateItem = async (item: ContentItem) => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const duplicated: ContentItem = {
      ...item,
      id: tempId,
      title: `${item.title} (copy)`,
      status: item.taskType === 'General' ? 'To Do' : 'Idea',
      createdAt: now,
      updatedAt: now,
      actorId: currentUser?.id || '',
      creatorId: currentUser?.id || '',
      coverImageUrl: item.coverImageUrl || '',
      coverImageId: item.coverImageId || '',
    };

    setItems((prev) => [duplicated, ...prev]);
    addToast(`Duplicated "${item.title}"`, 'success');
    beginWrite();

    try {
      const created = await createSupabaseContent({
            title: duplicated.title,
            brief: duplicated.brief || '',
            channel: duplicated.channel || '',
            format: duplicated.format || 'Feed/Reels',
            assetsLink: duplicated.assetsLink || '',
            taskType: duplicated.taskType || 'Content',
            status: duplicated.status,
            priority: duplicated.priority || 'Medium',
            assignee: duplicated.assignee || '',
            publishDate: duplicated.publishDate || '',
            dueDate: duplicated.dueDate || '',
            client: duplicated.client || '',
            brand: duplicated.brand || '',
            createdBy: currentUser?.name || 'Anonymous',
            creatorId: currentUser?.id || '',
            actorId: currentUser?.id || '',
            checklist: duplicated.checklist || '',
            coverImageUrl: duplicated.coverImageUrl,
            coverImageId: duplicated.coverImageId,
            tags: duplicated.tags || '',
            budget: duplicated.budget || '',
            platformNotes: duplicated.platformNotes || '',
            targetAudience: duplicated.targetAudience || '',
            category: duplicated.category || '',
            views: duplicated.views || '',
            likes: duplicated.likes || '',
            engagement: duplicated.engagement || '',
          });
      const merged: ContentItem = { ...duplicated, ...created };
      setItems((prev) => prev.map((i) => (i.id === tempId ? merged : i)));
    } catch (e) {
      console.error('Duplicate sync failed:', e);
      setItems((prev) => prev.filter((item) => item.id !== tempId));
      addToast('Duplicate failed; nothing was saved to Supabase.', 'error');
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
      await deleteSupabaseContent(id);
      addToast(`Successfully deleted "${itemToDelete?.title || 'Task'}"`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Failed to delete task. Reverting...', 'error');
      setItems(originalItems);
    } finally {
      endWrite();
      setSelectedItem(null);
    }
  };

  // Discussion comment thread action
  const handleAddComment = async (contentId: string, text: string, attachmentUrl?: string, mentionedUserIds: string[] = []) => {
    if (!currentUser) return;
    beginWrite();
    try {
      const normalizedText = text.toLocaleLowerCase();
      const explicitNames = new Set(team.filter((member) => mentionedUserIds.includes(member.id)).map((member) => member.name.toLocaleLowerCase()));
      const detectedIds = team.filter((member) => !explicitNames.has(member.name.toLocaleLowerCase()) && normalizedText.includes(`@${member.name.toLocaleLowerCase()}`)).map((member) => member.id);
      const mentionIds = [...new Set([...mentionedUserIds, ...detectedIds])];
      const created = await createSupabaseComment(contentId, currentUser.name, text, attachmentUrl, mentionIds, currentUser.id);
      setComments((prev) => [...prev, created]);
      if (mentionIds.length && (created as any).notification?.failed) addToast(`Comment saved, but ${(created as any).notification.failed} mention notification${(created as any).notification.failed === 1 ? '' : 's'} failed.`, 'error');
      else if (mentionIds.length) addToast(`Comment posted and ${(created as any).notification?.sent || mentionIds.length} notification${mentionIds.length === 1 ? '' : 's'} sent.`, 'success');
      else addToast('Comment posted successfully!', 'success');
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
      const updated = await updateSupabaseContent(item);
      setItems((prev) => prev.map((entry) => entry.id === updated.id ? updated : entry));
      addToast('Review status saved.', 'success');
    } finally {
      endWrite();
    }
  };

  // Crew Handlers
  const handleAddCreator = async (name: string, email: string, password = '', role: UserRole = 'team', client = ''): Promise<TeamMember> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
    beginWrite();
    try {
      const created = await createSupabaseTeamMember({ name, email, password, role, client });
      setTeam((prev) => [...prev, created]);
      addToast(`Added ${role === 'client' ? 'client user' : role === 'super' ? 'super admin' : 'team member'} "${name}".`, 'success');
      return created;
    } catch (e) {
      console.error(e);
      addToast('Failed to add creator to Supabase.', 'error');
      throw e;
    } finally {
      endWrite();
    }
  };

  const handleUpdateCreator = async (member: TeamMember): Promise<TeamMember> => {
    if (currentUser?.role !== 'super') throw new Error('Super access required');
    beginWrite();
    try {
      const updated = await updateSupabaseTeamMember(member);
      setTeam((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      addToast(`Updated permissions for "${updated.name}".`, 'success');
      return updated;
    } catch (e) {
      console.error(e);
      addToast('Failed to update team member.', 'error');
      throw e;
    } finally {
      endWrite();
    }
  };

  const handleDeleteCreator = async (id: string) => {
    if (currentUser?.role !== 'super') return;
    beginWrite();
    try {
      await deleteSupabaseTeamMember(id);
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
      const created = await createSupabaseChannel({ name, color });
      setChannels((prev) => [...prev, created]);
      addToast(`Added channel "${name}" with color ${color}!`, 'success');
      return created;
    } catch (e) {
      console.error(e);
      addToast('Failed to add channel to Supabase.', 'error');
      throw e;
    } finally {
      endWrite();
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (currentUser?.role !== 'super') return;
    beginWrite();
    try {
      await deleteSupabaseChannel(id);
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
      const created = await createSupabaseClientBrand({ client, brand, color, active: true });
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
      const created = await createSupabaseKpiDefinition(definition);
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
      const created = await createSupabaseKpiUpdate(update);
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
      const created = await createSupabaseDocument({ ...document, ownerId: currentUser?.id || document.ownerId });
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
      const updated = await updateSupabaseDocument(document);
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
      await deleteSupabaseDocument(id);
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

  const handleCreateTaskResource = async (
    resource: Omit<TaskResource, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TaskResource> => {
    beginWrite();
    try {
      const payload = { ...resource, createdBy: currentUser?.id || resource.createdBy };
      const created = await createSupabaseTaskResource(payload);
      setResources((previous) => [created, ...previous]);
      addToast(`Added resource "${created.title}".`, 'success');
      return created;
    } catch (error) {
      console.error(error);
      addToast(error instanceof Error ? error.message : 'Failed to add task resource.', 'error');
      throw error;
    } finally {
      endWrite();
    }
  };

  const handleDeleteTaskResource = async (id: string): Promise<void> => {
    beginWrite();
    try {
      await deleteSupabaseTaskResource(id);
      setResources((previous) => previous.filter((resource) => resource.id !== id));
      addToast('Resource removed.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to remove resource.', 'error');
      throw error;
    } finally {
      endWrite();
    }
  };

  const handleMarkNotificationRead = async (id: string): Promise<void> => {
    const previous = notifications;
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: true } : notification));
    try {
      await markSupabaseNotificationRead(id, currentUser?.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(previous);
      addToast('Notification belum berhasil ditandai sudah dibaca.', 'error');
    }
  };

  const handleMarkAllNotificationsRead = async (): Promise<void> => {
    const previous = notifications;
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    if (!currentUser) return;
    try {
      await markAllSupabaseNotificationsRead(currentUser.id);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setNotifications(previous);
      addToast('Notifications belum berhasil ditandai sudah dibaca.', 'error');
    }
  };

  // Variable toggles
  const handleSaveVariablesConfig = (config: VariablesConfig) => {
    saveVariablesConfig(config);
    setVariablesConfig(config);
  };

  const allAvailableTags = useMemo(() => {
    return getCustomTags(items);
  }, [items, customTags]);

  // Custom tags
  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!customTags.includes(trimmed)) {
      const updated = [...customTags, trimmed];
      saveCustomTags(updated);
      setCustomTags(updated);
    }
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
    if (currentUser && currentUser.role === 'team' && !hasClientAccess(currentUser, item.client, item.brand) && !isUserInvolved(item, currentUser)) {
      return false;
    }
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

  // Treat Documents & Notes linked to a task as card resources too, while
  // retaining the full document model for the editor and Reports page.
  const cardResources = useMemo<TaskResource[]>(() => [
    ...resources,
    ...documents.filter((document) => document.taskId).map((document) => ({
      id: `document-resource-${document.id}`,
      taskId: document.taskId,
      type: 'link' as const,
      title: document.title,
      url: document.url,
      visibility: document.visibility === 'client' ? 'client' as const : 'internal' as const,
      client: document.client,
      brand: document.brand,
      pinned: document.pinned,
      createdBy: document.ownerId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    })),
  ], [resources, documents]);

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

  if (isAuthChecking) {
    return <div className="app-loading-screen">Checking secure session…</div>;
  }

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
      notifications={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
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
          <Suspense fallback={<div className="workspace-skeleton" aria-label="Loading view" style={{ padding: 24 }}><div className="workspace-skeleton-heading skeleton-line" /></div>}>
        {['board', 'calendar', 'list'].includes(activeTab) && currentUser.role !== 'client' && (

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
          currentUser.role === 'client'
            ? <ClientPortal
                items={scopedItems}
                resources={resources}
                comments={comments}
                team={team}
                currentUser={currentUser}
                mode="overview"
                reportsCount={documents.filter((document) => document.visibility === 'client' && document.client === currentUser.client).length}
                onNavigateToReview={() => setActiveTab('review')}
                onUpdateItem={handleClientUpdateItem}
                onAddComment={handleAddComment}
              />
            : <DashboardView items={scopedItems} onEditItem={handleOpenEditModal} channels={channels} variablesConfig={variablesConfig} currentUser={currentUser} />
        )}
        
        {activeTab === 'review' && currentUser.role === 'client' && (
          <ClientPortal
            items={scopedItems}
            resources={resources}
            comments={comments}
            team={team}
            currentUser={currentUser}
            mode="review"
            reportsCount={documents.filter((document) => document.visibility === 'client' && document.client === currentUser.client).length}
            onNavigateToReview={() => setActiveTab('review')}
            onUpdateItem={handleClientUpdateItem}
            onAddComment={handleAddComment}
          />
        )}

        {activeTab === 'board' && (
          <KanbanBoard
            items={filteredItems}
            resources={cardResources}
            comments={comments}
            onMoveItem={handleMoveItem}
            onEditItem={handleOpenEditModal}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onOpenCreateModalWithStatus={handleOpenCreateModalWithStatus}
            channels={channels}
            variablesConfig={variablesConfig}
            taskView={taskView}
          />
        )}

        {activeTab === 'calendar' && (
          currentUser.role === 'client'
            ? <ClientPortal
                items={scopedItems}
                resources={resources}
                comments={comments}
                team={team}
                currentUser={currentUser}
                mode="calendar"
                reportsCount={documents.filter((document) => document.visibility === 'client' && document.client === currentUser.client).length}
                onNavigateToReview={() => setActiveTab('review')}
                onUpdateItem={handleClientUpdateItem}
                onAddComment={handleAddComment}
              />
            : <CalendarView
                items={filteredItems}
                resources={cardResources}
                channels={channels}
                onEditItem={handleOpenEditModal}
                onDuplicateItem={handleDuplicateItem}
                onDeleteItem={handleDeleteItem}
                onMoveDate={handleMoveDate}
              />
        )}

        {activeTab === 'list' && (
          <ListView
            items={filteredItems}
            resources={cardResources}
            comments={comments}
            onEditItem={handleOpenEditModal}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
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

        {activeTab === 'reports' && (
          <ReportsView documents={documents} currentUser={currentUser} />
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
            tags={allAvailableTags}
            onAddTag={handleAddTag}
            onDeleteTag={handleDeleteTag}
            team={team}
            onAddCreator={handleAddCreator}
            onUpdateCreator={handleUpdateCreator}
            onDeleteCreator={handleDeleteCreator}
            channels={channels}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
            clients={clients}
            onAddClientBrand={handleAddClientBrand}
            items={items}
            comments={comments}
            kpiDefinitions={kpiDefinitions}
            kpiUpdates={kpiUpdates}
            documents={documents}
          />
        )}
          </Suspense>
        )}
      </div>

      {/* Task Creation & Editing Drawer Slide-Over.
          Kept out of the tree (and its chunk unfetched) until first opened. */}
      {(isModalOpen || selectedItem) && (
        <Suspense fallback={null}>
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
            customTags={allAvailableTags}
            activeUser={currentUser.name}
            activeUserId={currentUser.id}
            comments={comments}
            resources={resources}
            documents={documents}
            onCreateResource={handleCreateTaskResource}
            onDeleteResource={handleDeleteTaskResource}
            onAddComment={handleAddComment}
            onAddCreator={handleAddCreator}
            onAddChannel={handleAddChannel}
            onAddClientBrand={handleAddClientBrand}
            onAddTag={handleAddTag}
            canManageRegistries={currentUser.role === 'super'}
          />
        </Suspense>
      )}


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
