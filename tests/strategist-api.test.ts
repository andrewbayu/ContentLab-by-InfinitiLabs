// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import endpoint from '../api/strategist';
const id='11111111-1111-4111-a111-111111111111';
const report={summary:'Ringkasan',insights:[{title:'Pola awal',explanation:'Hipotesis',evidenceIds:[id]}],ideas:[{title:'Ide',hook:'Pembuka',angle:'Angle',format:'Carousel',rationale:'Alasan',metric:'Views',evidenceIds:[id]}],limitations:['Sampel kecil']};
const mock=vi.hoisted(()=>({role:'team',valid:true,create:vi.fn(),tables:[] as string[]}));
vi.mock('@supabase/supabase-js',()=>({createClient:(...args: unknown[])=>{mock.create(...args);return {
  auth:{getUser:async()=>({data:{user:mock.valid?{id:'auth-user'}:null},error:null})},
  from:(table:string)=>{mock.tables.push(table); const data=table==='tasks'?[{id:'11111111-1111-4111-a111-111111111111',title:'Card',brief:'Brief',status:'Published',task_type:'Content',client:'A',brand:'A',channel:'Instagram',format:'Carousel',publish_date:'2026-09-07',views:'100',likes:'10'}]:[];
    const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,limit:async()=>({data,error:null}),single:async()=>({data:{role:mock.role},error:null}),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)}; return q;},
};}}));
const request=(body:unknown={taskIds:[id]}, auth=true)=>new Request('https://example.test/api/strategist',{method:'POST',headers:{...(auth?{Authorization:'Bearer verified-token'}:{}),'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{mock.role='team';mock.valid=true;mock.tables=[];mock.create.mockClear();vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_ANON_KEY','public-key');vi.stubEnv('OPENROUTER_API_KEY','server-only-test-key');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({model:'test',choices:[{finish_reason:'stop',message:{content:JSON.stringify(report)}}]})));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('denies unauthenticated requests before querying or spending tokens',async()=>{expect((await endpoint.fetch(request({},false))).status).toBe(401);expect(mock.tables).toEqual([]);expect(fetch).not.toHaveBeenCalled();});
it('denies client role on the server even if the menu is bypassed',async()=>{mock.role='client';expect((await endpoint.fetch(request())).status).toBe(403);expect(mock.tables).toEqual(['team_members']);expect(fetch).not.toHaveBeenCalled();});
it('rejects expired sessions',async()=>{mock.valid=false;expect((await endpoint.fetch(request())).status).toBe(401);expect(fetch).not.toHaveBeenCalled();});
it('returns actionable setup state when the key is absent',async()=>{vi.stubEnv('OPENROUTER_API_KEY','');const r=await endpoint.fetch(request());expect(r.status).toBe(503);expect((await r.json()).error).toContain('OPENROUTER_API_KEY');expect(fetch).not.toHaveBeenCalled();});
it('validates IDs and caps the card count',async()=>{expect((await endpoint.fetch(request({taskIds:['invalid']}))).status).toBe(400);expect((await endpoint.fetch(request({taskIds:Array(101).fill(id)}))).status).toBe(400);});
it('uses caller JWT and public key, re-fetches evidence, and returns validated JSON',async()=>{const r=await endpoint.fetch(request());expect(r.status).toBe(200);expect((await r.json()).report).toEqual(report);expect(r.headers.get('cache-control')).toContain('no-store');expect(mock.create.mock.calls[0][1]).toBe('public-key');expect(mock.create.mock.calls[0][2].global.headers.Authorization).toBe('Bearer verified-token');const call=vi.mocked(fetch).mock.calls[0];expect(call[0]).toBe('https://openrouter.ai/api/v1/chat/completions');expect(String(call[1]?.body)).toContain('Card');expect(String(call[1]?.body)).not.toContain('server-only-test-key');});
it('rejects fabricated source IDs from the model',async()=>{vi.mocked(fetch).mockResolvedValue(Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...report,insights:[{...report.insights[0],evidenceIds:['foreign-id']}]})}}]}));expect((await endpoint.fetch(request())).status).toBe(502);});
it('handles upstream rate limits without leaking provider details',async()=>{vi.mocked(fetch).mockResolvedValue(new Response('secret detail',{status:429}));const r=await endpoint.fetch(request());expect(r.status).toBe(429);expect(await r.text()).not.toContain('secret detail');});
