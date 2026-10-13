import { useState } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { ClientAccessPicker } from '../src/components/ClientAccessPicker';
import { hasClientAccess } from '../src/services/sheets';
import { user } from './fixtures';

afterEach(cleanup);
test('crew can keep two clients while excluding a third, including after remount', async () => {
  let saved = '';
  const clients = ['Akasia', 'Internal', 'Vendor'].map((client) => ({ id: client, client, brand: client, active: true, color: '' }));
  function Form() {
    const [value, setValue] = useState(saved);
    return <ClientAccessPicker role="team" clients={clients} value={value} onChange={(next) => { saved = next; setValue(next); }} />;
  }
  const interaction = userEvent.setup();
  const view = render(<Form />);
  await interaction.click(screen.getByRole('checkbox', { name: 'Vendor' }));
  expect(hasClientAccess({ ...user, role: 'team', client: saved }, 'Akasia')).toBe(true);
  expect(hasClientAccess({ ...user, role: 'team', client: saved }, 'Internal')).toBe(true);
  expect(hasClientAccess({ ...user, role: 'team', client: saved }, 'Vendor')).toBe(false);
  view.unmount(); render(<Form />);
  expect((screen.getByRole('checkbox', { name: 'Vendor' }) as HTMLInputElement).checked).toBe(false);
});
test('brand name collisions and empty client accounts never grant access', () => {
  expect(hasClientAccess({ ...user, role: 'team', client: 'Akasia' }, 'Excluded', 'Akasia')).toBe(false);
  expect(hasClientAccess({ ...user, role: 'team', client: '__none__' }, 'Akasia')).toBe(false);
  expect(hasClientAccess({ ...user, role: 'client', client: '' }, 'Akasia')).toBe(false);
});
