import { supabase } from './supabase';
import type {
  ContentItem,
  TeamMember,
  Channel,
  ClientBrand,
  CommentItem,
  KpiDefinition,
  KpiUpdate,
  DocumentItem,
} from './sheets';
import { normalizeUrl } from '../utils/url';

/**
 * Checks if Supabase DB is properly configured and accessible.
 */
export function isSupabaseDbConfigured(): boolean {
  return !!supabase;
}

// ----------------------------------------------------------------------
// DATA MAPPING HELPERS (Database Columns <-> React Domain Models)
// ----------------------------------------------------------------------

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
  return {
    title: item.title,
    brief: item.brief,
    status: item.status,
    channel: item.channel,
    format: item.format,
    priority: item.priority,
    assignee: item.assignee,
    owner_id: item.ownerId || null,
    reviewer_id: item.reviewerId || null,
    collaborator_ids: item.collaboratorIds || [],
    publish_date: item.publishDate,
    assets_link: item.assetsLink ? normalizeUrl(item.assetsLink) : '',
    cover_image_url: item.coverImageUrl,
    cover_image_id: item.coverImageId,
    tags: item.tags,
    budget: item.budget,
    platform_notes: item.platformNotes,
    target_audience: item.targetAudience,
    created_by: item.createdBy,
    creator_id: item.creatorId || null,
    checklist: item.checklist ? (typeof item.checklist === 'string' ? JSON.parse(item.checklist) : item.checklist) : [],
    views: item.views,
    likes: item.likes,
    engagement: item.engagement,
    task_type: item.taskType || 'Content',
    category: item.category,
    due_date: item.dueDate,
    client: item.client,
    brand: item.brand,
    updated_at: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------
// INITIAL DATA FETCHING (Supabase)
// ----------------------------------------------------------------------

export async function fetchSupabaseInitialData(): Promise<{
  content: ContentItem[];
  team: TeamMember[];
  channels: Channel[];
  clients: ClientBrand[];
  comments: CommentItem[];
  kpiDefinitions: KpiDefinition[];
  kpiUpdates: KpiUpdate[];
  documents: DocumentItem[];
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
  ] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('team_members').select('*').order('created_at', { ascending: true }),
    supabase.from('channels').select('*').order('name', { ascending: true }),
    supabase.from('client_brands').select('*').order('client', { ascending: true }),
    supabase.from('comments').select('*').order('created_at', { ascending: true }),
    supabase.from('kpi_definitions').select('*').order('created_at', { ascending: true }),
    supabase.from('kpi_updates').select('*').order('period', { ascending: true }),
    supabase.from('documents').select('*').order('updated_at', { ascending: false }),
  ]);

  if (tasksRes.error) console.error('Error fetching Supabase tasks:', tasksRes.error);
  if (teamRes.error) console.error('Error fetching Supabase team:', teamRes.error);

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

  const comments: CommentItem[] = (commentsRes.data || []).map((row: any) => ({
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

  return {
    content,
    team,
    channels,
    clients,
    comments,
    kpiDefinitions,
    kpiUpdates,
    documents,
  };
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

  // If item ID is a valid UUID, update by ID. Otherwise update by title/client match
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);

  let query = supabase.from('tasks').update(row);
  if (isUuid) {
    query = query.eq('id', item.id);
  } else {
    query = query.eq('title', item.title).eq('client', item.client);
  }

  const { data, error } = await query.select().single();
  if (error) {
    console.error('Failed to update task in Supabase:', error);
    // If update by non-UUID failed, fallback to insert
    return createSupabaseContent(item);
  }
  return mapTaskRowToContentItem(data);
}

export async function deleteSupabaseContent(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client is not initialized.');

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) return true;

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete task from Supabase:', error);
    return false;
  }
  return true;
}

// ----------------------------------------------------------------------
// COMMENTS CRUD (Supabase)
// ----------------------------------------------------------------------

export async function createSupabaseComment(
  contentId: string,
  text: string,
  attachmentUrl?: string,
  mentionedUserIds?: string[],
  authorName?: string,
  authorId?: string
): Promise<CommentItem> {
  if (!supabase) throw new Error('Supabase client is not initialized.');

  const row = {
    task_id: contentId,
    author: authorName || 'Team Member',
    author_id: authorId || null,
    text: text.trim(),
    attachment_url: attachmentUrl ? normalizeUrl(attachmentUrl) : '',
    mentioned_user_ids: mentionedUserIds || [],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('comments').insert([row]).select().single();
  if (error) {
    console.error('Failed to create comment in Supabase:', error);
    throw error;
  }

  return {
    id: String(data.id),
    contentId: String(data.task_id),
    author: String(data.author),
    text: String(data.text),
    createdAt: new Date(data.created_at).toISOString(),
    attachmentUrl: data.attachment_url ? normalizeUrl(data.attachment_url) : undefined,
    mentionedUserIds: Array.isArray(data.mentioned_user_ids) ? data.mentioned_user_ids.map(String) : [],
  };
}

// ----------------------------------------------------------------------
// REALTIME SUBSCRIPTIONS (Supabase WebSocket)
// ----------------------------------------------------------------------

export function subscribeToSupabaseRealtime(
  onTaskChange: (payload: any) => void,
  onCommentChange: (payload: any) => void
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ----------------------------------------------------------------------
// 1-CLICK MIGRATION IMPORTER: GOOGLE SHEETS -> SUPABASE
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
}): Promise<{ success: boolean; count: number; message: string }> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  let importedCount = 0;

  // 1. Import Client Brands
  if (sheetsData.clients.length > 0) {
    const clientRows = sheetsData.clients.map((c) => ({
      client: c.client,
      brand: c.brand,
      color: c.color || '#2563eb',
      active: c.active !== false,
    }));
    const { error } = await supabase.from('client_brands').upsert(clientRows, { onConflict: 'client,brand' });
    if (error) console.warn('Supabase clients import note:', error.message);
    else importedCount += clientRows.length;
  }

  // 2. Import Channels
  if (sheetsData.channels.length > 0) {
    const channelRows = sheetsData.channels.map((ch) => ({
      name: ch.name,
      color: ch.color || '#2563eb',
    }));
    const { error } = await supabase.from('channels').upsert(channelRows, { onConflict: 'name' });
    if (error) console.warn('Supabase channels import note:', error.message);
    else importedCount += channelRows.length;
  }

  // 3. Import Team Members
  if (sheetsData.team.length > 0) {
    const teamRows = sheetsData.team.map((t) => ({
      name: t.name,
      email: t.email,
      password: t.password || '',
      role: t.role || 'team',
      client_access: t.client || '',
      avatar_url: t.avatar || '',
    }));
    const { error } = await supabase.from('team_members').upsert(teamRows, { onConflict: 'email' });
    if (error) console.warn('Supabase team import note:', error.message);
    else importedCount += teamRows.length;
  }

  // 4. Import Tasks & Content Items
  if (sheetsData.content.length > 0) {
    const taskRows = sheetsData.content.map((item) => mapContentItemToTaskRow(item));
    const { error } = await supabase.from('tasks').insert(taskRows);
    if (error) {
      console.warn('Supabase tasks batch insert error, retrying individual items:', error.message);
      for (const item of sheetsData.content) {
        try {
          await supabase.from('tasks').insert([mapContentItemToTaskRow(item)]);
          importedCount++;
        } catch (e) {
          // ignore single item duplicate
        }
      }
    } else {
      importedCount += taskRows.length;
    }
  }

  return {
    success: true,
    count: importedCount,
    message: `Berhasil mengimpor data Google Sheets ke Supabase Database.`,
  };
}
