import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { clearCachedWorkspaceData, getCachedWorkspaceData, saveCachedWorkspaceData, loginUser } from '../src/services/sheets';
import userEvent from '@testing-library/user-event';
import { task, user, workspace } from './fixtures';
import type { TeamMember } from '../src/services/sheets';

const mocks = vi.hoisted(() => ({
  listener: null as null | ((user: TeamMember | null) => void),
  fetch: vi.fn(), auth: vi.fn(), authenticate: vi.fn(), update: vi.fn(),
}));
vi.mock('../src/services/supabase', () => ({ supabase: null }));
vi.mock('../src/services/supabaseDb', async importOriginal => ({
  ...await importOriginal<typeof import('../src/services/supabaseDb')>(),
  getSupabaseAuthUser: mocks.auth,
  updateSupabaseContent: mocks.update,
  authenticateSupabaseUser: mocks.authenticate,
  fetchSupabaseInitialData: mocks.fetch,
  subscribeToSupabaseRealtime: () => () => {},
  subscribeToSupabaseAuth: (listener: (user: TeamMember | null) => void) => { mocks.listener = listener; return () => {}; },
}));
vi.mock('../src/components/DashboardView', () => ({ DashboardView: ({ items }: { items: { id: string; title: string }[] }) => <div>{items.map(item => <p key={item.id}>{item.title}</p>)}</div> }));

vi.mock('../src/components/KanbanBoard', () => ({ KanbanBoard: ({ onMoveItem }: { onMoveItem: (id: string, status: string) => void }) => <button onClick={() => onMoveItem('task-1', 'Scheduled')}>Move test task</button> }));

beforeEach(() => { localStorage.clear(); clearCachedWorkspaceData(); mocks.fetch.mockReset(); mocks.auth.mockResolvedValue(user); mocks.authenticate.mockReset(); });
afterEach(cleanup);
it('purges persistent snapshots and clears the in-memory snapshot at the session boundary', () => {
  localStorage.setItem('contentlab_workspace_cache_v1', JSON.stringify(workspace([task()])));
  expect(getCachedWorkspaceData()).toBeNull();
  expect(localStorage.getItem('contentlab_workspace_cache_v1')).toBeNull();
  saveCachedWorkspaceData(workspace([task()], { ...user, password: 'must-not-persist' }));
  expect(getCachedWorkspaceData()?.team[0].password).toBeUndefined();
  expect(localStorage.getItem('contentlab_workspace_cache_v1')).toBeNull();
  clearCachedWorkspaceData(); expect(getCachedWorkspaceData()).toBeNull();
});
it('does not fail a successful fetch when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(() => { getCachedWorkspaceData(); saveCachedWorkspaceData(workspace()); clearCachedWorkspaceData(); }).not.toThrow();
});
it('requires real authentication for the retired emergency admin username', async () => {
  mocks.authenticate.mockResolvedValue({ success: false });
  expect(await loginUser('admin', 'anything')).toEqual({ success: false });
  expect(mocks.authenticate).toHaveBeenCalledWith('admin', 'anything');
});
it('ignores a previous user response after switching accounts', async () => {
  let resolveOld!: (data: ReturnType<typeof workspace>) => void;
  mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  render(<App />);
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
  const bob = { ...user, id: 'bob', name: 'Bob' };
  mocks.fetch.mockResolvedValue(workspace([task({ title: 'Bob private task', ownerId: 'bob' })], bob));
  await act(async () => { mocks.listener?.(bob); });
  expect(await screen.findByText('Bob private task')).toBeTruthy();
  await act(async () => { resolveOld(workspace([task({ title: 'Alice private task' })])); });
  expect(screen.queryByText('Alice private task')).toBeNull();
  expect(getCachedWorkspaceData()?.content[0].title).toBe('Bob private task');
});
it('clears loaded content and cached notifications when Auth signs out', async () => {
  mocks.fetch.mockResolvedValue(workspace([task()]));
  render(<App />); expect(await screen.findByText('Launch story')).toBeTruthy();
  await act(async () => { mocks.listener?.(null); });
  expect(screen.queryByText('Launch story')).toBeNull();
  expect(getCachedWorkspaceData()).toBeNull();
});

it('does not let a failed write from the old session restore its task list', async () => {
  const clicker = userEvent.setup();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  let rejectWrite!: (error: Error) => void;
  mocks.update.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
  mocks.fetch.mockResolvedValue(workspace([task({ title: 'Alice private task' })]));
  render(<App />); await screen.findByText('Alice private task');
  await clicker.click(screen.getByRole('button', { name: 'Kanban Board' }));
  await clicker.click(await screen.findByRole('button', { name: 'Move test task' }));
  const bob = { ...user, id: 'bob', name: 'Bob' };
  mocks.fetch.mockResolvedValue(workspace([task({ title: 'Bob private task', ownerId: 'bob' })], bob));
  await act(async () => { mocks.listener?.(bob); });
  await screen.findByText('Bob private task');
  await act(async () => { rejectWrite(new Error('Late write failed')); });
  expect(screen.queryByText('Alice private task')).toBeNull();
  expect(screen.getByText('Bob private task')).toBeTruthy();
});
