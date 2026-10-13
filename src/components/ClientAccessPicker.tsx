import type { ClientBrand, UserRole } from '../services/sheets';

export function ClientAccessPicker({ value, onChange, role, clients }: {
  value: string; onChange: (value: string) => void; role: UserRole; clients: ClientBrand[];
}) {
  const selected = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  const names = [...new Set([...clients.filter((entry) => entry.active).map((entry) => entry.client), ...selected])].sort();
  if (role === 'client') return (
    <select className="form-select" value={value} onChange={(event) => onChange(event.target.value)} aria-label="Client access" required>
      <option value="">Assign Client *</option>
      {names.map((name) => <option key={name} value={name}>{name}</option>)}
    </select>
  );
  return (
    <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, minWidth: 0 }}>
      <legend>Client access</legend>
      <label style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="checkbox" checked={!value} onChange={(event) => onChange(event.target.checked ? '' : '__none__')} /> All clients
      </label>
      <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
        {names.filter((name) => name !== '__none__').map((name) => (
          <label key={name} style={{ display: 'flex', gap: 8 }}>
            <input type="checkbox" checked={!value || selected.includes(name)} onChange={(event) => {
              const next = new Set(value ? selected.filter((entry) => entry !== '__none__') : names.filter((entry) => entry !== '__none__'));
              if (event.target.checked) next.add(name); else next.delete(name);
              onChange([...next].join(', ') || '__none__');
            }} /> {name}
          </label>
        ))}
      </div>
      <p className="text-secondary" style={{ fontSize: 12, marginTop: 10 }}>Selected clients include all their brands. Unselected clients are excluded.</p>
    </fieldset>
  );
}
