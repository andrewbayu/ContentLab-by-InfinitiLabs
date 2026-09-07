import { supabase } from './supabase';
import { validateReport } from '../../shared/strategist';
import type { StrategyReport } from '../../shared/strategist';
export interface StrategyResult { report: StrategyReport; model: string; generatedAt: string; analyzedIds: string[]; }
export async function generateStrategy(taskIds: string[], signal: AbortSignal): Promise<StrategyResult> {
  if (!supabase) throw new Error('Supabase belum terhubung.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Silakan login ulang untuk memakai StrategistAI.');
  const response = await fetch('/api/strategist', { method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ taskIds }) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Endpoint StrategistAI belum tersedia. Jalankan dengan vercel dev atau buka deployment Vercel.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Analisis belum berhasil. Coba lagi.');
  if (!validateReport(result.report, new Set(taskIds))) throw new Error('Hasil analisis tidak valid.');
  return result;
}
