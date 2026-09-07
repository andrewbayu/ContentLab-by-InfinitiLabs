import { describe, expect, it } from 'vitest';
import { analyzeCards, internalRole, metricCount, readiness, validateReport } from '../shared/strategist';
import { task } from './fixtures';

describe('Strategist analytics', () => {
  it('normalizes grouped counts without treating unknown metrics as zero', () => {
    expect(metricCount('3.373')).toBe(3373); expect(metricCount('1,234,567')).toBe(1234567);
    expect(metricCount('0')).toBe(0);
    for (const value of ['', '-1', '3.5', '1k', 'NaN', '1,234.567', '9007199254740992']) expect(metricCount(value)).toBeNull();
  });
  it('excludes exact duplicate candidates without mutating or deleting originals', () => {
    const cards = [task({ status: 'Published', views: '100' }), task({ id: 'copy', status: 'Published', views: '100' }),task({ id: 'general', taskType: 'General' })];
    const result = analyzeCards(cards); expect(result.cards).toHaveLength(1); expect(result.duplicates).toEqual(['copy']); expect(cards).toHaveLength(3);
  });
  it('does not collapse undated cards or distinct creative briefs', () => {
    expect(analyzeCards([task({publishDate:''}),task({id:'2',publishDate:''})]).cards).toHaveLength(2);
    expect(analyzeCards([task(),task({id:'2',brief:'different'})]).cards).toHaveLength(2);
  });
  it('compares only published cards with the same brand, client, format and channel', () => {
    const cards = Array.from({length:5},(_,i)=>task({id:String(i),title:`Card ${i}`,client:'A',brand:'A',status:'Published',views:String((i+1)*100),likes:'10'}));
    cards.push(task({ id: 'other-brand',client:'B',brand:'B',status:'Published',views:'9000' }));
    cards.push(task({ id: 'unpublished',status:'Idea',views:'99999' }));
    const result = analyzeCards(cards);
    expect(result.cohorts[0].medianViews).toBe(300);
    expect(result.indicators[4].performance).toBe(90);
    expect(result.indicators[5].performance).toBeNull(); expect(result.indicators[6].performance).toBeNull();
  });
  it('keeps zero views distinct from missing data and avoids dividing by zero', () => {
    const a=analyzeCards([task({status:'Published',views:'0',likes:'0'})]);
    expect(a.measured).toBe(1); expect(a.indicators[0].likeRate).toBeNull();
    expect(analyzeCards([task({status:'Published'})]).coverage).toBe(0);
  });
  it('labels brief scoring as explicit structure detection', () => {
    expect(readiness(task()).score).toBe(0);
    const report=readiness(task({brief:'Objective: edukasi. Target audience: creators. Hook: test. CTA: simpan. Visual: storyboard. '+ 'detail '.repeat(15)}));
    expect(report.score).toBe(100); expect(report.checks).toHaveLength(6);
  });
  it('fails closed for client, absent and unknown roles', () => {
    expect(internalRole('team')).toBe(true); expect(internalRole('super')).toBe(true);
    for(const role of ['client',undefined,'admin']) expect(internalRole(role)).toBe(false);
  });
  it('rejects invented evidence references and malformed model responses', () => {
    expect(validateReport({summary:'x',insights:[{title:'x',explanation:'x',evidenceIds:['unknown']}],ideas:[],limitations:[]},new Set(['known']))).toBe(false);
    expect(validateReport(null,new Set())).toBe(false);
  });
});
