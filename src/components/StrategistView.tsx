import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BrainCircuit, Check, CircleHelp, FilePlus2, LoaderCircle, Sparkles } from 'lucide-react';
import type { ContentItem, TeamMember } from '../services/sheets';
import { analyzeCards, internalRole, validDate } from '../../shared/strategist';
import type { StrategyIdea } from '../../shared/strategist';
import { generateStrategy } from '../services/strategist';
import type { StrategyResult } from '../services/strategist';
import { useToday } from '../utils/useToday';
import { dayDistance } from '../utils/dates';
import '../styles/strategist.css';

export interface StrategistViewProps {
  items: ContentItem[]; currentUser: TeamMember; scopeLabel: string;
  onEditItem: (item: ContentItem) => void;
  onDraftIdea: (idea: StrategyIdea, source: ContentItem) => void;
}
export function StrategistView(props: StrategistViewProps) {
  if (!internalRole(props.currentUser.role)) return <div className="page-container" role="alert">StrategistAI hanya untuk tim internal.</div>;
  return <StrategistWorkspace {...props} />;
}
function StrategistWorkspace({ items, currentUser, scopeLabel, onEditItem, onDraftIdea }: StrategistViewProps) {
  const today = useToday();
  const [channel, setChannel] = useState('all');
  const [period, setPeriod] = useState('all');
  const [tab, setTab] = useState<'insights' | 'cards' | 'ideas'>('insights');
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const content = useMemo(() => items.filter(c => c.taskType === 'Content'), [items]);
  const channels = useMemo(() => [...new Set(content.map(c => c.channel).filter(Boolean))].sort(), [content]);
  const filtered = useMemo(() => content.filter(c => {
    if (channel !== 'all' && c.channel !== channel) return false;
    if (period === 'all') return true;
    const days = validDate(c.publishDate) ? dayDistance(c.publishDate, today) : null;
    return days !== null && days >= 0 && days < Number(period);
  }), [content, channel, period, today]);
  const analysis = useMemo(() => analyzeCards(filtered), [filtered]);
  // Include data changes, not just filters, so old reports never describe new card data.
  const fingerprint = JSON.stringify(filtered);
  useEffect(() => {
    requestVersion.current += 1; controller.current?.abort(); setResult(null); setError(''); setBusy(false);
    return () => { requestVersion.current += 1; controller.current?.abort(); };
  }, [fingerprint, currentUser.id]);
  const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
  const findCard = (id: string) => filtered.find(c => c.id === id);
  const evidence = (ids: string[]) => <div className="strategy-evidence">{ids.map(id => {
    const card = findCard(id); return card ? <button key={id} type="button" onClick={() => onEditItem(card)}>{card.title}<ArrowUpRight size={13} /></button> : null;
  })}</div>;
  const generate = async () => {
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    const version = ++requestVersion.current; setBusy(true); setError(''); setResult(null);
    try {
      const next = await generateStrategy(analysis.cards.map(c => c.id), request.signal);
      if (requestVersion.current === version) setResult(next);
    } catch (failure) {
      if (requestVersion.current === version && !request.signal.aborted) setError(failure instanceof Error ? failure.message : 'Analisis gagal.');
    } finally { if (requestVersion.current === version) setBusy(false); }
  };
  const canGenerate = analysis.cards.length > 0 && analysis.cards.length <= 100 && !busy;
  return <div className="page-container strategy-page">
    <section className="strategy-hero">
      <div><span className="strategy-eyebrow"><BrainCircuit size={16} /> INTERNAL INTELLIGENCE</span>
        <h1>Strategist<span>AI</span></h1><p>Temukan polanya. Pahami alasannya.<br />Ubah pembelajaran menjadi ide berikutnya.</p>
        <div className="strategy-scope">{scopeLabel} <span>· Tim internal</span></div>
      </div>
      <div className="strategy-generate"><button className="btn btn-primary" disabled={!canGenerate} onClick={() => void generate()}>
        {busy ? <LoaderCircle size={17} className="strategy-spin" /> : <Sparkles size={17} />} {busy ? 'Menganalisis…' : 'Generate AI insights'}
      </button><small>Brief, metrik, dan komentar card terpilih dianalisis melalui OpenRouter.</small>
      {analysis.cards.length > 100 && <small>Pilih maksimal 100 card dengan filter di bawah.</small>}</div>
    </section>
    <div className="strategy-filters"><label>Channel<select value={channel} onChange={e => setChannel(e.target.value)}><option value="all">Semua channel</option>{channels.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Periode publikasi<select value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Semua tanggal</option><option value="30">30 hari terakhir</option><option value="90">90 hari terakhir</option></select></label>
      <span>{period === 'all' ? 'Termasuk card tanpa tanggal publikasi.' : 'Card tanpa tanggal dan jadwal mendatang tidak masuk periode.'}</span>
    </div>
    <div className="strategy-metrics">
      {[['Konten unik', analysis.cards.length, `${analysis.duplicates.length} salinan identik dikecualikan`],['Published', analysis.published, 'Sesuai status card'],['Dengan views', analysis.measured, `${analysis.coverage}% dari published`],['Kekuatan bukti', analysis.measured < 5 ? 'Terbatas' : 'Eksploratif', 'Belum mengontrol usia & paid/organic']].map(([label,value,detail]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}
    </div>
    {error && <div className="strategy-message" role="alert">{error}</div>}
    {busy && <div className="strategy-message" role="status">Sedang membaca bukti dan menyusun hipotesis. Mengganti filter membatalkan analisis ini.</div>}
    <div className="strategy-tabs" role="group" aria-label="Tampilan StrategistAI">{([['insights','Insights & patterns'],['cards','Card indicators'],['ideas','Idea lab']] as const).map(([id,label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}{id === 'ideas' && result ? ` (${result.report.ideas.length})` : ''}</button>)}</div>
    {analysis.cards.length === 0 ? <div className="strategy-empty"><BrainCircuit size={32} /><h2>Belum ada konten di scope ini.</h2><p>Pilih brand, channel, atau periode lain. Task general tidak dihitung sebagai konten.</p></div> : <>
      {tab === 'insights' && <>
        {result ? <section className="strategy-section"><div className="strategy-section-head"><h2><Sparkles size={18} /> AI interpretation</h2><small>{result.model} · {new Date(result.generatedAt).toLocaleString('id-ID')}</small></div>
          <p>{result.report.summary}</p><div className="strategy-grid">{result.report.insights.map((insight,i) => <article className="strategy-card" key={i}><span className="strategy-badge">Hipotesis berbasis card</span><h3>{insight.title}</h3><p>{insight.explanation}</p>{evidence(insight.evidenceIds)}</article>)}</div>
          <details><summary>Batasan analisis AI</summary><ul>{result.report.limitations.map((text,i) => <li key={i}>{text}</li>)}</ul></details>
        </section> : <div className="strategy-intro"><Sparkles size={20} /><div><strong>Data sudah siap dibaca.</strong><p>Benchmark di bawah dihitung langsung dari cards. Klik Generate untuk interpretasi dan ide AI dengan sumber yang dapat dibuka.</p></div></div>}
        <section className="strategy-section"><h2>Benchmark yang sebanding</h2><p>Setiap kelompok memakai client, brand, channel, dan format yang sama. Nilai median merangkum data; bukan bukti sebab-akibat.</p>
          {analysis.cohorts.length ? <div className="strategy-grid">{analysis.cohorts.map(group => <article className="strategy-card" key={group.key}><span className="strategy-badge">{group.count} sampel · {group.count < 5 ? 'Terbatas' : 'Eksploratif'}</span><h3>{group.brand} · {group.format}</h3><p>{group.channel}</p><div className="strategy-pair"><div><strong>{number(group.medianViews)}</strong><small>Median views</small></div><div><strong>{number(group.medianLikeRate)}{group.medianLikeRate !== null ? '%' : ''}</strong><small>Median likes / views</small></div></div>{evidence(group.evidenceIds.slice(0,3))}</article>)}</div> : <div className="strategy-empty">Belum ada published card dengan views valid serta client, brand, channel, dan format lengkap.</div>}
        </section>
      </>}
      {tab === 'cards' && <section className="strategy-section"><h2>Indikator per card</h2><p>Brief readiness mendeteksi kelengkapan struktur, bukan menilai kualitas kreatif. Performance adalah persentil views dalam kelompok sebanding (minimal 5 sampel), bukan prediksi sukses.</p>
        <div className="strategy-card-list">{analysis.indicators.map(({ card, views, likeRate, readiness, performance, sample }) => <article key={card.id} className="strategy-card"><button className="strategy-card-title" onClick={() => { const item = findCard(card.id); if (item) onEditItem(item); }}>{card.title}<ArrowUpRight size={16} /></button><p>{card.brand || 'Tanpa brand'} · {card.channel || 'Tanpa channel'} · {card.format} · {card.status}</p>
          <div className="strategy-indicators"><span>Views <strong>{number(views)}</strong></span><span>Likes/views <strong>{number(likeRate)}{likeRate !== null ? '%' : ''}</strong></span><span>Brief readiness <strong>{readiness.score}/100</strong></span><span>Performance <strong>{performance === null ? 'Data belum cukup' : `${performance}/100`}</strong><small>{sample} sampel sebanding</small></span></div>
          <details><summary>Dasar skor brief</summary><ul className="strategy-checks">{readiness.checks.map(check => <li key={check.label}>{check.done ? <Check size={14} /> : <CircleHelp size={14} />}{check.label}: {check.done ? 'terdeteksi' : 'belum terdeteksi'}</li>)}</ul></details>
        </article>)}</div>
      </section>}
      {tab === 'ideas' && <section className="strategy-section"><h2>Idea lab</h2><p>Hipotesis untuk eksperimen berikutnya. Tinjau brief sebelum menyimpan sebagai task.</p>
        {result ? <div className="strategy-grid">{result.report.ideas.map((idea,i) => <article key={i} className="strategy-card strategy-idea"><span className="strategy-badge">Eksperimen {String(i+1).padStart(2,'0')} · {idea.format}</span><h3>{idea.title}</h3><blockquote>{idea.hook}</blockquote><p>{idea.angle}</p><p><strong>Alasan:</strong> {idea.rationale}</p><p><strong>Ukur:</strong> {idea.metric}</p>{evidence(idea.evidenceIds)}<button className="btn btn-secondary" onClick={() => { const source = findCard(idea.evidenceIds[0]); if (source) onDraftIdea(idea,source); }}><FilePlus2 size={16} />Review sebagai draft task</button></article>)}</div> : <div className="strategy-empty"><Sparkles size={28} /><h3>Ide dimulai dari bukti.</h3><p>Klik Generate AI insights untuk menyusun ide dari card dalam scope ini.</p></div>}
      </section>}
      <details className="strategy-method"><summary>Metode & kualitas data</summary><ul><li>{analysis.duplicates.length} salinan identik dikecualikan dari analisis, tanpa menghapus card.</li><li>{analysis.invalidMetrics.length} published card memiliki metrik tidak valid; nilai kosong tidak dianggap nol.</li><li>{analysis.missingDates.length} published card belum memiliki tanggal valid.</li><li>Angka bulat dengan pemisah ribuan (3.373 atau 3,373) dibaca sebagai 3373. Pecahan dan singkatan tidak dipaksakan menjadi angka.</li><li>Persentil memakai peringkat tengah untuk nilai seri. Sampel kecil tetap eksploratif.</li><li>Tidak ada kontrol usia metrik, paid/organic, reach, saves, shares, atau konversi. Likes/views bukan engagement rate lengkap.</li><li>Dokumen personal dan isi link eksternal tidak dikirim ke AI. Komentar adalah feedback tim, bukan respons audiens.</li></ul></details>
    </>}
  </div>;
}
