import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FocusQueue } from '../src/components/FocusQueue';
import { task } from './fixtures';

afterEach(cleanup);
it('searches brands, filters dates, resets empty results, and opens the selected task by keyboard', async () => {
  const user = userEvent.setup(); const onEdit = vi.fn();
  const late = task({ id: 'late', title: 'Late campaign', publishDate: '2026-09-06', brand: 'Akasia' });
  render(<FocusQueue items={[late, task()]} today="2026-09-07" onEditItem={onEdit} personal />);
  await user.click(screen.getByRole('button', { name: 'Overdue 1' }));
  expect(screen.queryByText('Launch story')).toBeNull();
  await user.type(screen.getByRole('searchbox'), 'missing');
  expect(screen.getByText('No tasks match this view.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  await user.type(screen.getByRole('searchbox'), 'akasia');
  const row = screen.getByRole('button', { name: /Late campaign/ });
  row.focus(); await user.keyboard('{Enter}');
  expect(onEdit).toHaveBeenCalledWith(late);
});
it('shows more tasks and resets pagination when filters change', async () => {
  const user = userEvent.setup();
  render(<FocusQueue items={Array.from({ length: 8 }, (_, index) => task({ id: String(index), title: `Task ${index}` }))} today="2026-09-07" onEditItem={vi.fn()} personal />);
  expect(screen.getByRole('status').textContent).toContain('Showing 5 of 8');
  await user.click(screen.getByRole('button', { name: 'Show more' }));
  expect(screen.getByRole('status').textContent).toContain('Showing 8 of 8');
  await user.click(screen.getByRole('button', { name: 'Due today 8' }));
  expect(screen.getByRole('status').textContent).toContain('Showing 5 of 8');
});
it('offers an honest empty state for an empty scope', () => {
  render(<FocusQueue items={[]} today="2026-09-07" onEditItem={vi.fn()} personal={false} />);
  expect(screen.getByText('A little breathing room.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
});
