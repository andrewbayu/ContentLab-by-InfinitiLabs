import { describe, it, expect } from 'vitest';
import { buildFocusQueue, matchesFocusFilter } from '../src/utils/focusQueue';
import { localDateKey, dayDistance } from '../src/utils/dates';
import { task } from './fixtures';

const today = '2026-09-07';
describe('Focus queue', () => {
  it('puts deadlines before reviews and urgency without mutating source data', () => {
    const items = [task({ id: 'urgent', priority: 'Urgent', publishDate: '2026-09-20' }),
      task({ id: 'review', status: 'Review/Editing', publishDate: '2026-09-10' }),
      task({ id: 'today' }), task({ id: 'late', publishDate: '2026-09-06' }),
      task({ id: 'done', status: 'Done' }), task({ id: 'published', status: 'Published' })];
    const before = structuredClone(items);
    expect(buildFocusQueue(items, today).map(entry => entry.item.id)).toEqual(['late', 'today', 'review', 'urgent']);
    expect(items).toEqual(before);
  });
  it('uses dueDate for general tasks and preserves scheduled tasks as unfinished', () => {
    const queue = buildFocusQueue([task({ taskType: 'General', dueDate: '2026-09-06', publishDate: '2027-01-01' }), task({ id: 'scheduled', status: 'Scheduled' })], today);
    expect(queue[0].reason).toBe('1d overdue');
    expect(queue[1].reason).toBe('Due today');
  });
  it('treats absent or invalid deadlines as unplanned', () => {
    for (const publishDate of ['', '2026-02-30', 'nonsense']) {
      const entry = buildFocusQueue([task({ publishDate })], today)[0];
      expect(matchesFocusFilter(entry, 'unplanned')).toBe(true);
      expect(matchesFocusFilter(entry, 'overdue')).toBe(false);
    }
  });
  it('handles malformed legacy checklists without crashing', () => {
    for (const checklist of ['null', '{}', 'oops', '[null, 42]']) {
      expect(buildFocusQueue([task({ checklist })], today)[0].checklist).toEqual({ done: 0, total: 0 });
    }
    expect(buildFocusQueue([task({ checklist: JSON.stringify([{ label: 'Draft', done: true }, { label: 'Review', done: false }]) })], today)[0].checklist).toEqual({ done: 1, total: 2 });
  });
  it('allows overdue reviews to appear in both relevant filters', () => {
    const entry = buildFocusQueue([task({ status: 'Review/Editing', publishDate: '2026-09-01' })], today)[0];
    expect(matchesFocusFilter(entry, 'review')).toBe(true);
    expect(matchesFocusFilter(entry, 'overdue')).toBe(true);
    expect(matchesFocusFilter(entry, 'today')).toBe(false);
  });
});
describe('Calendar dates', () => {
  it('uses local midnight instead of slicing a UTC timestamp', () => {
    const date = new Date(2026, 8, 7, 0, 15);
    expect(localDateKey(date)).toBe(today);
  });
  it('counts calendar days across month, leap-year and DST boundaries', () => {
    expect(dayDistance('2024-02-28', '2024-03-01')).toBe(2);
    expect(dayDistance('2026-03-07', '2026-03-09')).toBe(2);
    expect(dayDistance('2026-12-31', '2027-01-01')).toBe(1);
  });
});
