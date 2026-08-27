import { supabase } from './supabase';
import {
  deduplicateContentItems,
  type ContentItem,
  type TeamMember,
  type Channel,
  type ClientBrand,
  type CommentItem,
  type KpiDefinition,
  type KpiUpdate,
  type DocumentItem,
  type TaskResource,
  type NotificationItem,
  type NotificationType,
  type UserRole,
  normalizeTaskResource,
} from './sheets';
import { normalizeUrl } from '../utils/url';

/**
 * Checks if Supabase DB is properly configured and accessible.
 */
export function isSupabaseDbConfigured(): boolean {
  return !!supabase;
}

export function getPreferredDbProvider(): 'supabase' | 'sheets' {
  const saved = localStorage.getItem('contentlab_db_provider');
  // Supabase is the single operational source of truth. Migrate any legacy
  // browser-level Sheets preference in-place so older sessions cannot diverge.
  if (isSupabaseDbConfigured()) {
    if (saved !== 'supabase') localStorage.setItem('contentlab_db_provider', 'supabase');
    return 'supabase';
  }
  return 'sheets';
}

export function isUsingSupabaseDb(): boolean {
  return isSupabaseDbConfigured() && getPreferredDbProvider() === 'supabase';
}

// ----------------------------------------------------------------------
// DATA MAPPING HELPERS (Database Columns <-> React Domain Models)
// ----------------------------------------------------------------------

export function toDeterministicUuid(str: string | null | undefined): string | null {
  if (!str || typeof str !== 'string') return null;
  const cleanStr = str.trim().toLowerCase();
  if (!cleanStr) return null;

  // Universal 36-character UUID regex test (case-insensitive)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(cleanStr)) {
    return cleanStr;
  }

  // Generate deterministic 32-character hex hash from lowercased string
  let hash1 = 0x811c9dc5;
  let hash2 = 0x01000193;
  for (let i = 0; i < cleanStr.length; i++) {
    const code = cleanStr.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ code, 0x01000193);
    hash2 = Math.imul(hash2 ^ code, 0x811c9dc5);
  }

  const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0');
  const hex4 = (Math.imul(hash1, hash2) >>> 0).toString(16).padStart(8, '0');

  const raw32 = (hex1 + hex2 + hex3 + hex4).slice(0, 32).padEnd(32, '0');
  const uuid = `${raw32.slice(0, 8)}-${raw32.slice(8, 12)}-4${raw32.slice(13, 16)}-a${raw32.slice(17, 20)}-${raw32.slice(20, 32)}`;
  return uuid.toLowerCase();
}

function toForeignKeyUuid(value: string | null | undefined): string | null {
  // The emergency admin session is virtual and has no team_members row.
  if (value === 'super-admin-default') return null;
  return toDeterministicUuid(value);
}

function tryParseJson(jsonString: string | null | undefined): any {
  if (!jsonString) return [];
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return [];
  }
}

function mapTaskRowToContentItem(row: any): ContentItem {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    brief: String(row.brief || ''),
    status: String(row.status || 'Idea') as ContentItem['status'],
    channel: String(row.channel || ''),
    format: String(row.format || 'Feed/Reels') as ContentItem['format'],
    priority: String(row.priority || 'Medium') as ContentItem['priority'],
    assignee: String(row.assignee || ''),
    ownerId: row.owner_id ? String(row.owner_id) : undefined,
    reviewerId: row.reviewer_id ? String(row.reviewer_id) : undefined,
    collaboratorIds: Array.isArray(row.collaborator_ids) ? row.collaborator_ids.map(String) : [],
    publishDate: row.publish_date ? String(row.publish_date) : '',
    assetsLink: normalizeUrl(String(row.assets_link || '')),
    coverImageUrl: String(row.cover_image_url || ''),
    coverImageId: String(row.cover_image_id || ''),
    tags: String(row.tags || ''),
    budget: String(row.budget || ''),
    platformNotes: String(row.platform_notes || ''),
    targetAudience: String(row.target_audience || ''),
    createdBy: String(row.created_by || ''),
    creatorId: row.creator_id ? String(row.creator_id) : undefined,
    checklist: typeof row.checklist === 'string' ? row.checklist : JSON.stringify(row.checklist || []),
    views: String(row.views || ''),
    likes: String(row.likes || ''),
    engagement: String(row.engagement || ''),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    taskType: String(row.task_type || 'Content') as ContentItem['taskType'],
    category: String(row.category || ''),
    dueDate: row.due_date ? String(row.due_date) : '',
    client: String(row.client || ''),
    brand: String(row.brand || ''),
  };
}

function mapContentItemToTaskRow(item: Partial<ContentItem>): any {
  const row: any = {
    title: item.title || 'Untitled Task',
    brief: item.brief || '',
    status: item.status || 'Idea',
    channel: item.channel || '',
    format: item.format || 'Feed/Reels',
    priority: item.priority || 'Medium',
    assignee: item.assignee || '',
    owner_id: toForeignKeyUuid(item.ownerId),
    reviewer_id: toForeignKeyUuid(item.reviewerId),
    collaborator_ids: Array.isArray(item.collaboratorIds) ? item.collaboratorIds.map(toForeignKeyUuid).filter(Boolean) : [],
    publish_date: item.publishDate || '',
    assets_link: item.assetsLink ? normalizeUrl(item.assetsLink) : '',
    cover_image_url: item.coverImageUrl || '',
    cover_image_id: item.coverImageId || '',
    tags: item.tags || '',
    budget: item.budget || '',
    platform_notes: item.platformNotes || '',
    target_audience: item.targetAudience || '',
    created_by: item.createdBy || '',
    creator_id: toForeignKeyUuid(item.creatorId),
    checklist: item.checklist ? (typeof item.checklist === 'string' ? tryParseJson(item.checklist) : item.checklist) : [],
    views: item.views || '',
    likes: item.likes || '',
    engagement: item.engagement || '',
    task_type: item.taskType || 'Content',
    category: item.category || '',
    due_date: item.dueDate || '',
    client: item.client || '',
    brand: item.brand || '',
    updated_at: new Date().toISOString(),
  };

  const uuid = toDeterministicUuid(item.id);
  if (uuid) {
    row.id = uuid;
  }
  if (item.createdAt) {
    row.created_at = new Date(item.createdAt).toISOString();
  }

  return row;
}

// ----------------------------------------------------------------------
// INITIAL DATA FETCHING (Supabase)
// ----------------------------------------------------------------------

export async function fetchSupabaseInitialData(userId?: string): Promise<{
  content: ContentItem[];
  team: TeamMember[];
  channels: Channel[];
  clients: ClientBrand[];
  comments: CommentItem[];
  kpiDefinitions: KpiDefinition[];
  kpiUpdates: KpiUpdate[];
  documents: DocumentItem[];
  resources: TaskResource[];
  notifications: NotificationItem[];
}> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const [
    tasksRes,
    teamRes,
    channelsRes,
    clientsRes,
    commentsRes,
    kpiDefRes,
    kpiUpdRes,
    docsRes,
    resourcesRes,
    notificationsRes,
  ] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('team_members').select('*').order('created_at', { ascending: true }),
    supabase.from('channels').select('*').order('name', { ascending: true }),
    supabase.from('client_brands').select('*').order('client', { ascending: true }),
    supabase.from('comments').select('*').order('created_at', { ascending: true }),
    supabase.from('kpi_definitions').select('*').order('created_at', { ascending: true }),
    supabase.from('kpi_updates').select('*').order('period', { ascending: true }),
    supabase.from('documents').select('*').order('updated_at', { ascending: false }),
    supabase.from('task_resources').select('*').order('created_at', { ascending: false }),
    userId && toDeterministicUuid(userId)
      ? supabase.from('notifications').select('*').eq('user_id', toDeterministicUuid(userId) as string).order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const queryErrors = [
    ['tasks', tasksRes.error],
    ['team_members', teamRes.error],
    ['channels', channelsRes.error],
    ['client_brands', clientsRes.error],
    ['comments', commentsRes.error],
    ['kpi_definitions', kpiDefRes.error],
    ['kpi_updates', kpiUpdRes.error],
    ['documents', docsRes.error],
    ['task_resources', resourcesRes.error],
    ['notifications', notificationsRes.error],
  ].filter(([, error]) => Boolean(error));

  if (queryErrors.length > 0) {
    const detail = queryErrors
      .map(([table, error]) => `${table}: ${(error as any)?.message || 'query failed'}`)
      .join('; ');
    console.error('Supabase workspace fetch failed; refusing to fall back to another data source:', detail);
    throw new Error(`Supabase workspace load failed (${detail})`);
  }

  const content: ContentItem[] = (tasksRes.data || []).map(mapTaskRowToContentItem);

  const team: TeamMember[] = (teamRes.data || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name || ''),
    email: String(row.email || ''),
    password: String(row.password || ''),
    role: String(row.role || 'team') as TeamMember['role'],
    client: String(row.client_access || row.client || ''),
    avatar: row.avatar_url || '',
  }));

  const channels: Channel[] = (channelsRes.data || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name || ''),
    color: String(row.color || '#2563eb'),
  }));

  const clients: ClientBrand[] = (clientsRes.data || []).map((row: any) => ({
    id: String(row.id),
    client: String(row.client || ''),
    brand: String(row.brand || ''),
    color: String(row.color || '#2563eb'),
    active: row.active !== false,
  }));

  let comments: CommentItem[] = (commentsRes.data || []).map((row: any) => ({
    id: String(row.id),
    contentId: String(row.task_id),
    author: String(row.author || ''),
    text: String(row.text || ''),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    attachmentUrl: row.attachment_url ? normalizeUrl(row.attachment_url) : undefined,
    mentionedUserIds: Array.isArray(row.mentioned_user_ids) ? row.mentioned_user_ids.map(String) : [],
  }));

  const kpiDefinitions: KpiDefinition[] = (kpiDefRes.data || []).map((row: any) => ({
    id: String(row.id),
    clientBrandId: row.client_brand_id ? String(row.client_brand_id) : '',
    client: String(row.client || ''),
    brand: String(row.brand || ''),
    name: String(row.name || ''),
    category: String(row.category || 'Business'),
    unit: String(row.unit || 'Number'),
    baseline: Number(row.baseline || 0),
    target: Number(row.target || 0),
    direction: String(row.direction || 'increase') as KpiDefinition['direction'],
    cadence: String(row.cadence || 'Monthly') as KpiDefinition['cadence'],
    weight: Number(row.weight || 1),
    active: row.active !== false,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }));

  const kpiUpdates: KpiUpdate[] = (kpiUpdRes.data || []).map((row: any) => ({
    id: String(row.id),
    kpiId: String(row.kpi_id),
    period: String(row.period || '').slice(0, 10),
    actual: Number(row.actual || 0),
    notes: String(row.notes || ''),
    sourceLink: row.source_link ? normalizeUrl(row.source_link) : '',
    updatedBy: String(row.updated_by || ''),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }));

  const documents: DocumentItem[] = (docsRes.data || []).map((row: any) => ({
    id: String(row.id),
    title: String(row.title || ''),
    type: String(row.type || 'Note') as DocumentItem['type'],
    body: String(row.body || ''),
    url: row.url ? normalizeUrl(row.url) : '',
    ownerId: String(row.owner_id || ''),
    visibility: String(row.visibility || 'team') as DocumentItem['visibility'],
    client: String(row.client || ''),
    brand: String(row.brand || ''),
    taskId: row.task_id ? String(row.task_id) : '',
    tags: String(row.tags || ''),
    pinned: row.pinned === true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }));

  const resources: TaskResource[] = resourcesRes.error
    ? []
    : (resourcesRes.data || []).map((row: any) => normalizeTaskResource({
        id: row.id,
        taskId: row.task_id,
        type: row.type,
        title: row.title,
        url: row.url,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        visibility: row.visibility,
        client: row.client,
        brand: row.brand,
        pinned: row.pinned,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
  if (resourcesRes.error) {
    console.warn('Task resources table is not available yet; continuing without resource records.', resourcesRes.error.message);
  }

  const notifications: NotificationItem[] = notificationsRes.error
    ? []
    : (notificationsRes.data || []).map(mapNotificationRow);
  if (notificationsRes.error && notificationsRes.error.code !== '42P01') {
    console.warn('Notifications could not be loaded:', notificationsRes.error.message);
  }

  return {
    content: deduplicateContentItems(content),
    team,
    channels,
    clients,
    comments,
    kpiDefinitions,
    kpiUpdates,
    documents,
    resources,
    notifications,
  };
}

function mapNotificationRow(row: any): NotificationItem {
  return {
    id: String(row.id),
    userId: String(row.user_id || ''),
    commentId: row.comment_id ? String(row.comment_id) : undefined,
    taskId: row.task_id ? String(row.task_id) : undefined,
    actorId: row.actor_id ? String(row.actor_id) : undefined,
    actorName: String(row.actor_name || ''),
    type: (['mention', 'comment', 'assignment'].includes(String(row.type)) ? String(row.type) : 'mention') as NotificationType,
    title: String(row.title || ''),
    body: String(row.body || ''),
    read: row.read === true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

/**
 * Clean up / delete duplicate tasks in Supabase DB based on title + client + brand + publish_date
 */
export async function purgeSupabaseDuplicateTasks(): Promise<{ deleted: number }> {
  if (!supabase) return { deleted: 0 };
  const { data: tasks, error } = await supabase.from('tasks').select('id, title, client, brand, publish_date, created_at').order('created_at', { ascending: false });
  if (error || !tasks || tasks.length === 0) return { deleted: 0 };

  const seen = new Set<string>();
  const duplicateIdsToDelete: string[] = [];

  for (const task of tasks) {
    const titleClean = String(task.title || '').trim().toLowerCase();
    const clientClean = String(task.client || '').trim().toLowerCase();
    const brandClean = String(task.brand || '').trim().toLowerCase();
    const publishDateClean = String(task.publish_date || '').trim().toLowerCase();
    const compositeKey = `${titleClean}::${clientClean}::${brandClean}::${publishDateClean}`;

    if (seen.has(compositeKey)) {
      duplicateIdsToDelete.push(task.id);
    } else {
      seen.add(compositeKey);
    }
  }

  if (duplicateIdsToDelete.length > 0) {
    const { error: delErr } = await supabase.from('tasks').delete().in('id', duplicateIdsToDelete);
    if (delErr) {
      console.error('Failed to delete duplicate tasks:', delErr);
      return { deleted: 0 };
    }
  }

  return { deleted: duplicateIdsToDelete.length };
}

// ----------------------------------------------------------------------
// TASK CRUD (Supabase)
// ----------------------------------------------------------------------

export async function createSupabaseContent(
  item: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ContentItem> {
  if (!supabase) throw new Error('Supabase client is not initialized.');

  const row = mapContentItemToTaskRow(item);
  row.created_at = new Date().toISOString();

  const { data, error } = await supabase.from('tasks').insert([row]).select().single();
  if (error) {
    console.error('Failed to create task in Supabase:', error);
    throw error;
  }
  return mapTaskRowToContentItem(data);
}

export async function updateSupabaseContent(item: ContentItem): Promise<ContentItem> {
  if (!supabase) throw new Error('Supabase client is not initialized.');

  const row = mapContentItemToTaskRow(item);
  const uuid = toDeterministicUuid(item.id);
  if (!uuid) throw new Error('Invalid task ID.');

  const { data, error } = await supabase.from('tasks').update(row).eq('id', uuid).select().single();
  if (error) {
    console.error('Failed to update task in Supabase:', error);
    throw error;
  }
  return mapTaskRowToContentItem(data);
}

export async function deleteSupabaseContent(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client is not initialized.');

  const uuid = toDeterministicUuid(id);
  if (!uuid) return false;

  const { error } = await supabase.from('tasks').delete().eq('id', uuid);
  if (error) {
    console.error('Failed to delete task in Supabase:', error);
    throw error;
  }
  return true;
}

// ----------------------------------------------------------------------
// WORKSPACE REGISTRIES (Supabase)
// ----------------------------------------------------------------------

function mapSupabaseTeamMember(row: any): TeamMember {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    email: String(row.email || ''),
    password: String(row.password || ''),
    role: String(row.role || 'team') as TeamMember['role'],
    client: String(row.client_access || row.client || ''),
    avatar: String(row.avatar_url || ''),
  };
}

export async function createSupabaseTeamMember(
  member: Omit<TeamMember, 'id' | 'avatar' | 'role'> & { role?: UserRole }
): Promise<TeamMember> {
  if (!supabase) throw new Error('Supabase client is not initialized.');

  const row = {
    name: member.name.trim(),
    email: member.email.trim().toLowerCase(),
    password: member.password || '',
    role: member.role || 'team',
    client_access: member.client || '',
    avatar_url: '',
  };
  const { data, error } = await supabase.from('team_members').insert([row]).select().single();
  if (error) throw error;
  return mapSupabaseTeamMember(data);
}

export async function updateSupabaseTeamMember(member: TeamMember): Promise<TeamMember> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const uuid = toDeterministicUuid(member.id);
  if (!uuid) throw new Error('Invalid team member ID.');

  const row: Record<string, unknown> = {
    name: member.name.trim(),
    email: member.email.trim().toLowerCase(),
    role: member.role,
    client_access: member.client || '',
    avatar_url: member.avatar || '',
  };
  if (member.password !== undefined) row.password = member.password;

  const { data, error } = await supabase.from('team_members').update(row).eq('id', uuid).select().single();
  if (error) throw error;
  return mapSupabaseTeamMember(data);
}

export async function deleteSupabaseTeamMember(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const uuid = toDeterministicUuid(id);
  if (!uuid) return false;
  const { error } = await supabase.from('team_members').delete().eq('id', uuid);
  if (error) throw error;
  return true;
}

function mapSupabaseChannel(row: any): Channel {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    color: String(row.color || '#2563eb'),
  };
}

export async function createSupabaseChannel(channel: Omit<Channel, 'id'>): Promise<Channel> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { data, error } = await supabase.from('channels').insert([{
    name: channel.name.trim(),
    color: channel.color || '#2563eb',
  }]).select().single();
  if (error) throw error;
  return mapSupabaseChannel(data);
}

export async function deleteSupabaseChannel(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const uuid = toDeterministicUuid(id);
  if (!uuid) return false;
  const { error } = await supabase.from('channels').delete().eq('id', uuid);
  if (error) throw error;
  return true;
}

function mapSupabaseClientBrand(row: any): ClientBrand {
  return {
    id: String(row.id),
    client: String(row.client || ''),
    brand: String(row.brand || ''),
    color: String(row.color || '#2563eb'),
    active: row.active !== false,
  };
}

export async function createSupabaseClientBrand(clientBrand: Omit<ClientBrand, 'id'>): Promise<ClientBrand> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { data, error } = await supabase.from('client_brands').insert([{
    client: clientBrand.client.trim(),
    brand: clientBrand.brand.trim(),
    color: clientBrand.color || '#2563eb',
    active: clientBrand.active !== false,
  }]).select().single();
  if (error) throw error;
  return mapSupabaseClientBrand(data);
}

function mapSupabaseKpiDefinition(row: any): KpiDefinition {
  return {
    id: String(row.id),
    clientBrandId: row.client_brand_id ? String(row.client_brand_id) : '',
    client: String(row.client || ''),
    brand: String(row.brand || ''),
    name: String(row.name || ''),
    category: String(row.category || 'Business'),
    unit: String(row.unit || 'Number'),
    baseline: Number(row.baseline || 0),
    target: Number(row.target || 0),
    direction: String(row.direction || 'increase') as KpiDefinition['direction'],
    cadence: String(row.cadence || 'Monthly') as KpiDefinition['cadence'],
    weight: Number(row.weight || 1),
    active: row.active !== false,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function createSupabaseKpiDefinition(
  definition: Omit<KpiDefinition, 'id' | 'createdAt'>
): Promise<KpiDefinition> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { data, error } = await supabase.from('kpi_definitions').insert([{
    client_brand_id: toDeterministicUuid(definition.clientBrandId),
    client: definition.client || '',
    brand: definition.brand || '',
    name: definition.name.trim(),
    category: definition.category || 'Business',
    unit: definition.unit || 'Number',
    baseline: Number(definition.baseline || 0),
    target: Number(definition.target || 0),
    direction: definition.direction || 'increase',
    cadence: definition.cadence || 'Monthly',
    weight: Number(definition.weight || 1),
    active: definition.active !== false,
  }]).select().single();
  if (error) throw error;
  return mapSupabaseKpiDefinition(data);
}

function mapSupabaseKpiUpdate(row: any): KpiUpdate {
  return {
    id: String(row.id),
    kpiId: String(row.kpi_id),
    period: String(row.period || '').slice(0, 10),
    actual: Number(row.actual || 0),
    notes: String(row.notes || ''),
    sourceLink: row.source_link ? normalizeUrl(row.source_link) : '',
    updatedBy: String(row.updated_by || ''),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function createSupabaseKpiUpdate(
  update: Omit<KpiUpdate, 'id' | 'updatedAt'>
): Promise<KpiUpdate> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const kpiId = toDeterministicUuid(update.kpiId);
  if (!kpiId) throw new Error('Invalid KPI ID.');
  const { data, error } = await supabase.from('kpi_updates').insert([{
    kpi_id: kpiId,
    period: update.period,
    actual: Number(update.actual || 0),
    notes: update.notes || '',
    source_link: update.sourceLink ? normalizeUrl(update.sourceLink) : '',
    updated_by: update.updatedBy || '',
  }]).select().single();
  if (error) throw error;
  return mapSupabaseKpiUpdate(data);
}

function mapSupabaseDocument(row: any): DocumentItem {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    type: String(row.type || 'Note') as DocumentItem['type'],
    body: String(row.body || ''),
    url: row.url ? normalizeUrl(row.url) : '',
    ownerId: row.owner_id ? String(row.owner_id) : '',
    visibility: String(row.visibility || 'team') as DocumentItem['visibility'],
    client: String(row.client || ''),
    brand: String(row.brand || ''),
    taskId: row.task_id ? String(row.task_id) : '',
    tags: String(row.tags || ''),
    pinned: row.pinned === true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapDocumentToSupabaseRow(document: Partial<DocumentItem>): Record<string, unknown> {
  return {
    title: document.title?.trim() || 'Untitled document',
    type: document.type || 'Note',
    body: document.body || '',
    url: document.url ? normalizeUrl(document.url) : '',
    owner_id: document.ownerId === 'super-admin-default' ? null : toDeterministicUuid(document.ownerId),
    visibility: document.visibility || 'team',
    client: document.client || '',
    brand: document.brand || '',
    task_id: toDeterministicUuid(document.taskId),
    tags: document.tags || '',
    pinned: document.pinned === true,
    updated_at: new Date().toISOString(),
  };
}

export async function createSupabaseDocument(
  document: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DocumentItem> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { data, error } = await supabase.from('documents').insert([mapDocumentToSupabaseRow(document)]).select().single();
  if (error) throw error;
  return mapSupabaseDocument(data);
}

export async function updateSupabaseDocument(document: DocumentItem): Promise<DocumentItem> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const uuid = toDeterministicUuid(document.id);
  if (!uuid) throw new Error('Invalid document ID.');
  const { data, error } = await supabase.from('documents').update(mapDocumentToSupabaseRow(document)).eq('id', uuid).select().single();
  if (error) throw error;
  return mapSupabaseDocument(data);
}

export async function deleteSupabaseDocument(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const uuid = toDeterministicUuid(id);
  if (!uuid) return false;
  const { error } = await supabase.from('documents').delete().eq('id', uuid);
  if (error) throw error;
  return true;
}

// ----------------------------------------------------------------------
// TASK RESOURCES (links and uploaded images)
// ----------------------------------------------------------------------

export async function createSupabaseTaskResource(
  resource: Omit<TaskResource, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TaskResource> {
  if (!supabase) throw new Error('Supabase client is not initialized.');

  const createdByUuid = resource.createdBy && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.createdBy)
    ? resource.createdBy
    : null;
  const row = {
    task_id: toDeterministicUuid(resource.taskId),
    type: resource.type,
    title: resource.title.trim() || 'Untitled resource',
    url: resource.url ? normalizeUrl(resource.url) : '',
    storage_path: resource.storagePath || '',
    mime_type: resource.mimeType || '',
    file_size: resource.fileSize || null,
    visibility: resource.visibility === 'client' ? 'client' : 'internal',
    client: resource.client || '',
    brand: resource.brand || '',
    pinned: resource.pinned === true,
    created_by: createdByUuid,
  };

  if (!row.task_id) throw new Error('Task belum tersimpan. Simpan task terlebih dahulu sebelum menambahkan resource.');

  const { data, error } = await supabase.from('task_resources').insert([row]).select().single();
  if (error) {
    console.error('Failed to create task resource in Supabase:', error);
    throw error;
  }

  return normalizeTaskResource({
    id: data.id,
    taskId: data.task_id,
    type: data.type,
    title: data.title,
    url: data.url,
    storagePath: data.storage_path,
    mimeType: data.mime_type,
    fileSize: data.file_size,
    visibility: data.visibility,
    client: data.client,
    brand: data.brand,
    pinned: data.pinned,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

export async function deleteSupabaseTaskResource(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const uuid = toDeterministicUuid(id);
  if (!uuid) return false;
  const { error } = await supabase.from('task_resources').delete().eq('id', uuid);
  if (error) {
    console.error('Failed to delete task resource in Supabase:', error);
    throw error;
  }
  return true;
}

// ----------------------------------------------------------------------
// COMMENTS CRUD (Supabase)
// ----------------------------------------------------------------------

export async function createSupabaseComment(
  contentId: string,
  authorName: string,
  text: string,
  attachmentUrl?: string,
  mentionedUserIds?: string[],
  authorId?: string
): Promise<CommentItem> {
  if (!supabase) throw new Error('Supabase client is not initialized.');

  const row = {
    task_id: toDeterministicUuid(contentId),
    author: authorName || 'Team Member',
    author_id: toForeignKeyUuid(authorId),
    text: text.trim(),
    attachment_url: attachmentUrl ? normalizeUrl(attachmentUrl) : '',
    mentioned_user_ids: Array.isArray(mentionedUserIds) ? mentionedUserIds.map(toForeignKeyUuid).filter(Boolean) : [],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('comments').insert([row]).select().single();
  if (error) {
    console.error('Failed to create comment in Supabase:', error);
    throw error;
  }

  const mentionedIds = Array.isArray(mentionedUserIds)
    ? mentionedUserIds.map(toForeignKeyUuid).filter((id): id is string => Boolean(id) && id !== toForeignKeyUuid(authorId))
    : [];
  let notificationSummary: CommentItem['notification'] | undefined;
  if (mentionedIds.length > 0) {
    const notificationRows = mentionedIds.map((userId) => ({
      user_id: userId,
      comment_id: data.id,
      task_id: data.task_id,
      actor_id: toForeignKeyUuid(authorId),
      actor_name: authorName || 'Team Member',
      type: 'mention' as const,
      title: `${authorName || 'Team Member'} mentioned you`,
      body: text.trim().slice(0, 240),
      read: false,
      created_at: new Date().toISOString(),
    }));
    const { error: notificationError } = await supabase.from('notifications').insert(notificationRows);
    notificationSummary = {
      requested: mentionedIds.length,
      sent: notificationError ? 0 : mentionedIds.length,
      failed: notificationError ? mentionedIds.length : 0,
      errors: notificationError ? [notificationError.message] : undefined,
    };
    if (notificationError && notificationError.code !== '42P01') {
      console.warn('Comment saved, but notification creation failed:', notificationError.message);
    }
  }

  return {
    id: String(data.id),
    contentId: String(data.task_id),
    author: String(data.author),
    text: String(data.text),
    createdAt: new Date(data.created_at).toISOString(),
    attachmentUrl: data.attachment_url ? normalizeUrl(data.attachment_url) : undefined,
    mentionedUserIds: Array.isArray(data.mentioned_user_ids) ? data.mentioned_user_ids.map(String) : [],
    notification: notificationSummary,
  };
}

export async function markSupabaseNotificationRead(id: string, userId?: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const uuid = toDeterministicUuid(id);
  if (!uuid) return;
  let query = supabase.from('notifications').update({ read: true }).eq('id', uuid);
  const userUuid = toDeterministicUuid(userId);
  if (userUuid) query = query.eq('user_id', userUuid);
  const { error } = await query;
  if (error) throw error;
}

export async function markAllSupabaseNotificationsRead(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const uuid = toDeterministicUuid(userId);
  if (!uuid) return;
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', uuid).eq('read', false);
  if (error) throw error;
}

// ----------------------------------------------------------------------
// REALTIME SUBSCRIPTIONS (Supabase WebSocket)
// ----------------------------------------------------------------------

export function subscribeToSupabaseRealtime(
  onTaskChange: (payload: any) => void,
  onCommentChange: (payload: any) => void,
  onResourceChange?: (payload: any) => void,
  onNotificationChange?: (payload: any) => void,
) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('contentlab_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
      onTaskChange(payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
      onCommentChange(payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_resources' }, (payload) => {
      onResourceChange?.(payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
      onNotificationChange?.(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ----------------------------------------------------------------------
// 1-CLICK MIGRATION IMPORTER: GOOGLE SHEETS -> SUPABASE (ALL 8 TABLES)
// ----------------------------------------------------------------------

export async function importGoogleSheetsToSupabase(sheetsData: {
  content: ContentItem[];
  team: TeamMember[];
  channels: Channel[];
  clients: ClientBrand[];
  comments: CommentItem[];
  kpiDefinitions: KpiDefinition[];
  kpiUpdates: KpiUpdate[];
  documents: DocumentItem[];
}): Promise<{
  success: boolean;
  count: number;
  breakdown: {
    clients: number;
    channels: number;
    team: number;
    tasks: number;
    comments: number;
    kpiDefinitions: number;
    kpiUpdates: number;
    documents: number;
  };
  message: string;
}> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const breakdown = {
    clients: 0,
    channels: 0,
    team: 0,
    tasks: 0,
    comments: 0,
    kpiDefinitions: 0,
    kpiUpdates: 0,
    documents: 0,
  };

  // Helper for batch/row upsert with robust fallback
  const safeUpsertBatch = async (table: string, rows: any[], onConflict?: string) => {
    if (!rows || rows.length === 0) return 0;
    let count = 0;

    const options = onConflict ? { onConflict } : undefined;
    const { error } = await supabase.from(table).upsert(rows, options);

    if (!error) {
      return rows.length;
    }

    console.warn(`Batch upsert for table "${table}" failed (${error.message}). Retrying row-by-row...`);

    for (const row of rows) {
      const { error: rowErr } = await supabase.from(table).upsert([row], options);
      if (!rowErr) {
        count++;
      } else {
        console.error(`Row upsert error in "${table}":`, rowErr.message, row);
      }
    }

    return count;
  };

  // 1. Import Client Brands
  if (sheetsData.clients.length > 0) {
    const clientRows = sheetsData.clients.map((c) => ({
      id: toDeterministicUuid(c.id),
      client: c.client,
      brand: c.brand,
      color: c.color || '#2563eb',
      active: c.active !== false,
    })).filter((row) => row.client && row.brand);

    breakdown.clients = await safeUpsertBatch('client_brands', clientRows, 'client,brand');
  }

  // 2. Import Channels
  if (sheetsData.channels.length > 0) {
    const channelRows = sheetsData.channels.map((ch) => ({
      id: toDeterministicUuid(ch.id),
      name: ch.name,
      color: ch.color || '#2563eb',
    })).filter((row) => row.name);

    breakdown.channels = await safeUpsertBatch('channels', channelRows, 'name');
  }

  // 3. Import Team Members
  if (sheetsData.team.length > 0) {
    const teamRows = sheetsData.team.map((t) => ({
      id: toDeterministicUuid(t.id),
      name: t.name || 'Team Member',
      email: t.email,
      password: t.password || '',
      role: ['super', 'client', 'team'].includes(String(t.role).toLowerCase()) ? t.role.toLowerCase() : 'team',
      client_access: t.client || '',
      avatar_url: t.avatar || '',
    })).filter((row) => row.email);

    breakdown.team = await safeUpsertBatch('team_members', teamRows, 'email');
  }

  // 4. Import Tasks & Content Items
  if (sheetsData.content.length > 0) {
    const taskRows = sheetsData.content
      .map((item) => mapContentItemToTaskRow(item))
      .filter((row) => row.title);

    breakdown.tasks = await safeUpsertBatch('tasks', taskRows, 'id');
  }

  // 5. Import Discussion & Revision Comments
  if (sheetsData.comments.length > 0) {
    const commentRows = sheetsData.comments.map((cm) => ({
      id: toDeterministicUuid(cm.id),
      task_id: toDeterministicUuid(cm.contentId),
      author: cm.author || 'Team Member',
      author_id: toDeterministicUuid(cm.authorId),
      text: cm.text || '',
      attachment_url: cm.attachmentUrl ? normalizeUrl(cm.attachmentUrl) : '',
      mentioned_user_ids: Array.isArray(cm.mentionedUserIds) ? cm.mentionedUserIds.map(toDeterministicUuid).filter(Boolean) : [],
      created_at: cm.createdAt ? new Date(cm.createdAt).toISOString() : new Date().toISOString(),
    })).filter((row) => row.task_id && row.text);

    breakdown.comments = await safeUpsertBatch('comments', commentRows, 'id');
  }

  // 6. Import KPI Definitions
  if (sheetsData.kpiDefinitions.length > 0) {
    const kpiRows = sheetsData.kpiDefinitions.map((kpi) => ({
      id: toDeterministicUuid(kpi.id),
      client_brand_id: toDeterministicUuid(kpi.clientBrandId),
      client: kpi.client || '',
      brand: kpi.brand || '',
      name: kpi.name || 'KPI Metric',
      category: kpi.category || 'Business',
      unit: kpi.unit || 'Number',
      baseline: Number(kpi.baseline || 0),
      target: Number(kpi.target || 0),
      direction: kpi.direction === 'decrease' ? 'decrease' : 'increase',
      cadence: ['Weekly', 'Monthly', 'Quarterly'].includes(String(kpi.cadence)) ? kpi.cadence : 'Monthly',
      weight: Number(kpi.weight || 1),
      active: kpi.active !== false,
      created_at: kpi.createdAt ? new Date(kpi.createdAt).toISOString() : new Date().toISOString(),
    })).filter((row) => row.name);

    breakdown.kpiDefinitions = await safeUpsertBatch('kpi_definitions', kpiRows, 'id');
  }

  // 7. Import KPI Updates Log
  if (sheetsData.kpiUpdates.length > 0) {
    const updateRows = sheetsData.kpiUpdates.map((up) => ({
      id: toDeterministicUuid(up.id),
      kpi_id: toDeterministicUuid(up.kpiId),
      period: up.period ? String(up.period).slice(0, 10) : new Date().toISOString().slice(0, 10),
      actual: Number(up.actual || 0),
      notes: up.notes || '',
      source_link: up.sourceLink ? normalizeUrl(up.sourceLink) : '',
      updated_by: up.updatedBy || '',
      updated_at: up.updatedAt ? new Date(up.updatedAt).toISOString() : new Date().toISOString(),
    })).filter((row) => row.kpi_id);

    breakdown.kpiUpdates = await safeUpsertBatch('kpi_updates', updateRows, 'id');
  }

  // 8. Import Documents & Notes
  if (sheetsData.documents.length > 0) {
    const docRows = sheetsData.documents.map((doc) => ({
      id: toDeterministicUuid(doc.id),
      title: doc.title || 'Untitled Document',
      type: doc.type === 'Link' ? 'Link' : 'Note',
      body: doc.body || '',
      url: doc.url ? normalizeUrl(doc.url) : '',
      owner_id: toDeterministicUuid(doc.ownerId),
      visibility: ['personal', 'team', 'client'].includes(String(doc.visibility).toLowerCase()) ? doc.visibility.toLowerCase() : 'team',
      client: doc.client || '',
      brand: doc.brand || '',
      task_id: toDeterministicUuid(doc.taskId),
      tags: doc.tags || '',
      pinned: doc.pinned === true,
      created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updated_at: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    })).filter((row) => row.title);

    breakdown.documents = await safeUpsertBatch('documents', docRows, 'id');
  }

  const totalCount =
    breakdown.clients +
    breakdown.channels +
    breakdown.team +
    breakdown.tasks +
    breakdown.comments +
    breakdown.kpiDefinitions +
    breakdown.kpiUpdates +
    breakdown.documents;

  return {
    success: true,
    count: totalCount,
    breakdown,
    message: `Migration selesai! Total ${totalCount} records (Tasks, Comments, KPIs, Team, Docs, Clients) berhasil diimpor ke Supabase Database.`,
  };
}

// ----------------------------------------------------------------------
// USER AUTHENTICATION (Supabase DB Team Members)
// ----------------------------------------------------------------------

export async function authenticateSupabaseUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: TeamMember; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase client is not initialized.' };

  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  try {
    const { data, error } = await supabase.from('team_members').select('*');
    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, error: 'Belum ada anggota Team di Supabase. Silakan login atau eksekusi 1-Click Import di Settings.' };
    }

    const match = data.find((member: any) => {
      const nameMatch = String(member.name || '').trim().toLowerCase() === cleanUser;
      const emailMatch = String(member.email || '').trim().toLowerCase() === cleanUser;
      return nameMatch || emailMatch;
    });

    if (!match) {
      return { success: false, error: 'User tidak ditemukan di daftar Team.' };
    }

    if (match.password && String(match.password).trim() !== cleanPass) {
      return { success: false, error: 'Password salah.' };
    }

    const user: TeamMember = {
      id: String(match.id),
      name: String(match.name || ''),
      email: String(match.email || ''),
      password: String(match.password || ''),
      role: (String(match.role || 'team').toLowerCase() === 'super' ? 'super' : String(match.role || 'team').toLowerCase() === 'client' ? 'client' : 'team') as TeamMember['role'],
      client: String(match.client_access || match.client || ''),
      avatar: match.avatar_url || '',
    };

    return { success: true, user };
  } catch (e: any) {
    console.error('Supabase authentication error:', e);
    return { success: false, error: e?.message || 'Gagal terhubung ke Supabase DB.' };
  }
}
