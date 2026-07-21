import React, { useMemo, useState } from 'react';
import { Activity, BarChart3, CheckCircle2, Clock3, Plus, Target, TrendingUp, X } from 'lucide-react';
import type { ClientBrand, ContentItem, KpiCadence, KpiDefinition, KpiDirection, KpiUpdate, TeamMember } from '../services/sheets';

interface AnalyticsViewProps {
  items: ContentItem[];
  clients: ClientBrand[];
  definitions: KpiDefinition[];
  updates: KpiUpdate[];
  scopeKey: string;
  scopeLabel: string;
  currentUser: TeamMember;
  onCreateDefinition: (definition: Omit<KpiDefinition, 'id' | 'createdAt'>) => Promise<KpiDefinition>;
  onCreateUpdate: (update: Omit<KpiUpdate, 'id' | 'updatedAt'>) => Promise<KpiUpdate>;
}

const isDone = (item: ContentItem) => item.status === 'Done' || item.status === 'Published';

const getProgress = (definition: KpiDefinition, actual?: number) => {
  if (actual === undefined) return 0;
  const distance = definition.direction === 'increase'
    ? definition.target - definition.baseline
    : definition.baseline - definition.target;
  if (distance <= 0) return actual === definition.target ? 100 : 0;
  const moved = definition.direction === 'increase'
    ? actual - definition.baseline
    : definition.baseline - actual;
  return Math.max(0, Math.min(100, Math.round((moved / distance) * 100)));
};

const formatMetric = (value: number, unit: string) => {
  if (unit.toLowerCase().includes('percent') || unit === '%') return `${value.toLocaleString('id-ID')}%`;
  if (unit.toLowerCase().includes('rupiah') || unit.toLowerCase() === 'idr') {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  }
  return `${value.toLocaleString('id-ID')} ${unit === 'Number' ? '' : unit}`.trim();
};

const MiniTrend: React.FC<{ values: number[] }> = ({ values }) => {
  if (values.length < 2) return <div className="kpi-empty-trend">Need 2 updates for trend</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 34 - ((value - min) / span) * 28;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="kpi-mini-trend" viewBox="0 0 100 38" preserveAspectRatio="none" aria-label="KPI trend">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  items,
  clients,
  definitions,
  updates,
  scopeKey,
  scopeLabel,
  currentUser,
  onCreateDefinition,
  onCreateUpdate,
}) => {
  const activeClients = clients.filter((client) => client.active);
  const selectedBrand = scopeKey.startsWith('brand:') ? activeClients.find((client) => `brand:${client.id}` === scopeKey) : undefined;
  const selectedClient = scopeKey.startsWith('client:') ? scopeKey.slice(7) : '';
  const [showAddKpi, setShowAddKpi] = useState(false);
  const [updatingKpiId, setUpdatingKpiId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dateRange, setDateRange] = useState<'30d' | 'month' | 'quarter' | 'all'>('month');
  const [definitionForm, setDefinitionForm] = useState({
    clientBrandId: selectedBrand?.id || '',
    name: '', category: 'Business', unit: 'Number', baseline: '0', target: '',
    direction: 'increase' as KpiDirection, cadence: 'Monthly' as KpiCadence, weight: '1',
  });
  const [updateForm, setUpdateForm] = useState({
    period: new Date().toISOString().slice(0, 10), actual: '', notes: '', sourceLink: '',
  });

  const rangeStart = useMemo(() => {
    if (dateRange === 'all') return null;
    const now = new Date();
    if (dateRange === '30d') return new Date(now.getTime() - 30 * 86400000);
    if (dateRange === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  }, [dateRange]);

  const scopedDefinitions = useMemo(() => definitions.filter((definition) => {
    if (!definition.active) return false;
    if (selectedBrand) return definition.clientBrandId === selectedBrand.id || (definition.client === selectedBrand.client && definition.brand === selectedBrand.brand);
    if (selectedClient) return definition.client === selectedClient;
    return true;
  }), [definitions, selectedBrand, selectedClient]);

  const scopedUpdates = useMemo(() => updates.filter((update) => {
    if (!rangeStart) return true;
    return new Date(update.period || update.updatedAt) >= rangeStart;
  }), [updates, rangeStart]);

  const latestByKpi = useMemo(() => {
    const map = new Map<string, KpiUpdate>();
    scopedUpdates.forEach((update) => {
      const current = map.get(update.kpiId);
      if (!current || `${update.period}|${update.updatedAt}` > `${current.period}|${current.updatedAt}`) map.set(update.kpiId, update);
    });
    return map;
  }, [scopedUpdates]);

  const completed = items.filter(isDone).length;
  const overdue = items.filter((item) => {
    const date = item.taskType === 'General' ? item.dueDate : item.publishDate;
    return !!date && date < new Date().toISOString().slice(0, 10) && !isDone(item);
  }).length;
  const published = items.filter((item) => item.taskType === 'Content' && item.status === 'Published').length;
  const completionRate = items.length ? Math.round((completed / items.length) * 100) : 0;
  const onTrack = scopedDefinitions.filter((definition) => getProgress(definition, latestByKpi.get(definition.id)?.actual) >= 80).length;
  const trackedKpis = scopedDefinitions.filter((definition) => latestByKpi.has(definition.id));
  const averageKpiProgress = trackedKpis.length
    ? Math.round(trackedKpis.reduce((sum, definition) => sum + getProgress(definition, latestByKpi.get(definition.id)?.actual), 0) / trackedKpis.length)
    : 0;

  const comparisons = activeClients.filter((clientBrand) => !selectedClient || clientBrand.client === selectedClient).map((clientBrand) => {
    const brandItems = items.filter((item) => item.client === clientBrand.client && item.brand === clientBrand.brand);
    const brandDefinitions = definitions.filter((definition) => definition.active && (definition.clientBrandId === clientBrand.id || (definition.client === clientBrand.client && definition.brand === clientBrand.brand)));
    const brandCompleted = brandItems.filter(isDone).length;
    const brandOverdue = brandItems.filter((item) => {
      const date = item.taskType === 'General' ? item.dueDate : item.publishDate;
      return !!date && date < new Date().toISOString().slice(0, 10) && !isDone(item);
    }).length;
    const brandOnTrack = brandDefinitions.filter((definition) => getProgress(definition, latestByKpi.get(definition.id)?.actual) >= 80).length;
    return { clientBrand, tasks: brandItems.length, completion: brandItems.length ? Math.round((brandCompleted / brandItems.length) * 100) : 0, overdue: brandOverdue, kpis: brandDefinitions.length, onTrack: brandOnTrack };
  }).filter((row) => row.tasks > 0 || row.kpis > 0 || scopeKey === 'all');

  const handleCreateDefinition = async (event: React.FormEvent) => {
    event.preventDefault();
    const clientBrand = activeClients.find((entry) => entry.id === definitionForm.clientBrandId);
    if (!clientBrand || !definitionForm.name.trim() || !definitionForm.target) return;
    setIsSaving(true);
    try {
      await onCreateDefinition({
        clientBrandId: clientBrand.id,
        client: clientBrand.client,
        brand: clientBrand.brand,
        name: definitionForm.name.trim(),
        category: definitionForm.category.trim() || 'Business',
        unit: definitionForm.unit,
        baseline: Number(definitionForm.baseline || 0),
        target: Number(definitionForm.target),
        direction: definitionForm.direction,
        cadence: definitionForm.cadence,
        weight: Number(definitionForm.weight || 1),
        active: true,
      });
      setShowAddKpi(false);
      setDefinitionForm((current) => ({ ...current, name: '', target: '', baseline: '0' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!updatingKpiId || updateForm.actual === '') return;
    setIsSaving(true);
    try {
      await onCreateUpdate({
        kpiId: updatingKpiId,
        period: updateForm.period,
        actual: Number(updateForm.actual),
        notes: updateForm.notes.trim(),
        sourceLink: updateForm.sourceLink.trim(),
        updatedBy: currentUser.name,
      });
      setUpdatingKpiId('');
      setUpdateForm({ period: new Date().toISOString().slice(0, 10), actual: '', notes: '', sourceLink: '' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container analytics-page">
      <div className="analytics-heading-row">
        <div>
          <div className="analytics-eyebrow">{scopeLabel}</div>
          <h2>Analytics & KPI</h2>
          <p>Operational progress and measurable outcomes in one brand-aware view.</p>
        </div>
        <div className="analytics-actions">
          <select className="select-filter" value={dateRange} onChange={(event) => setDateRange(event.target.value as typeof dateRange)}>
            <option value="month">Month to date</option>
            <option value="30d">Last 30 days</option>
            <option value="quarter">This quarter</option>
            <option value="all">All time</option>
          </select>
          {currentUser.role === 'super' && (
            <button className="btn btn-primary" onClick={() => setShowAddKpi(true)} disabled={!activeClients.length}>
              <Plus size={16} /> Define KPI
            </button>
          )}
        </div>
      </div>

      <div className="analytics-summary-grid">
        <div className="analytics-summary-card summary-positive"><CheckCircle2 /><div><span>Task completion</span><strong>{completionRate}%</strong><small>{completed} of {items.length} tasks</small><i><b style={{ width: `${completionRate}%` }} /></i></div></div>
        <div className={`analytics-summary-card ${overdue ? 'summary-warning' : 'summary-positive'}`}><Clock3 /><div><span>Overdue</span><strong>{overdue}</strong><small>{overdue ? 'Needs follow-up' : 'All clear'}</small></div></div>
        <div className="analytics-summary-card"><BarChart3 /><div><span>Published content</span><strong>{published}</strong><small>In current scope</small></div></div>
        <div className={`analytics-summary-card ${averageKpiProgress >= 80 ? 'summary-positive' : 'summary-neutral'}`}><Target /><div><span>KPI health</span><strong>{trackedKpis.length ? `${averageKpiProgress}%` : '—'}</strong><small>{trackedKpis.length ? `${onTrack}/${scopedDefinitions.length} on track` : 'No updates yet'}</small></div></div>
      </div>

      {showAddKpi && (
        <form className="analytics-form-card" onSubmit={handleCreateDefinition}>
          <div className="analytics-form-title"><div><strong>Define a KPI</strong><span>Super admins set the measurement and target.</span></div><button type="button" className="btn btn-secondary btn-icon-only" onClick={() => setShowAddKpi(false)}><X size={16} /></button></div>
          <div className="analytics-form-grid">
            <select className="form-select" value={definitionForm.clientBrandId} onChange={(event) => setDefinitionForm({ ...definitionForm, clientBrandId: event.target.value })} required>
              <option value="">Select client / brand</option>
              {activeClients.map((entry) => <option key={entry.id} value={entry.id}>{entry.client} — {entry.brand}</option>)}
            </select>
            <input className="form-input" placeholder="KPI name" value={definitionForm.name} onChange={(event) => setDefinitionForm({ ...definitionForm, name: event.target.value })} required />
            <input className="form-input" placeholder="Category" value={definitionForm.category} onChange={(event) => setDefinitionForm({ ...definitionForm, category: event.target.value })} />
            <select className="form-select" value={definitionForm.unit} onChange={(event) => setDefinitionForm({ ...definitionForm, unit: event.target.value })}><option>Number</option><option>%</option><option>IDR</option><option>Leads</option><option>Hours</option><option>Days</option></select>
            <input type="number" step="any" className="form-input" placeholder="Baseline" value={definitionForm.baseline} onChange={(event) => setDefinitionForm({ ...definitionForm, baseline: event.target.value })} />
            <input type="number" step="any" className="form-input" placeholder="Target" value={definitionForm.target} onChange={(event) => setDefinitionForm({ ...definitionForm, target: event.target.value })} required />
            <select className="form-select" value={definitionForm.direction} onChange={(event) => setDefinitionForm({ ...definitionForm, direction: event.target.value as KpiDirection })}><option value="increase">Higher is better</option><option value="decrease">Lower is better</option></select>
            <select className="form-select" value={definitionForm.cadence} onChange={(event) => setDefinitionForm({ ...definitionForm, cadence: event.target.value as KpiCadence })}><option>Weekly</option><option>Monthly</option><option>Quarterly</option></select>
          </div>
          <div className="analytics-form-footer"><button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save KPI'}</button></div>
        </form>
      )}

      <section className="analytics-section">
        <div className="analytics-section-heading"><div><h3>Brand KPI progress</h3><p>Manual metric updates remain historical so the team can see movement over time.</p></div><Activity size={20} /></div>
        {scopedDefinitions.length === 0 ? (
          <div className="analytics-empty-state"><Target size={30} /><strong>No KPI defined for this scope</strong><span>{currentUser.role === 'super' ? 'Start with one measurable target for this client or brand.' : 'Ask a super admin to define KPI targets.'}</span>{currentUser.role === 'super' && <button className="btn btn-primary" type="button" onClick={() => setShowAddKpi(true)}><Plus size={14} /> Define first KPI</button>}</div>
        ) : (
          <div className="kpi-grid">
            {scopedDefinitions.map((definition) => {
              const history = scopedUpdates.filter((update) => update.kpiId === definition.id).sort((a, b) => `${a.period}|${a.updatedAt}`.localeCompare(`${b.period}|${b.updatedAt}`));
              const latest = latestByKpi.get(definition.id);
              const progress = getProgress(definition, latest?.actual);
              return (
                <article className="kpi-card" key={definition.id}>
                  <div className="kpi-card-head"><div><span className="kpi-brand-label">{definition.client} · {definition.brand}</span><h4>{definition.name}</h4></div><span className={`kpi-health ${progress >= 80 ? 'on-track' : progress >= 50 ? 'watch' : 'behind'}`}>{latest ? `${progress}%` : 'No data'}</span></div>
                  <div className="kpi-values"><div><span>Actual</span><strong>{latest ? formatMetric(latest.actual, definition.unit) : '—'}</strong></div><div><span>Target</span><strong>{formatMetric(definition.target, definition.unit)}</strong></div></div>
                  <div className="kpi-progress-track"><div style={{ width: `${progress}%` }} /></div>
                  <MiniTrend values={history.map((update) => update.actual)} />
                  <div className="kpi-card-foot"><span>{definition.category} · {definition.cadence}</span><button className="btn btn-secondary" onClick={() => setUpdatingKpiId(definition.id)}><TrendingUp size={14} /> Update KPI</button></div>
                  {updatingKpiId === definition.id && (
                    <form className="kpi-update-form" onSubmit={handleCreateUpdate}>
                      <input type="date" className="form-input" value={updateForm.period} onChange={(event) => setUpdateForm({ ...updateForm, period: event.target.value })} required />
                      <input type="number" step="any" className="form-input" placeholder={`Actual (${definition.unit})`} value={updateForm.actual} onChange={(event) => setUpdateForm({ ...updateForm, actual: event.target.value })} required />
                      <input className="form-input" placeholder="Notes (optional)" value={updateForm.notes} onChange={(event) => setUpdateForm({ ...updateForm, notes: event.target.value })} />
                      <input type="url" className="form-input" placeholder="Source link (optional)" value={updateForm.sourceLink} onChange={(event) => setUpdateForm({ ...updateForm, sourceLink: event.target.value })} />
                      <div><button className="btn btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save update'}</button><button className="btn btn-secondary" type="button" onClick={() => setUpdatingKpiId('')}>Cancel</button></div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {!selectedBrand && (
        <section className="analytics-section">
          <div className="analytics-section-heading"><div><h3>Brand comparison</h3><p>Portfolio-level delivery and KPI health across active brands.</p></div></div>
          <div className="analytics-table-wrap">
            <table className="analytics-table"><thead><tr><th>Client / Brand</th><th>Tasks</th><th>Completion</th><th>Overdue</th><th>KPI on track</th></tr></thead><tbody>
              {comparisons.sort((a, b) => b.completion - a.completion || b.onTrack - a.onTrack).map((row) => <tr key={row.clientBrand.id}><td><span className="brand-color-dot" style={{ backgroundColor: row.clientBrand.color }} /> <strong>{row.clientBrand.client}</strong><small>{row.clientBrand.brand}</small></td><td>{row.tasks}</td><td><div className="comparison-metric"><span>{row.completion}%</span><i><b style={{ width: `${row.completion}%` }} /></i></div></td><td><span className={row.overdue ? 'comparison-alert' : 'comparison-ok'}>{row.overdue}</span></td><td><div className="comparison-metric"><span>{row.onTrack}/{row.kpis}</span><i><b style={{ width: `${row.kpis ? Math.round((row.onTrack / row.kpis) * 100) : 0}%` }} /></i></div></td></tr>)}
            </tbody></table>
          </div>
        </section>
      )}
    </div>
  );
};
