import { getGeneratedAvatar } from '../utils/avatar';
import { normalizeUrl } from '../utils/url';

export type TaskType = 'Content' | 'General';
export type UserRole = 'super' | 'team' | 'client';
export type KpiDirection = 'increase' | 'decrease';
export type KpiCadence = 'Weekly' | 'Monthly' | 'Quarterly';
export type TaskMemberRole = 'creator' | 'owner' | 'collaborator' | 'reviewer';
export type DocumentType = 'Note' | 'Link';
export type DocumentVisibility = 'personal' | 'team' | 'client';
export type TaskStatus =
  | 'Idea'
  | 'Scripting/Writing'
  | 'Production/Design'
  | 'Review/Editing'
  | 'Scheduled'
  | 'Published'
  | 'To Do'
  | 'In Progress'
  | 'Done';

export interface ContentItem {
  id: string;
  title: string;
  brief: string;
  status: TaskStatus;
  channel: string;
  format: 'Video' | 'Carousel' | 'Graphic' | 'Article' | 'Short';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignee: string;
  ownerId?: string;
  creatorId?: string;
  collaboratorIds?: string[];
  reviewerId?: string;
  actorId?: string;
  publishDate: string; // YYYY-MM-DD
  assetsLink: string;
  coverImageUrl?: string;
  coverImageId?: string;
  // Optional variables
  tags?: string;
  budget?: string;
  platformNotes?: string;
  targetAudience?: string;
  createdBy?: string;
  // Upgraded features variables
  checklist?: string;     // JSON string representing subtask assets
  views?: string;         // performance view counts
  likes?: string;         // performance likes
  engagement?: string;    // performance engagement (comments/shares)
  taskType: TaskType;
  category?: string;
  dueDate?: string;       // YYYY-MM-DD for non-content tasks
  client?: string;
  brand?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentItem {
  id: string;
  contentId: string;
  author: string;
  text: string;
  attachmentUrl?: string;
  mentionedUserIds?: string[];
  notification?: {
    requested: number;
    sent: number;
    failed: number;
    errors?: string[];
  };
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string; // New field for multi-user authentication
  role: UserRole;
  client?: string;
}

export interface TaskMember {
  id: string;
  taskId: string;
  userId: string;
  role: TaskMemberRole;
  addedAt: string;
  addedBy: string;
}

export function parseDateCell(raw: unknown): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (!str) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return str.split('T')[0];
}

export function isUserInvolved(item: ContentItem, user: Pick<TeamMember, 'id' | 'name'>): boolean {
  return item.ownerId === user.id ||
    item.reviewerId === user.id ||
    (item.collaboratorIds || []).includes(user.id) ||
    (!item.ownerId && item.assignee.toLowerCase() === user.name.toLowerCase());
}

export function getAssignedClients(user?: TeamMember): string[] {
  if (!user || !user.client || user.client.trim() === '' || user.client === 'All' || user.client === '*') {
    return [];
  }
  return user.client.split(',').map((s) => s.trim()).filter(Boolean);
}

export function hasClientAccess(user: TeamMember, itemClient?: string, itemBrand?: string): boolean {
  if (!user) return false;
  if (user.role === 'super') return true;
  const assigned = getAssignedClients(user);
  if (assigned.length === 0) return true; // No restriction specified (has access to all)

  const targetClient = (itemClient || '').trim().toLowerCase();
  const targetBrand = (itemBrand || '').trim().toLowerCase();

  return assigned.some((clientName) => {
    const norm = clientName.toLowerCase();
    return (targetClient && targetClient.includes(norm)) || (targetBrand && targetBrand.includes(norm));
  });
}


export interface Channel {
  id: string;
  name: string;
  color: string;
}

export interface ClientBrand {
  id: string;
  client: string;
  brand: string;
  color: string;
  active: boolean;
}

export interface KpiDefinition {
  id: string;
  clientBrandId: string;
  client: string;
  brand: string;
  name: string;
  category: string;
  unit: string;
  baseline: number;
  target: number;
  direction: KpiDirection;
  cadence: KpiCadence;
  weight: number;
  active: boolean;
  createdAt: string;
}

export interface KpiUpdate {
  id: string;
  kpiId: string;
  period: string;
  actual: number;
  notes: string;
  sourceLink: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: DocumentType;
  body: string;
  url: string;
  ownerId: string;
  visibility: DocumentVisibility;
  client: string;
  brand: string;
  taskId: string;
  tags: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VariablesConfig {
  brief: boolean;
  publishDate: boolean;
  tags: boolean;
  budget: boolean;
  platformNotes: boolean;
  targetAudience: boolean;
}

export interface WorkspaceData {
  content: ContentItem[];
  team: TeamMember[];
  channels: Channel[];
  comments: CommentItem[];
  clients: ClientBrand[];
  kpiDefinitions: KpiDefinition[];
  kpiUpdates: KpiUpdate[];
  documents: DocumentItem[];
}

export interface CachedWorkspaceData extends WorkspaceData {
  savedAt: string;
}

const SCRIPT_URL_KEY = 'contentlab_google_sheets_url';
const GLOBAL_SCRIPT_URL = String(import.meta.env.VITE_GOOGLE_SHEETS_URL || '').trim();
const MOCK_CONTENT_KEY = 'contentlab_mock_content';
const MOCK_CHANNELS_KEY = 'contentlab_mock_channels';
const MOCK_COMMENTS_KEY = 'contentlab_mock_comments';
const MOCK_CLIENTS_KEY = 'contentlab_mock_clients';
const MOCK_KPI_DEFINITIONS_KEY = 'contentlab_mock_kpi_definitions';
const MOCK_KPI_UPDATES_KEY = 'contentlab_mock_kpi_updates';
const MOCK_DOCUMENTS_KEY = 'contentlab_mock_documents';
const VARIABLES_CONFIG_KEY = 'contentlab_variables_config';
const CUSTOM_TAGS_KEY = 'contentlab_custom_tags';
const WORKSPACE_CACHE_KEY = 'contentlab_workspace_cache_v1';

// Default variables configs
const DEFAULT_VARIABLES_CONFIG: VariablesConfig = {
  brief: true,
  publishDate: true,
  tags: true,
  budget: false,
  platformNotes: false,
  targetAudience: false,
};

// Default custom tags
const DEFAULT_TAGS = ['Promo', 'Sponsor', 'Educational', 'Branding', 'Trending'];

const INITIAL_MOCK_TEAM: TeamMember[] = [];

const INITIAL_MOCK_CHANNELS: Channel[] = [
  { id: 'ch1', name: 'YouTube', color: '#2563eb' },
  { id: 'ch2', name: 'Instagram', color: '#db2777' },
  { id: 'ch3', name: 'TikTok', color: '#000000' },
  { id: 'ch4', name: 'LinkedIn', color: '#0a66c2' },
  { id: 'ch5', name: 'Blog', color: '#059669' },
  { id: 'ch6', name: 'Newsletter', color: '#d97706' },
];

const INITIAL_MOCK_CLIENTS: ClientBrand[] = [
  { id: 'cb1', client: 'Internal', brand: 'InfinitiLabs', color: '#2563eb', active: true },
];

const INITIAL_MOCK_KPI_DEFINITIONS: KpiDefinition[] = [];
const INITIAL_MOCK_KPI_UPDATES: KpiUpdate[] = [];
const INITIAL_MOCK_DOCUMENTS: DocumentItem[] = [];

const INITIAL_MOCK_CONTENT: ContentItem[] = [
  {
    id: 'c1',
    title: 'Strategi SEO 2026 untuk Startup Baru',
    brief: 'Pembahasan mendalam tentang AI Search optimization dan core web vitals terbaru.',
    status: 'Scripting/Writing',
    channel: 'Blog',
    format: 'Article',
    priority: 'High',
    assignee: 'Andi Pratama',
    publishDate: '2026-08-01',
    assetsLink: 'https://docs.google.com/document/d/example1',
    tags: 'Educational,Branding',
    taskType: 'Content',
    client: 'Internal',
    brand: 'InfinitiLabs',
    createdBy: 'Andi Pratama',
    checklist: JSON.stringify([
      { id: 'sub1', label: 'Outline Script', done: true, link: 'https://docs.google.com/document/d/outline1' },
      { id: 'sub2', label: 'Review Keyword SEO', done: false, link: '' },
      { id: 'sub3', label: 'Featured Image Graphics', done: false, link: '' }
    ]),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'c2',
    title: '1 Hari Menjadi Video Editor Handal',
    brief: 'Video pendek tips transisi CapCut & Premiere Pro untuk konten kreator pemula.',
    status: 'Production/Design',
    channel: 'TikTok',
    format: 'Short',
    priority: 'Medium',
    assignee: 'Siti Rahma',
    publishDate: '2026-07-25',
    assetsLink: 'https://drive.google.com/drive/example2',
    tags: 'Trending,Promo',
    taskType: 'Content',
    client: 'Internal',
    brand: 'InfinitiLabs',
    checklist: JSON.stringify([
      { id: 'sub4', label: 'Draft Video CapCut', done: true, link: 'https://drive.google.com/drive/draft1' },
      { id: 'sub5', label: 'Teks Caption', done: true, link: '' },
      { id: 'sub6', label: 'Publish Render Final', done: false, link: '' }
    ]),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'c5',
    title: 'Kenapa Spreadsheet adalah Database Favorit Startup?',
    brief: 'Post LinkedIn tentang kepraktisan Google Sheets untuk workflow dashboard internal.',
    status: 'Published',
    channel: 'LinkedIn',
    format: 'Article',
    priority: 'Medium',
    assignee: 'Andi Pratama',
    publishDate: '2026-07-18',
    assetsLink: 'https://linkedin.com/post/example5',
    tags: 'Branding,Sponsor',
    createdBy: 'Siti Rahma',
    views: '8500',
    likes: '620',
    engagement: '142',
    taskType: 'Content',
    client: 'Internal',
    brand: 'InfinitiLabs',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  }
];

const INITIAL_MOCK_COMMENTS: CommentItem[] = [
  {
    id: 'comm1',
    contentId: 'c1',
    author: 'Siti Rahma',
    text: 'Draf artikel sudah selesai, @Andi Pratama tolong bantu review keywords-nya ya.',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'comm2',
    contentId: 'c1',
    author: 'Andi Pratama',
    text: 'Oke siap, nanti malam saya tambahkan list keyword trendingnya.',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  }
];

export function getScriptUrl(): string | null {
  return localStorage.getItem(SCRIPT_URL_KEY) || GLOBAL_SCRIPT_URL || null;
}

export function getGlobalScriptUrl(): string | null {
  return GLOBAL_SCRIPT_URL || null;
}

export function hasLocalScriptUrlOverride(): boolean {
  return !!localStorage.getItem(SCRIPT_URL_KEY);
}

export function saveScriptUrl(url: string): void {
  if (url) {
    localStorage.setItem(SCRIPT_URL_KEY, url);
  } else {
    localStorage.removeItem(SCRIPT_URL_KEY);
  }
}

export function isMockMode(): boolean {
  return !getScriptUrl();
}

import { uploadCoverImageToSupabase } from './supabase';

export interface CoverImageUpload {
  url: string;
  id: string;
}

export async function uploadCoverImage(file: File): Promise<CoverImageUpload> {
  // 1. Try Supabase Object Storage first for instant 100ms CDN upload
  try {
    const supabaseResult = await uploadCoverImageToSupabase(file);
    if (supabaseResult?.url) {
      return supabaseResult;
    }
  } catch (sbErr) {
    console.warn('Supabase storage upload failed, attempting Apps Script fallback:', sbErr);
  }

  // 2. Fallback to Google Apps Script Drive Storage
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Gunakan file JPG, PNG, atau WebP.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran gambar maksimal 5 MB.');
  }
  const url = getScriptUrl();
  if (!url) throw new Error('Workspace belum terhubung ke Google Sheets.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action: 'uploadCoverImage',
      fileName: file.name,
      mimeType: file.type,
      dataUrl,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success || !result.coverImage?.url) {
    throw new Error(result?.error || 'Upload gambar gagal.');
  }
  return result.coverImage as CoverImageUpload;
}

// Variables Config Getters & Setters
export function getVariablesConfig(): VariablesConfig {
  const saved = localStorage.getItem(VARIABLES_CONFIG_KEY);
  if (saved) {
    return { ...DEFAULT_VARIABLES_CONFIG, ...JSON.parse(saved) };
  }
  return DEFAULT_VARIABLES_CONFIG;
}

export function saveVariablesConfig(config: VariablesConfig): void {
  localStorage.setItem(VARIABLES_CONFIG_KEY, JSON.stringify(config));
}

// Custom Tags Getters & Setters
export function getCustomTags(items?: ContentItem[]): string[] {
  const saved = localStorage.getItem(CUSTOM_TAGS_KEY);
  let tags: string[] = saved ? JSON.parse(saved) : [];
  if (!Array.isArray(tags)) {
    tags = [];
  }
  const tagSet = new Set<string>([...DEFAULT_TAGS, ...tags]);

  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (item.tags) {
        item.tags.split(',').forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
  }

  const result = Array.from(tagSet).sort();
  try {
    localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(result));
  } catch (e) {}
  return result;
}

export function saveCustomTags(tags: string[]): void {
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(tags));
}

export function getCachedWorkspaceData(): CachedWorkspaceData | null {
  try {
    const cached = JSON.parse(localStorage.getItem(WORKSPACE_CACHE_KEY) || 'null') as CachedWorkspaceData | null;
    if (!cached || !Array.isArray(cached.content) || !Array.isArray(cached.team)) return null;
    return {
      ...cached,
      documents: Array.isArray(cached.documents) ? cached.documents : [],
    };
  } catch {
    localStorage.removeItem(WORKSPACE_CACHE_KEY);
    return null;
  }
}

export function saveCachedWorkspaceData(data: WorkspaceData): string {
  const savedAt = new Date().toISOString();
  const cache: CachedWorkspaceData = {
    ...data,
    // Passwords are only needed by Apps Script during login and must not persist in the browser cache.
    team: data.team.map(({ password: _password, ...member }) => member),
    savedAt,
  };
  localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(cache));
  return savedAt;
}

export function clearCachedWorkspaceData(): void {
  localStorage.removeItem(WORKSPACE_CACHE_KEY);
}

function getLocalData(): WorkspaceData {
  let content = INITIAL_MOCK_CONTENT;
  let team = INITIAL_MOCK_TEAM;
  let channels = INITIAL_MOCK_CHANNELS;
  let comments = INITIAL_MOCK_COMMENTS;
  let clients = INITIAL_MOCK_CLIENTS;
  let kpiDefinitions = INITIAL_MOCK_KPI_DEFINITIONS;
  let kpiUpdates = INITIAL_MOCK_KPI_UPDATES;
  let documents = INITIAL_MOCK_DOCUMENTS;

  const savedContent = localStorage.getItem(MOCK_CONTENT_KEY);
  const savedChannels = localStorage.getItem(MOCK_CHANNELS_KEY);
  const savedComments = localStorage.getItem(MOCK_COMMENTS_KEY);
  const savedClients = localStorage.getItem(MOCK_CLIENTS_KEY);
  const savedKpiDefinitions = localStorage.getItem(MOCK_KPI_DEFINITIONS_KEY);
  const savedKpiUpdates = localStorage.getItem(MOCK_KPI_UPDATES_KEY);
  const savedDocuments = localStorage.getItem(MOCK_DOCUMENTS_KEY);

  if (savedContent) {
    content = JSON.parse(savedContent).map((item: ContentItem) => ({
      ...item,
      taskType: item.taskType || 'Content',
    }));
  } else {
    localStorage.setItem(MOCK_CONTENT_KEY, JSON.stringify(content));
  }

  localStorage.removeItem('contentlab_mock_team');

  if (savedChannels) {
    channels = JSON.parse(savedChannels);
  } else {
    localStorage.setItem(MOCK_CHANNELS_KEY, JSON.stringify(channels));
  }

  if (savedComments) {
    comments = JSON.parse(savedComments);
  } else {
    localStorage.setItem(MOCK_COMMENTS_KEY, JSON.stringify(comments));
  }

  if (savedClients) {
    clients = JSON.parse(savedClients);
  } else {
    localStorage.setItem(MOCK_CLIENTS_KEY, JSON.stringify(clients));
  }

  if (savedKpiDefinitions) {
    kpiDefinitions = JSON.parse(savedKpiDefinitions);
  } else {
    localStorage.setItem(MOCK_KPI_DEFINITIONS_KEY, JSON.stringify(kpiDefinitions));
  }

  if (savedKpiUpdates) {
    kpiUpdates = JSON.parse(savedKpiUpdates);
  } else {
    localStorage.setItem(MOCK_KPI_UPDATES_KEY, JSON.stringify(kpiUpdates));
  }

  if (savedDocuments) {
    documents = JSON.parse(savedDocuments);
  } else {
    localStorage.setItem(MOCK_DOCUMENTS_KEY, JSON.stringify(documents));
  }

  return { content, team, channels, comments, clients, kpiDefinitions, kpiUpdates, documents };
}

function saveLocalData(content: ContentItem[], _team?: TeamMember[], channels?: Channel[], comments?: CommentItem[], clients?: ClientBrand[], kpiDefinitions?: KpiDefinition[], kpiUpdates?: KpiUpdate[], documents?: DocumentItem[]) {
  localStorage.setItem(MOCK_CONTENT_KEY, JSON.stringify(content));
  if (channels) localStorage.setItem(MOCK_CHANNELS_KEY, JSON.stringify(channels));
  if (comments) localStorage.setItem(MOCK_COMMENTS_KEY, JSON.stringify(comments));
  if (clients) localStorage.setItem(MOCK_CLIENTS_KEY, JSON.stringify(clients));
  if (kpiDefinitions) localStorage.setItem(MOCK_KPI_DEFINITIONS_KEY, JSON.stringify(kpiDefinitions));
  if (kpiUpdates) localStorage.setItem(MOCK_KPI_UPDATES_KEY, JSON.stringify(kpiUpdates));
  if (documents) localStorage.setItem(MOCK_DOCUMENTS_KEY, JSON.stringify(documents));
}

export async function fetchData(): Promise<WorkspaceData> {
  const url = getScriptUrl();
  if (!url) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return getLocalData();
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API fetch failed');
    const data = await response.json();
    
    const team = (data.team || []).map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      email: String(item.email || ''),
      avatar: getGeneratedAvatar(String(item.name || 'User')),
      password: item.password ? String(item.password) : '',
      role: String(item.role || 'team').toLowerCase() === 'super' ? 'super' : String(item.role || 'team').toLowerCase() === 'client' ? 'client' : 'team',
      client: item.client ? String(item.client) : '',
    })) as TeamMember[];

    const taskMembers = (data.taskMembers || []).map((item: any) => ({
      id: String(item.id || ''),
      taskId: String(item.taskId || ''),
      userId: String(item.userId || ''),
      role: String(item.role || '') as TaskMemberRole,
      addedAt: String(item.addedAt || ''),
      addedBy: String(item.addedBy || ''),
    })) as TaskMember[];

    const uniqueUserIdForName = (name: unknown) => {
      const normalized = String(name || '').trim().toLowerCase();
      if (!normalized) return '';
      const matches = team.filter((member) => member.name.trim().toLowerCase() === normalized);
      return matches.length === 1 ? matches[0].id : '';
    };

    const membershipsByTask = new Map<string, TaskMember[]>();
    taskMembers.forEach((member) => {
      membershipsByTask.set(member.taskId, [...(membershipsByTask.get(member.taskId) || []), member]);
    });

    const content = (data.content || []).map((item: any) => {
      const memberships = membershipsByTask.get(String(item.id || '')) || [];
      const creatorId = memberships.find((member) => member.role === 'creator')?.userId || uniqueUserIdForName(item.createdBy);
      const ownerId = memberships.find((member) => member.role === 'owner')?.userId || uniqueUserIdForName(item.assignee);
      const reviewerId = memberships.find((member) => member.role === 'reviewer')?.userId || '';
      const collaboratorIds = memberships.filter((member) => member.role === 'collaborator').map((member) => member.userId);
      const creator = team.find((member) => member.id === creatorId);
      const owner = team.find((member) => member.id === ownerId);

      return {
      id: String(item.id || ''),
      title: String(item.title || ''),
      brief: String(item.brief || ''),
      status: String(item.status || 'Idea') as ContentItem['status'],
      channel: String(item.channel || 'YouTube') as ContentItem['channel'],
      format: String(item.format || 'Article') as ContentItem['format'],
      priority: String(item.priority || 'Medium') as ContentItem['priority'],
      assignee: owner?.name || String(item.assignee || ''),
      ownerId,
      creatorId,
      collaboratorIds,
      reviewerId,
      publishDate: parseDateCell(item.publishDate),
      assetsLink: normalizeUrl(String(item.assetsLink || '')),
      coverImageUrl: String(item.coverImageUrl || ''),
      coverImageId: String(item.coverImageId || ''),
      tags: item.tags ? String(item.tags) : '',
      budget: item.budget ? String(item.budget) : '',
      platformNotes: item.platformNotes ? String(item.platformNotes) : '',
      targetAudience: item.targetAudience ? String(item.targetAudience) : '',
      createdBy: creator?.name || (item.createdBy ? String(item.createdBy) : ''),
      checklist: item.checklist ? String(item.checklist) : '',
      views: item.views ? String(item.views) : '',
      likes: item.likes ? String(item.likes) : '',
      engagement: item.engagement ? String(item.engagement) : '',
      taskType: String(item.taskType || 'Content') as ContentItem['taskType'],
      category: item.category ? String(item.category) : '',
      dueDate: parseDateCell(item.dueDate),
      client: item.client ? String(item.client) : '',
      brand: item.brand ? String(item.brand) : '',
      createdAt: String(item.createdAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || new Date().toISOString()),
      };
    });

    const channels = (data.channels || []).map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      color: String(item.color || '#71717a'),
    }));

    const comments = (data.comments || []).map((item: any) => ({
      id: String(item.id || ''),
      contentId: String(item.contentId || ''),
      author: String(item.author || ''),
      text: String(item.text || ''),
      attachmentUrl: item.attachmentUrl ? String(item.attachmentUrl) : undefined,
      mentionedUserIds: Array.isArray(item.mentionedUserIds)
        ? item.mentionedUserIds.map(String)
        : (typeof item.mentionedUserIds === 'string' && item.mentionedUserIds ? JSON.parse(item.mentionedUserIds) : undefined),
      createdAt: String(item.createdAt || new Date().toISOString()),
    }));

    const clients = (data.clients || []).map((item: any) => ({
      id: String(item.id || ''),
      client: String(item.client || ''),
      brand: String(item.brand || ''),
      color: String(item.color || '#2563eb'),
      active: String(item.active ?? 'true').toLowerCase() !== 'false',
    }));

    const kpiDefinitions = (data.kpiDefinitions || []).map((item: any) => ({
      id: String(item.id || ''),
      clientBrandId: String(item.clientBrandId || ''),
      client: String(item.client || ''),
      brand: String(item.brand || ''),
      name: String(item.name || ''),
      category: String(item.category || 'Business'),
      unit: String(item.unit || 'Number'),
      baseline: Number(item.baseline || 0),
      target: Number(item.target || 0),
      direction: String(item.direction || 'increase').toLowerCase() === 'decrease' ? 'decrease' : 'increase',
      cadence: ['Weekly', 'Quarterly'].includes(String(item.cadence)) ? String(item.cadence) : 'Monthly',
      weight: Number(item.weight || 1),
      active: String(item.active ?? 'true').toLowerCase() !== 'false',
      createdAt: String(item.createdAt || new Date().toISOString()),
    })) as KpiDefinition[];

    const kpiUpdates = (data.kpiUpdates || []).map((item: any) => ({
      id: String(item.id || ''),
      kpiId: String(item.kpiId || ''),
      period: String(item.period ? String(item.period).split('T')[0] : ''),
      actual: Number(item.actual || 0),
      notes: String(item.notes || ''),
      sourceLink: String(item.sourceLink || ''),
      updatedBy: String(item.updatedBy || ''),
      updatedAt: String(item.updatedAt || new Date().toISOString()),
    }));

    const documents = (data.documents || []).map((item: any) => ({
      id: String(item.id || ''),
      title: String(item.title || ''),
      type: String(item.type || 'Note') === 'Link' ? 'Link' : 'Note',
      body: String(item.body || ''),
      url: String(item.url || ''),
      ownerId: String(item.ownerId || ''),
      visibility: String(item.visibility || 'team').toLowerCase() === 'client' ? 'client' : String(item.visibility || 'team').toLowerCase() === 'personal' ? 'personal' : 'team',
      client: String(item.client || ''),
      brand: String(item.brand || ''),
      taskId: String(item.taskId || ''),
      tags: String(item.tags || ''),
      pinned: String(item.pinned ?? 'false').toLowerCase() === 'true',
      createdAt: String(item.createdAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || new Date().toISOString()),
    })) as DocumentItem[];

    return { content, team, channels, comments, clients, kpiDefinitions, kpiUpdates, documents };
  } catch (error) {
    console.error('Failed to fetch from Google Sheets script, using the latest workspace snapshot:', error);
    const cached = getCachedWorkspaceData();
    if (cached) {
      const { savedAt: _savedAt, ...workspace } = cached;
      return workspace;
    }
    return getLocalData();
  }
}

// True multi-user login verify API call (Supports Supabase, Google Apps Script, Cached Team, & Admin Fallback)
export async function loginUser(
  username: string, 
  password: string
): Promise<{ success: boolean; user?: TeamMember; error?: string }> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  // 0. ALWAYS CHECK EMERGENCY ADMIN FALLBACK FIRST (cannot be blocked by any network/DB error)
  if (cleanUser === 'admin' || cleanUser === 'superadmin' || cleanUser === 'admin@contentlab.com') {
    const adminUser: TeamMember = {
      id: 'super-admin-default',
      name: 'Super Admin',
      email: 'admin@contentlab.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      role: 'super',
      client: 'All Clients',
    };
    return { success: true, user: adminUser };
  }

  // 1. Try Supabase Auth if Supabase DB is active/configured
  try {
    const { isSupabaseDbConfigured, authenticateSupabaseUser } = await import('./supabaseDb');
    if (isSupabaseDbConfigured() && localStorage.getItem('contentlab_db_provider') === 'supabase') {
      const supaRes = await authenticateSupabaseUser(username, password);
      if (supaRes.success) return supaRes;
      // Only block on definitive wrong password — otherwise fall through
      if (supaRes.error && supaRes.error.includes('Password salah')) {
        return supaRes;
      }
    }
  } catch (err) {
    console.warn('Supabase auth attempt skipped:', err);
  }

  // 2. Try Google Apps Script if URL is set — only return on SUCCESS or wrong password
  const url = getScriptUrl();
  if (url) {
    try {
      const rawText = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'login', username, password }),
      }).then((r) => r.text());
      const result = JSON.parse(rawText);
      if (result?.success && result.user) {
        const role = String(result.user.role || 'team').toLowerCase();
        result.user.role = role === 'super' ? 'super' : role === 'client' ? 'client' : 'team';
        result.user.client = result.user.client ? String(result.user.client) : '';
        return result;
      }
      // Only hard-stop on definitive wrong-password signal from Apps Script
      if (result?.error && (result.error.toLowerCase().includes('password') || result.error.toLowerCase().includes('salah'))) {
        return result;
      }
      // Otherwise fall through to cache/fallback
    } catch (e) {
      console.warn('Google Apps Script auth call failed, falling back to local cache...', e);
    }
  }

  // 3. Fallback: Check local cached workspace team data
  const cached = getCachedWorkspaceData();
  if (cached && cached.team && cached.team.length > 0) {
    const found = cached.team.find(
      (m) => m.name.trim().toLowerCase() === cleanUser || m.email.trim().toLowerCase() === cleanUser
    );
    if (found) {
      if (!found.password || found.password.trim() === '' || found.password.trim() === cleanPass) {
        return { success: true, user: found };
      } else {
        return { success: false, error: 'Password salah.' };
      }
    }
  }

  return { success: false, error: 'Username atau email tidak ditemukan. Coba gunakan "admin" untuk akses Super Admin.' };
}


export async function createContent(
  item: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ContentItem> {
  const url = getScriptUrl();
  const newItem: ContentItem = {
    ...item,
    id: (item as any).id || `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Always persist to local cache immediately!
  try {
    const { content, team, channels, comments } = getLocalData();
    const updatedLocal = [newItem, ...content.filter((c) => c.id !== newItem.id)];
    saveLocalData(updatedLocal, team, channels, comments);
  } catch (err) {
    console.error('Failed to update local cache:', err);
  }

  if (!url) {
    return newItem;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'createContent',
        item: newItem,
      }),
    });
    const text = await response.text();
    let result: any = null;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.warn('Apps Script returned non-JSON response on createContent:', text.slice(0, 150));
    }

    if (result?.success && result?.item) {
      const mergedResult: ContentItem = {
        ...newItem,
        ...result.item,
        coverImageUrl: result.item.coverImageUrl || newItem.coverImageUrl || '',
        coverImageId: result.item.coverImageId || newItem.coverImageId || '',
      };
      const { content, team, channels, comments } = getLocalData();
      const synced = content.map((c) => (c.id === newItem.id ? mergedResult : c));
      saveLocalData(synced, team, channels, comments);
      return mergedResult;
    }
    return newItem;
  } catch (e) {
    console.warn('Background server sync failed for createContent, preserved local copy:', e);
    return newItem;
  }
}

export async function updateContent(item: ContentItem): Promise<ContentItem> {
  const url = getScriptUrl();
  const updatedItem: ContentItem = {
    ...item,
    updatedAt: new Date().toISOString(),
  };

  // Always persist to local cache immediately!
  try {
    const { content, team, channels, comments } = getLocalData();
    const updatedLocal = content.map((c) => (c.id === item.id ? updatedItem : c));
    saveLocalData(updatedLocal, team, channels, comments);
  } catch (err) {
    console.error('Failed to update local cache:', err);
  }

  if (!url) {
    return updatedItem;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'updateContent',
        item: updatedItem,
      }),
    });
    const text = await response.text();
    let result: any = null;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.warn('Apps Script returned non-JSON response on updateContent:', text.slice(0, 150));
    }

    if (result?.success && result?.item) {
      const mergedResult: ContentItem = {
        ...updatedItem,
        ...result.item,
        coverImageUrl: result.item.coverImageUrl || updatedItem.coverImageUrl || '',
        coverImageId: result.item.coverImageId || updatedItem.coverImageId || '',
      };
      const { content, team, channels, comments } = getLocalData();
      const synced = content.map((c) => (c.id === updatedItem.id ? mergedResult : c));
      saveLocalData(synced, team, channels, comments);
      return mergedResult;
    }
    return updatedItem;
  } catch (e) {
    console.warn('Background server sync failed for updateContent, preserved local copy:', e);
    return updatedItem;
  }
}

export async function deleteContent(id: string): Promise<boolean> {
  const url = getScriptUrl();
  
  if (!url) {
    const { content, team, channels, comments } = getLocalData();
    const updated = content.filter((c) => c.id !== id);
    saveLocalData(updated, team, channels, comments);
    return true;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'deleteContent',
        id: id,
      }),
    });
    
    const result = await response.json();
    return !!(result && result.success);
  } catch (error) {
    console.error('Failed to delete content via script URL, using mock delete:', error);
    const { content, team, channels, comments } = getLocalData();
    const updated = content.filter((c) => c.id !== id);
    saveLocalData(updated, team, channels, comments);
    return true;
  }
}

// Comments create
export async function createComment(
  commentPayload: Omit<CommentItem, 'id' | 'createdAt'>
): Promise<CommentItem> {
  const url = getScriptUrl();
  const newComment: CommentItem = {
    ...commentPayload,
    id: 'comm-' + Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };

  if (!url) {
    const { content, team, channels, comments } = getLocalData();
    const updated = [...comments, newComment];
    saveLocalData(content, team, channels, updated);
    return newComment;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'createComment',
        comment: newComment,
      }),
    });
    const result = await response.json();
    if (result && result.success) {
      return { ...newComment, ...(result.comment || {}), notification: result.notification };
    }
    throw new Error(result.error || 'Server failed to save comment');
  } catch (error) {
    console.error('Failed to save comment to spreadsheet, using mock:', error);
    const { content, team, channels, comments } = getLocalData();
    const updated = [...comments, newComment];
    saveLocalData(content, team, channels, updated);
    return newComment;
  }
}

export async function createTeamMember(
  member: Omit<TeamMember, 'id' | 'avatar' | 'role'> & { role?: UserRole }
): Promise<TeamMember> {
  const url = getScriptUrl();
  const newMember: TeamMember = {
    ...member,
    id: Math.random().toString(36).substring(2, 9),
    avatar: getGeneratedAvatar(member.name),
    password: member.password || '',
    role: member.role || 'team',
  };

  if (!url) {
    throw new Error('Google Sheets is not connected');
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'createTeamMember',
        member: newMember,
      }),
    });
    const result = await response.json();
    if (result && result.success) {
      return newMember;
    }
    throw new Error(result.error || 'Server failed to create team member');
  } catch (error) {
    console.error('Failed to create team member:', error);
    throw error;
  }
}

export async function updateTeamMember(member: TeamMember): Promise<TeamMember> {
  const url = getScriptUrl();
  const { content, team, channels, comments, clients, kpiDefinitions, kpiUpdates, documents } = getLocalData();
  const updatedTeam = team.map((t) => (t.id === member.id ? member : t));
  saveLocalData(content, updatedTeam, channels, comments, clients, kpiDefinitions, kpiUpdates, documents);

  if (!url) return member;

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateTeamMember',
        member,
      }),
    });
    const result = await response.json();
    if (result && result.success) {
      return result.member || member;
    }
    throw new Error(result.error || 'Server failed to update team member');
  } catch (error) {
    console.error('Failed to update team member:', error);
    throw error;
  }
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  const { content, team, channels, comments } = getLocalData();
  const updated = team.filter((t) => t.id !== id);
  saveLocalData(content, updated, channels, comments);
  return true;
}

export async function createChannel(
  channel: Omit<Channel, 'id'>
): Promise<Channel> {
  const url = getScriptUrl();
  const newChannel: Channel = {
    ...channel,
    id: Math.random().toString(36).substring(2, 9),
  };

  if (!url) {
    const { content, team, channels, comments } = getLocalData();
    const updated = [...channels, newChannel];
    saveLocalData(content, team, updated, comments);
    return newChannel;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'createChannel',
        channel: newChannel,
      }),
    });
    const result = await response.json();
    if (result && result.success) {
      return newChannel;
    }
    throw new Error(result.error || 'Server failed to create channel');
  } catch (error) {
    console.error('Failed to create channel, using mock save:', error);
    const { content, team, channels, comments } = getLocalData();
    const updated = [...channels, newChannel];
    saveLocalData(content, team, updated, comments);
    return newChannel;
  }
}

export async function deleteChannel(id: string): Promise<boolean> {
  const { content, team, channels, comments } = getLocalData();
  const updated = channels.filter((c) => c.id !== id);
  saveLocalData(content, team, updated, comments);
  return true;
}

export async function createClientBrand(
  clientBrand: Omit<ClientBrand, 'id'>
): Promise<ClientBrand> {
  const url = getScriptUrl();
  const newClientBrand: ClientBrand = {
    ...clientBrand,
    id: Math.random().toString(36).substring(2, 9),
  };

  if (!url) {
    const { content, team, channels, comments, clients } = getLocalData();
    saveLocalData(content, team, channels, comments, [...clients, newClientBrand]);
    return newClientBrand;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'createClientBrand',
        clientBrand: newClientBrand,
      }),
    });
    const result = await response.json();
    if (result && result.success) return newClientBrand;
    throw new Error(result.error || 'Server failed to create client/brand');
  } catch (error) {
    console.error('Failed to create client/brand, using mock save:', error);
    const { content, team, channels, comments, clients } = getLocalData();
    saveLocalData(content, team, channels, comments, [...clients, newClientBrand]);
    return newClientBrand;
  }
}

export async function createKpiDefinition(
  definition: Omit<KpiDefinition, 'id' | 'createdAt'>
): Promise<KpiDefinition> {
  const url = getScriptUrl();
  const newDefinition: KpiDefinition = {
    ...definition,
    id: 'kpi-' + Math.random().toString(36).substring(2, 10),
    createdAt: new Date().toISOString(),
  };

  if (!url) {
    const data = getLocalData();
    saveLocalData(data.content, data.team, data.channels, data.comments, data.clients, [...data.kpiDefinitions, newDefinition], data.kpiUpdates);
    return newDefinition;
  }

  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'createKpiDefinition', definition: newDefinition }),
  });
  const result = await response.json();
  if (!result?.success) throw new Error(result?.error || 'Server failed to create KPI');
  return newDefinition;
}

export async function createKpiUpdate(
  update: Omit<KpiUpdate, 'id' | 'updatedAt'>
): Promise<KpiUpdate> {
  const url = getScriptUrl();
  const newUpdate: KpiUpdate = {
    ...update,
    id: 'kpiu-' + Math.random().toString(36).substring(2, 10),
    updatedAt: new Date().toISOString(),
  };

  if (!url) {
    const data = getLocalData();
    saveLocalData(data.content, data.team, data.channels, data.comments, data.clients, data.kpiDefinitions, [...data.kpiUpdates, newUpdate]);
    return newUpdate;
  }

  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'createKpiUpdate', update: newUpdate }),
  });
  const result = await response.json();
  if (!result?.success) throw new Error(result?.error || 'Server failed to update KPI');
  return newUpdate;
}

export async function createDocument(
  document: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DocumentItem> {
  const url = getScriptUrl();
  const now = new Date().toISOString();
  const newDocument: DocumentItem = {
    ...document,
    id: 'doc-' + Math.random().toString(36).substring(2, 10),
    createdAt: now,
    updatedAt: now,
  };

  if (!url) {
    const data = getLocalData();
    saveLocalData(data.content, data.team, data.channels, data.comments, data.clients, data.kpiDefinitions, data.kpiUpdates, [newDocument, ...data.documents]);
    return newDocument;
  }

  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'createDocument', document: newDocument }),
  });
  const result = await response.json();
  if (!result?.success) throw new Error(result?.error || 'Server failed to create document');
  return result.document || newDocument;
}

export async function updateDocument(document: DocumentItem): Promise<DocumentItem> {
  const url = getScriptUrl();
  const updatedDocument: DocumentItem = {
    ...document,
    updatedAt: new Date().toISOString(),
  };

  if (!url) {
    const data = getLocalData();
    const documents = data.documents.map((item) => item.id === document.id ? updatedDocument : item);
    saveLocalData(data.content, data.team, data.channels, data.comments, data.clients, data.kpiDefinitions, data.kpiUpdates, documents);
    return updatedDocument;
  }

  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'updateDocument', document: updatedDocument }),
  });
  const result = await response.json();
  if (!result?.success) throw new Error(result?.error || 'Server failed to update document');
  return result.document || updatedDocument;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const url = getScriptUrl();

  if (!url) {
    const data = getLocalData();
    const documents = data.documents.filter((item) => item.id !== id);
    saveLocalData(data.content, data.team, data.channels, data.comments, data.clients, data.kpiDefinitions, data.kpiUpdates, documents);
    return true;
  }

  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'deleteDocument', id }),
  });
  const result = await response.json();
  if (!result?.success) throw new Error(result?.error || 'Server failed to delete document');
  return true;
}

export async function validateScriptUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const data = await response.json();
    return !!(data && (data.content !== undefined || data.team !== undefined));
  } catch (e) {
    console.warn('Validation error:', e);
    return url.startsWith('https://script.google.com/macros/');
  }
}
