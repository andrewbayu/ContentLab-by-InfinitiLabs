import type { ContentItem } from '../services/sheets';
import { dayDistance } from './dates.ts';

export type FocusFilter = 'all' | 'overdue' | 'today' | 'review' | 'unplanned';
export interface FocusEntry {
  item: ContentItem;
  days: number | null;
  reason: string;
  tone: 'danger' | 'warning' | 'review' | 'neutral';
  rank: number;
  checklist: { done: number; total: number };
}

export function buildFocusQueue(items: ContentItem[], today: string): FocusEntry[] {
  return items.filter(item => item.status !== 'Done' && item.status !== 'Published').map(item => {
    const date = item.taskType === 'General' ? item.dueDate : item.publishDate;
    const days = date ? dayDistance(today, date) : null;
    let reason = days === null ? 'Set a deadline' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
    let tone: FocusEntry['tone'] = 'neutral';
    let rank = 5;
    if (days !== null && days < 0) { reason = `${Math.abs(days)}d overdue`; tone = 'danger'; rank = 0; }
    else if (days === 0) { reason = 'Due today'; tone = 'warning'; rank = 1; }
    else if (item.status === 'Review/Editing') { reason = 'Ready for review'; tone = 'review'; rank = 2; }
    else if (item.priority === 'Urgent') { reason = 'Urgent priority'; tone = 'danger'; rank = 3; }
    else if (days !== null && days <= 7) { rank = 4; }
    else if (days === null) { rank = 6; }
    let checklist = { done: 0, total: 0 };
    try {
      const raw: unknown = JSON.parse(item.checklist || '[]');
      if (Array.isArray(raw)) {
        const valid = raw.filter(sub => sub && typeof sub === 'object' && typeof sub.label === 'string');
        checklist = { done: valid.filter(sub => sub.done === true).length, total: valid.length };
      }
    } catch { /* Legacy checklist data may be malformed. */ }
    return { item, days, reason, tone, rank, checklist };
  }).sort((a, b) => a.rank - b.rank || (a.days ?? Infinity) - (b.days ?? Infinity) ||
    priority(b.item.priority) - priority(a.item.priority) || a.item.title.localeCompare(b.item.title) || a.item.id.localeCompare(b.item.id));
}

function priority(value: ContentItem['priority']) {
  return { Urgent: 4, High: 3, Medium: 2, Low: 1 }[value] || 0;
}

export function matchesFocusFilter(entry: FocusEntry, filter: FocusFilter): boolean {
  if (filter === 'overdue') return entry.days !== null && entry.days < 0;
  if (filter === 'today') return entry.days === 0;
  if (filter === 'review') return entry.item.status === 'Review/Editing';
  if (filter === 'unplanned') return entry.days === null;
  return true;
}
