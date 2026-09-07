// Test fixture only. Not an application route and not included in the production build.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardView } from '../../src/components/DashboardView';
import { AppShell } from '../../src/components/AppShell';
import { getVariablesConfig } from '../../src/services/sheets';
import { task, user } from '../fixtures';
import { localDateKey } from '../../src/utils/dates';
import '../../src/index.css';

const today = new Date();
const date = (delta: number) => { const d = new Date(today); d.setDate(d.getDate() + delta); return localDateKey(d); };
const items = [
  task({ id: '1', title: 'The story behind your next transformation', brand: 'Akasia', publishDate: date(-2), checklist: '[{"id":"draft","label":"Draft","done":true},{"id":"design","label":"Design","done":false}]' }),
  task({ id: '2', title: 'September editorial — final carousel', brand: 'InfinitiLabs', publishDate: date(0), status: 'Review/Editing' }),
  task({ id: '3', title: 'Five questions your audience is already asking', brand: 'Studio', publishDate: date(3), status: 'Review/Editing' }),
  task({ id: '4', title: 'Turn the client interview into a story series', brand: 'Akasia', publishDate: date(4), priority: 'Urgent' }),
  task({ id: '5', title: 'A better brief for the next big idea', brand: 'InfinitiLabs', publishDate: '', status: 'Idea' }),
  task({ id: '6', title: 'Team planning and creative handover', brand: 'Studio', taskType: 'General', status: 'To Do', dueDate: date(7) }),
];
export function Preview() {
  const [selected, select] = useState('');
  return <AppShell activeTab="dashboard" setActiveTab={() => {}} onOpenCreateModal={() => select('New task')}
    isMock={false} currentUser={user} onLogout={() => {}} clients={[]} scopeKey="all" onScopeChange={() => {}}
    syncStatus="saved" lastSyncedAt={null} onRefresh={() => {}}>
    {selected && <div role="status" style={{ padding: 16 }}>Opened: {selected}</div>}
    <DashboardView items={items} currentUser={user} channels={[]} variablesConfig={getVariablesConfig()}
      onEditItem={item => select(item.title)} notifications={[]} onOpenNotification={async () => {}} />
  </AppShell>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
