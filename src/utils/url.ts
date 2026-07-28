/**
 * Normalizes a URL string by trimming whitespace and prepending 'https://'
 * if no valid protocol scheme is present (e.g. 'drive.google.com/...' -> 'https://drive.google.com/...').
 */
export function normalizeUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // If it already has a protocol or scheme
  if (/^(https?:\/\/|mailto:|tel:|ftp:\/\/)/i.test(trimmed)) {
    return trimmed;
  }
  // Prepend https://
  return `https://${trimmed}`;
}
