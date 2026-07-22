const palettes = [['#2563eb', '#93c5fd', '#dbeafe'], ['#7c3aed', '#c4b5fd', '#ede9fe'], ['#db2777', '#f9a8d4', '#fce7f3'], ['#059669', '#6ee7b7', '#d1fae5'], ['#d97706', '#fcd34d', '#fef3c7'], ['#0891b2', '#67e8f9', '#cffafe'], ['#dc2626', '#fca5a5', '#fee2e2']];

function hashName(value: string): number {
  return Array.from(value || 'ContentLab').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0) >>> 0;
}

export function getGeneratedAvatar(name = 'User'): string {
  const hash = hashName(name);
  const [primary, secondary, background] = palettes[hash % palettes.length];
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'U';
  const texture = hash % 2 === 0
    ? `<circle cx="18" cy="18" r="12" fill="${secondary}" opacity=".55"/><circle cx="78" cy="72" r="28" fill="${primary}" opacity=".18"/><path d="M0 82 Q35 48 100 86 V100 H0Z" fill="${primary}" opacity=".35"/>`
    : `<path d="M0 22 Q34 62 100 20 V0 H0Z" fill="${secondary}" opacity=".6"/><path d="M0 70 Q45 30 100 72 V100 H0Z" fill="${primary}" opacity=".28"/><circle cx="76" cy="24" r="16" fill="${primary}" opacity=".3"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#g)"/>${texture}<text x="50" y="57" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="${primary}">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
