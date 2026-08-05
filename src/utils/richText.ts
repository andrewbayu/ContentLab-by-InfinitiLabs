const ALLOWED_TAGS = new Set([
  'P',
  'DIV',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'UL',
  'OL',
  'LI',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'A',
]);

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const isSafeUrl = (value: string) => /^(https?:|mailto:)/i.test(value.trim());

/**
 * Keep the editor deliberately small and safe. Supabase stores this as TEXT,
 * so an allow-list sanitizer lets us add formatting without a schema change
 * or exposing saved HTML to the rest of the app.
 */
export const sanitizeRichText = (value: string): string => {
  if (!value || typeof DOMParser === 'undefined') {
    return value || '';
  }

  const document = new DOMParser().parseFromString(value, 'text/html');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  let current = walker.nextNode();
  while (current) {
    elements.push(current as Element);
    current = walker.nextNode();
  }

  elements.forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      const parent = element.parentNode;
      while (element.firstChild) parent?.insertBefore(element.firstChild, element);
      parent?.removeChild(element);
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      if (element.tagName === 'A' && attribute.name === 'href' && isSafeUrl(attribute.value)) {
        return;
      }
      element.removeAttribute(attribute.name);
    });

    if (element.tagName === 'A') {
      const href = element.getAttribute('href');
      if (!href || !isSafeUrl(href)) {
        element.removeAttribute('href');
      } else {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noreferrer noopener');
      }
    }
  });

  return document.body.innerHTML.trim();
};

/** Convert legacy plain-text briefs to editor-safe paragraphs. */
export const toEditorHtml = (value: string): string => {
  if (!value) return '';
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return sanitizeRichText(value);

  return value
    .split(/\r?\n/)
    .map((line) => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>')
    .join('');
};

export const richTextToPlainText = (value: string): string => {
  if (!value) return '';
  if (typeof DOMParser === 'undefined') return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const document = new DOMParser().parseFromString(value, 'text/html');
  return (document.body.textContent || '').replace(/\s+/g, ' ').trim();
};

/** Sanitize formatted values while leaving legacy plain-text values untouched. */
export const normalizeRichTextValue = (value: string): string => {
  if (!value) return '';
  return /<\/?[a-z][\s\S]*>/i.test(value) ? sanitizeRichText(value) : value;
};
