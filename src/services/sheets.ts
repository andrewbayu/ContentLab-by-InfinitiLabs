export type TaskType = 'Content' | 'General';
export type UserRole = 'super' | 'team';
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
  publishDate: string; // YYYY-MM-DD
  assetsLink: string;
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
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string; // New field for multi-user authentication
  role: UserRole;
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

export interface VariablesConfig {
  brief: boolean;
  publishDate: boolean;
  tags: boolean;
  budget: boolean;
  platformNotes: boolean;
  targetAudience: boolean;
}

const SCRIPT_URL_KEY = 'contentlab_google_sheets_url';
const MOCK_CONTENT_KEY = 'contentlab_mock_content';
const MOCK_CHANNELS_KEY = 'contentlab_mock_channels';
const MOCK_COMMENTS_KEY = 'contentlab_mock_comments';
const MOCK_CLIENTS_KEY = 'contentlab_mock_clients';
const VARIABLES_CONFIG_KEY = 'contentlab_variables_config';
const CUSTOM_TAGS_KEY = 'contentlab_custom_tags';

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
  return localStorage.getItem(SCRIPT_URL_KEY);
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
export function getCustomTags(): string[] {
  const saved = localStorage.getItem(CUSTOM_TAGS_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(DEFAULT_TAGS));
  return DEFAULT_TAGS;
}

export function saveCustomTags(tags: string[]): void {
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(tags));
}

function getLocalData(): { content: ContentItem[]; team: TeamMember[]; channels: Channel[]; comments: CommentItem[]; clients: ClientBrand[] } {
  let content = INITIAL_MOCK_CONTENT;
  let team = INITIAL_MOCK_TEAM;
  let channels = INITIAL_MOCK_CHANNELS;
  let comments = INITIAL_MOCK_COMMENTS;
  let clients = INITIAL_MOCK_CLIENTS;

  const savedContent = localStorage.getItem(MOCK_CONTENT_KEY);
  const savedChannels = localStorage.getItem(MOCK_CHANNELS_KEY);
  const savedComments = localStorage.getItem(MOCK_COMMENTS_KEY);
  const savedClients = localStorage.getItem(MOCK_CLIENTS_KEY);

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

  return { content, team, channels, comments, clients };
}

function saveLocalData(content: ContentItem[], _team?: TeamMember[], channels?: Channel[], comments?: CommentItem[], clients?: ClientBrand[]) {
  localStorage.setItem(MOCK_CONTENT_KEY, JSON.stringify(content));
  if (channels) localStorage.setItem(MOCK_CHANNELS_KEY, JSON.stringify(channels));
  if (comments) localStorage.setItem(MOCK_COMMENTS_KEY, JSON.stringify(comments));
  if (clients) localStorage.setItem(MOCK_CLIENTS_KEY, JSON.stringify(clients));
}

export async function fetchData(): Promise<{ content: ContentItem[]; team: TeamMember[]; channels: Channel[]; comments: CommentItem[]; clients: ClientBrand[] }> {
  const url = getScriptUrl();
  if (!url) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return getLocalData();
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API fetch failed');
    const data = await response.json();
    
    const content = (data.content || []).map((item: any) => ({
      id: String(item.id || ''),
      title: String(item.title || ''),
      brief: String(item.brief || ''),
      status: String(item.status || 'Idea') as ContentItem['status'],
      channel: String(item.channel || 'YouTube') as ContentItem['channel'],
      format: String(item.format || 'Article') as ContentItem['format'],
      priority: String(item.priority || 'Medium') as ContentItem['priority'],
      assignee: String(item.assignee || ''),
      publishDate: String(item.publishDate ? item.publishDate.split('T')[0] : ''),
      assetsLink: String(item.assetsLink || ''),
      tags: item.tags ? String(item.tags) : '',
      budget: item.budget ? String(item.budget) : '',
      platformNotes: item.platformNotes ? String(item.platformNotes) : '',
      targetAudience: item.targetAudience ? String(item.targetAudience) : '',
      createdBy: item.createdBy ? String(item.createdBy) : '',
      checklist: item.checklist ? String(item.checklist) : '',
      views: item.views ? String(item.views) : '',
      likes: item.likes ? String(item.likes) : '',
      engagement: item.engagement ? String(item.engagement) : '',
      taskType: String(item.taskType || 'Content') as ContentItem['taskType'],
      category: item.category ? String(item.category) : '',
      dueDate: String(item.dueDate ? item.dueDate.split('T')[0] : ''),
      client: item.client ? String(item.client) : '',
      brand: item.brand ? String(item.brand) : '',
      createdAt: String(item.createdAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || new Date().toISOString()),
    }));

    const team = (data.team || []).map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      email: String(item.email || ''),
      avatar: String(item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'),
      password: item.password ? String(item.password) : '',
      role: String(item.role || 'team').toLowerCase() === 'super' ? 'super' : 'team',
    }));

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
      createdAt: String(item.createdAt || new Date().toISOString()),
    }));

    const clients = (data.clients || []).map((item: any) => ({
      id: String(item.id || ''),
      client: String(item.client || ''),
      brand: String(item.brand || ''),
      color: String(item.color || '#2563eb'),
      active: String(item.active ?? 'true').toLowerCase() !== 'false',
    }));

    return { content, team, channels, comments, clients };
  } catch (error) {
    console.error('Failed to fetch from Google Sheets script, falling back to local mock data:', error);
    return getLocalData();
  }
}

// True multi-user login verify API call
export async function loginUser(
  username: string, 
  password: string
): Promise<{ success: boolean; user?: TeamMember; error?: string }> {
  const url = getScriptUrl();

  if (!url) {
    return { success: false, error: 'Workspace belum terhubung ke Google Sheets.' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'login',
        username,
        password
      }),
    });
    const result = await response.json();
    if (result?.success && result.user) {
      result.user.role = String(result.user.role || 'team').toLowerCase() === 'super' ? 'super' : 'team';
    }
    return result;
  } catch (e) {
    console.error('Failed to authenticate with spreadsheet script:', e);
    return { success: false, error: 'Gagal menghubungi server Google Sheets.' };
  }
}

export async function createContent(
  item: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ContentItem> {
  const url = getScriptUrl();
  const newItem: ContentItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!url) {
    const { content, team, channels, comments } = getLocalData();
    const updated = [newItem, ...content];
    saveLocalData(updated, team, channels, comments);
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
    
    const result = await response.json();
    if (result && result.success) {
      return newItem;
    }
    throw new Error(result.error || 'Server failed to create content');
  } catch (error) {
    console.error('Failed to create content via script URL, using mock save:', error);
    const { content, team, channels, comments } = getLocalData();
    const updated = [newItem, ...content];
    saveLocalData(updated, team, channels, comments);
    return newItem;
  }
}

export async function updateContent(item: ContentItem): Promise<ContentItem> {
  const url = getScriptUrl();
  const updatedItem = {
    ...item,
    updatedAt: new Date().toISOString(),
  };

  if (!url) {
    const { content, team, channels, comments } = getLocalData();
    const updated = content.map((c) => (c.id === item.id ? updatedItem : c));
    saveLocalData(updated, team, channels, comments);
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
    
    const result = await response.json();
    if (result && result.success) {
      return updatedItem;
    }
    throw new Error(result.error || 'Server failed to update content');
  } catch (error) {
    console.error('Failed to update content via script URL, using mock save:', error);
    const { content, team, channels, comments } = getLocalData();
    const updated = content.map((c) => (c.id === item.id ? updatedItem : c));
    saveLocalData(updated, team, channels, comments);
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
      return newComment;
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
    avatar: `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 900000)}?auto=format&fit=crop&w=150&h=150&q=80`,
    password: '',
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
