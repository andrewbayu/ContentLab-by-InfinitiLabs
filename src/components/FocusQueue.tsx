import { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Search, SlidersHorizontal, Target } from 'lucide-react';
import type { ContentItem } from '../services/sheets';
import { buildFocusQueue, matchesFocusFilter } from '../utils/focusQueue';
import type { FocusFilter } from '../utils/focusQueue';
import '../styles/focus.css';

const filters: { id: FocusFilter; label: string }[] = [
  { id: 'all', label: 'All active' }, { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' }, { id: 'review', label: 'In review' },
  { id: 'unplanned', label: 'Unplanned' },
];

export function FocusQueue({ items, today, onEditItem, personal }: {
  items: ContentItem[]; today: string; onEditItem: (item: ContentItem) => void; personal: boolean;
}) {
  const [filter, setFilter] = useState<FocusFilter>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const queue = useMemo(() => buildFocusQueue(items, today), [items, today]);
  const results = useMemo(() => queue.filter(entry => matchesFocusFilter(entry, filter) &&
    [entry.item.title, entry.item.client, entry.item.brand, entry.item.assignee, entry.item.channel]
      .join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [queue, filter, query]);
  const due = queue.filter(entry => entry.days !== null && entry.days <= 0).length;

  return <section className="focus-panel" aria-labelledby="focus-title">
    <div className="focus-heading">
      <div>
        <span className="focus-eyebrow"><Target size={14} aria-hidden="true" /> YOUR NEXT MOVE</span>
        <h2 id="focus-title">Less noise. More progress.</h2>
        <p>{personal ? 'Your work' : 'Studio work'}, ordered by what needs attention. Open a task to move it forward.</p>
      </div>
      <div className="focus-pulse"><strong>{due}</strong><span>due today<br />or overdue</span></div>
    </div>
    <div className="focus-toolbar">
      <div className="focus-filters" role="group" aria-label="Filter focus queue">
        {filters.map(({ id, label }) => <button key={id} type="button" aria-pressed={filter === id}
          onClick={() => { setFilter(id); setLimit(5); }}>
          {label}{' '}<span>{queue.filter(entry => matchesFocusFilter(entry, id)).length}</span>
        </button>)}
      </div>
      <label className="focus-search"><Search size={16} aria-hidden="true" />
        <input type="search" aria-label="Search focus queue" placeholder="Find a task, brand, or person…" value={query}
          onChange={event => { setQuery(event.target.value); setLimit(5); }} />
      </label>
    </div>
    <div className="focus-list">
      {results.slice(0, limit).map(({ item, reason, tone, checklist }, index) => <button type="button"
        className="focus-row" key={item.id} onClick={() => onEditItem(item)}>
        <span className="focus-rank">{String(index + 1).padStart(2, '0')}</span>
        <span className="focus-task"><strong>{item.title}</strong><span>{[item.brand || item.client, item.assignee || 'No owner', item.status].filter(Boolean).join(' · ')}</span></span>
        {checklist.total > 0 && <span className="focus-checklist" aria-label={`${checklist.done} of ${checklist.total} checklist items complete`}>
          <span className="focus-progress"><span style={{ width: `${checklist.done / checklist.total * 100}%` }} /></span>
          {checklist.done}/{checklist.total}
        </span>}
        <span className={`focus-reason focus-${tone}`}>{reason}</span><ArrowUpRight size={17} aria-hidden="true" />
      </button>)}
      {results.length === 0 && <div className="focus-empty">
        {queue.length === 0 ? <CheckCircle2 size={28} /> : <SlidersHorizontal size={28} />}
        <strong>{queue.length === 0 ? 'A little breathing room.' : 'No tasks match this view.'}</strong>
        <p>{queue.length === 0 ? 'No active tasks in this scope. Your next great idea starts here.' : 'Try another filter or a shorter search.'}</p>
        {queue.length > 0 && <button className="btn btn-secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Reset filters</button>}
      </div>}
    </div>
    <div className="focus-footer"><span role="status">Showing {Math.min(limit, results.length)} of {results.length} active tasks</span>
      {results.length > limit && <button type="button" onClick={() => setLimit(value => value + 10)}>Show more</button>}
      <span>Deadlines first. Then reviews and urgency.</span>
    </div>
  </section>;
}
