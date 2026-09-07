/** Shared deterministic calculations. No credentials, network, or browser imports. */
export interface StrategyCard {
  id: string; title: string; brief: string; status: string; taskType: string;
  client?: string; brand?: string; channel: string; format: string; publishDate: string;
  views?: string; likes?: string; engagement?: string; tags?: string;
  targetAudience?: string; assetsLink?: string;
}
export const internalRole = (role?: string) => role === 'super' || role === 'team';
export const plain = (text = '') => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Integer counts only. Grouped Indonesian/English thousands are accepted. */
export function metricCount(raw?: string): number | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (!/^\d+$/.test(value) && !/^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(value)) return null;
  const number = Number(value.replace(/[.,]/g, ''));
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export function readiness(card: StrategyCard) {
  const brief = plain(card.brief);
  const checks = [
    { label: 'Brief detail (120+ karakter)', done: brief.length >= 120 },
    { label: 'Target audience disebutkan', done: !!card.targetAudience?.trim() || /audience|demografi|target market|target pasar/i.test(brief) },
    { label: 'Tujuan / pesan disebutkan', done: /objective|tujuan|message|pesan utama/i.test(brief) },
    { label: 'Hook / pembuka disebutkan', done: /hook|headline|pembuka|slide\s*1|scene\s*1/i.test(brief) },
    { label: 'CTA disebutkan', done: /\bcta\b|call.to.action|ajakan/i.test(brief) },
    { label: 'Arahan visual disebutkan', done: /visual|on.screen|footage|storyboard|text on screen/i.test(brief) },
  ];
  return { score: Math.round(checks.filter(c => c.done).length / checks.length * 100), checks };
}
export function analyzeCards(source: StrategyCard[]) {
  const seen = new Set<string>(), duplicates: string[] = [];
  const cards = source.filter(c => c.taskType === 'Content').filter(c => {
    // Only exact content/metric copies with a date are excluded; originals stay untouched.
    const key = JSON.stringify([plain(c.title).toLowerCase(), c.client || '', c.brand || '', c.channel, c.format, c.publishDate,
      plain(c.brief), c.views || '', c.likes || '', c.engagement || '']);
    if (c.publishDate && seen.has(key)) { duplicates.push(c.id); return false; }
    seen.add(key); return true;
  });
  const published = cards.filter(c => c.status === 'Published');
  const measured = published.filter(c => metricCount(c.views) !== null);
  const invalidMetrics = published.filter(c => [c.views, c.likes, c.engagement].some(v => !!v?.trim() && metricCount(v) === null));
  const groups = new Map<string, StrategyCard[]>();
  for (const c of measured) {
    if (!c.client || !c.brand || !c.channel || !c.format) continue;
    const key = JSON.stringify([c.client, c.brand, c.channel, c.format]);
    groups.set(key, [...(groups.get(key) || []), c]);
  }
  const cohorts = [...groups.entries()].map(([key, entries]) => ({
    key, client: entries[0].client!, brand: entries[0].brand!, channel: entries[0].channel, format: entries[0].format,
    count: entries.length, medianViews: median(entries.map(c => metricCount(c.views)!))!,
    medianLikeRate: median(entries.flatMap(c => {
      const v = metricCount(c.views), l = metricCount(c.likes); return v && l !== null ? [100 * l / v] : [];
    })), evidenceIds: entries.map(c => c.id),
  })).sort((a, b) => b.count - a.count);
  const indicators = cards.map(card => {
    const views = metricCount(card.views), likes = metricCount(card.likes);
    const cohort = cohorts.find(g => g.evidenceIds.includes(card.id));
    const peers = cohort ? measured.filter(c => cohort.evidenceIds.includes(c.id)) : [];
    // Midrank percentile, ties receive the same score. At least 5 comparable records.
    const performance = views !== null && peers.length >= 5 ? Math.round(100 *
      (peers.filter(c => metricCount(c.views)! < views).length + .5 * peers.filter(c => metricCount(c.views) === views).length) / peers.length) : null;
    return { card, views, likes, likeRate: views && likes !== null ? 100 * likes / views : null,
      readiness: readiness(card), performance, sample: peers.length };
  });
  return { cards, published: published.length, measured: measured.length, duplicates, invalidMetrics: invalidMetrics.map(c => c.id),
    missingDates: published.filter(c => !validDate(c.publishDate)).map(c => c.id),
    coverage: published.length ? Math.round(100 * measured.length / published.length) : 0, cohorts, indicators };
}

export interface StrategyInsight { title: string; explanation: string; evidenceIds: string[]; }
export interface StrategyIdea { title: string; hook: string; angle: string; format: string; rationale: string; metric: string; evidenceIds: string[]; }
export interface StrategyReport { summary: string; insights: StrategyInsight[]; ideas: StrategyIdea[]; limitations: string[]; }
export function validateReport(value: unknown, ids: Set<string>): value is StrategyReport {
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 4000;
  const evidence = (v: unknown) => Array.isArray(v) && v.length > 0 && v.length <= 10 && v.every(id => typeof id === 'string' && ids.has(id));
  if (!value || typeof value !== 'object') return false;
  const r = value as StrategyReport;
  return text(r.summary) && Array.isArray(r.insights) && r.insights.length <= 5 && r.insights.length > 0 &&
    r.insights.every(i => i && text(i.title) && text(i.explanation) && evidence(i.evidenceIds)) &&
    Array.isArray(r.ideas) && r.ideas.length > 0 && r.ideas.length <= 5 &&
    r.ideas.every(i => i && [i.title, i.hook, i.angle, i.rationale, i.metric].every(text) &&
      ['Carousel','Video','Short','Graphic','Article'].includes(i.format) && evidence(i.evidenceIds)) &&
    Array.isArray(r.limitations) && r.limitations.length <= 10 && r.limitations.every(text);
}
