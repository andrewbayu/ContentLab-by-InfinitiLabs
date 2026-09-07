import type { ContentItem, WorkspaceData, TeamMember } from '../src/services/sheets';

export const user: TeamMember = { id: 'alice', name: 'Alice', email: 'alice@example.test', avatar: '', role: 'super' };
export const task = (override: Partial<ContentItem> = {}): ContentItem => ({
  id: 'task-1', title: 'Launch story', brief: '', status: 'Production/Design', channel: 'Instagram',
  format: 'Carousel', priority: 'Medium', assignee: 'Alice', ownerId: 'alice', publishDate: '2026-09-07',
  assetsLink: '', taskType: 'Content', createdAt: '', updatedAt: '', brand: 'Studio', ...override,
});
export const workspace = (content: ContentItem[] = [], member = user): WorkspaceData => ({
  content, team: [member], channels: [], comments: [], clients: [], kpiDefinitions: [], kpiUpdates: [], documents: [], resources: [], notifications: [],
});
