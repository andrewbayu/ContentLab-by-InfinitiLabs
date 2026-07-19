export interface ContentItem {
  id: string;
  title: string;
  brief: string;
  status: 'Idea' | 'Scripting/Writing' | 'Production/Design' | 'Review/Editing' | 'Scheduled' | 'Published';
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
  // New upgraded features variables
  checklist?: string;     // JSON string representing subtask assets
  views?: string;         // performance view counts
  likes?: string;         // performance likes
  engagement?: string;    // performance engagement (comments/shares)
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
}

export interface Channel {
  id: string;
  name: string;
  color: string;
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
const MOCK_TEAM_KEY = 'contentlab_mock_team';
const MOCK_CHANNELS_KEY = 'contentlab_mock_channels';
const MOCK_COMMENTS_KEY = 'contentlab_mock_comments';
const VARIABLES_CONFIG_KEY = 'contentlab_variables_config';
const CUSTOM_TAGS_KEY = 'contentlab_custom_tags';
const ACTIVE_USER_KEY = 'contentlab_active_user';

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

// Initial Mock Data
const INITIAL_MOCK_TEAM: TeamMember[] = [
  { id: 't1', name: 'Andi Pratama', email: 'andi@contentlab.io', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' },
  { id: 't2', name: 'Siti Rahma', email: 'siti@contentlab.io', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
  { id: 't3', name: 'Budi Santoso', email: 'budi@contentlab.io', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80' },
];

const INITIAL_MOCK_CHANNELS: Channel[] = [
  { id: 'ch1', name: 'YouTube', color: '#2563eb' },
  { id: 'ch2', name: 'Instagram', color: '#db2777' },
  { id: 'ch3', name: 'TikTok', color: '#000000' },
  { id: 'ch4', name: 'LinkedIn', color: '#0a66c2' },
  { id: 'ch5', name: 'Blog', color: '#059669' },
  { id: 'ch6', name: 'Newsletter', color: '#d97706' },
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

// Active User LocalStorage helper
export function getActiveUser(): string {
  return localStorage.getItem(ACTIVE_USER_KEY) || '';
}

export function saveActiveUser(username: string): void {
  if (username) {
    localStorage.setItem(ACTIVE_USER_KEY, username);
  } else {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
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

function getLocalData(): { content: ContentItem[]; team: TeamMember[]; channels: Channel[]; comments: CommentItem[] } {
  let content = INITIAL_MOCK_CONTENT;
  let team = INITIAL_MOCK_TEAM;
  let channels = INITIAL_MOCK_CHANNELS;
  let comments = INITIAL_MOCK_COMMENTS;

  const savedContent = localStorage.getItem(MOCK_CONTENT_KEY);
  const savedTeam = localStorage.getItem(MOCK_TEAM_KEY);
  const savedChannels = localStorage.getItem(MOCK_CHANNELS_KEY);
  const savedComments = localStorage.getItem(MOCK_COMMENTS_KEY);

  if (savedContent) {
    content = JSON.parse(savedContent);
  } else {
    localStorage.setItem(MOCK_CONTENT_KEY, JSON.stringify(content));
  }

  if (savedTeam) {
    team = JSON.parse(savedTeam);
  } else {
    localStorage.setItem(MOCK_TEAM_KEY, JSON.stringify(team));
  }

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

  return { content, team, channels, comments };
}

function saveLocalData(content: ContentItem[], team?: TeamMember[], channels?: Channel[], comments?: CommentItem[]) {
  localStorage.setItem(MOCK_CONTENT_KEY, JSON.stringify(content));
  if (team) localStorage.setItem(MOCK_TEAM_KEY, JSON.stringify(team));
  if (channels) localStorage.setItem(MOCK_CHANNELS_KEY, JSON.stringify(channels));
  if (comments) localStorage.setItem(MOCK_COMMENTS_KEY, JSON.stringify(comments));
}

export async function fetchData(): Promise<{ content: ContentItem[]; team: TeamMember[]; channels: Channel[]; comments: CommentItem[] }> {
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
      createdAt: String(item.createdAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || new Date().toISOString()),
    }));

    const team = (data.team || []).map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      email: String(item.email || ''),
      avatar: String(item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'),
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

    return { content, team, channels, comments };
  } catch (error) {
    console.error('Failed to fetch from Google Sheets script, falling back to local mock data:', error);
    return getLocalData();
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
  member: Omit<TeamMember, 'id' | 'avatar'>
): Promise<TeamMember> {
  const url = getScriptUrl();
  const newMember: TeamMember = {
    ...member,
    id: Math.random().toString(36).substring(2, 9),
    avatar: `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 900000)}?auto=format&fit=crop&w=150&h=150&q=80`,
  };

  if (!url) {
    const { content, team, channels, comments } = getLocalData();
    const updated = [...team, newMember];
    saveLocalData(content, updated, channels, comments);
    return newMember;
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
    console.error('Failed to create team member, using mock save:', error);
    const { content, team, channels, comments } = getLocalData();
    const updated = [...team, newMember];
    saveLocalData(content, updated, channels, comments);
    return newMember;
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
