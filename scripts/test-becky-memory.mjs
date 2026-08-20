import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { resolveMemorySignal, selectAttentionCandidates } from '../src/becky-memory/core.mjs';

const note='Erdu a spus că s-a plictisit.';
const resolved=resolveMemorySignal({exact_source_excerpt:note,normalized_observation:'Erdu a spus că s-a plictisit.',epistemic_type:'direct_quote',entities:{children:['Erdu'],activities:[]},topics:['implicare'],age_categories:['7–8 ani'],confidence:.9},{note_text:note,children:[{id:'erdu',first_name:'Erdu'}],activities:[]});
assert.equal(resolved.entities[0].id,'erdu');
assert.equal(resolved.possible_canonical_context[0].destination,'crm_child_observation');
assert.equal(resolveMemorySignal({...resolved,exact_source_excerpt:'inventat'},{note_text:note,children:[],activities:[]}),null);

const dir=await mkdtemp(join(tmpdir(),'becky-memory-'));const files={crm:join(dir,'crm.json'),report:join(dir,'report.json'),memory:join(dir,'memory.json'),attention:join(dir,'attention.json'),activities:join(dir,'activities.json'),workspaces:join(dir,'workspaces.json'),knowledge:join(dir,'knowledge.json'),inbox:join(dir,'inbox.json'),brief:join(dir,'brief.json')};
await writeFile(files.crm,JSON.stringify({children:[{id:'erdu',first_name:'Erdu',age:7,interests:'',continuity:'',created_at:'2026-08-01T00:00:00Z',updated_at:'2026-08-01T00:00:00Z'},{id:'mara',first_name:'Mara',age:7,interests:'',continuity:'',created_at:'2026-08-01T00:00:00Z',updated_at:'2026-08-01T00:00:00Z'}],visits:[],observations:[]}));
await Promise.all([writeFile(files.report,JSON.stringify({month_key:'2026-08',due_date:'2026-09-02',notes:{},entries:[],roles:[]})),writeFile(files.memory,'[]'),writeFile(files.attention,'[]'),writeFile(files.activities,'[]'),writeFile(files.knowledge,'[]'),writeFile(files.inbox,'[]'),writeFile(files.brief,'[]'),writeFile(files.workspaces,JSON.stringify({workspaces:[{id:'children',activities:[{id:'hunt',title:'Treasure Hunt',ageCategories:['7–8 ani']}]}]}))]);
const port=3359;const server=spawn(process.execPath,['server.js'],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,PORT:String(port),BECKY_INBOX_TEST_MODE:'1',BECKY_CRM_FILE:files.crm,BECKY_MONTHLY_REPORT_FILE:files.report,BECKY_MEMORY_STORE_FILE:files.memory,BECKY_ATTENTION_STORE_FILE:files.attention,BECKY_ACTIVITY_OBSERVATIONS_FILE:files.activities,BECKY_WORKSPACES_FILE:files.workspaces,BECKY_KNOWLEDGE_CANDIDATES_FILE:files.knowledge,BECKY_INBOX_STORE_FILE:files.inbox,BECKY_BRIEF_STORE_FILE:files.brief},stdio:'ignore'});
const base=`http://127.0.0.1:${port}`;for(let i=0;i<50;i++){try{if((await fetch(`${base}/api/runtime`)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,40));if(i===49)throw new Error('Memory test server did not start');}
const request=async(path,options={})=>{const response=await fetch(base+path,{headers:{'content-type':'application/json',...(options.headers||{})},...options});return {response,body:await response.json()};};
const save=async(date,text)=>request('/api/admin/monthly-report/notes',{method:'PATCH',body:JSON.stringify({date,text})});
const signal=(excerpt,child='Erdu')=>({exact_source_excerpt:excerpt,normalized_observation:excerpt,epistemic_type:excerpt.includes('spus')?'direct_quote':'observed',entities:{children:child?[child]:[],activities:[]},topics:['implicare'],age_categories:['7–8 ani'],confidence:.9});
const analyze=async(date,text,signals,attention=[])=>{await save(date,text);return request('/api/admin/becky-memory/analyze',{method:'POST',body:JSON.stringify({date,memory_override:signals,attention_override:attention})});};
try {
  const day1=await analyze('2026-08-18','Erdu a spus că s-a plictisit.',[signal('Erdu a spus că s-a plictisit.')]);
  assert.equal(day1.response.status,201);assert.equal(day1.body.signals.length,1);assert.equal(day1.body.attention_candidates.length,0);
  assert.equal(JSON.parse(await readFile(files.crm,'utf8')).observations.length,1,'resolved factual signal auto-stores in CRM');
  const legacy=await request('/api/admin/becky-inbox/proposals?source_id=2026-08-18');assert.equal(legacy.body.proposals.length,0,'memory does not make pending Inbox proposals');
  const day2=await analyze('2026-08-22','Erdu a părăsit activitatea după 10 minute.',[signal('Erdu a părăsit activitatea după 10 minute.')]);
  const day3=await analyze('2026-08-27','Mara nu a găsit nimic de făcut.',[signal('Mara nu a găsit nimic de făcut.','Mara')]);
  const day4Text='La Treasure Hunt, implicarea copiilor de 7–8 ani a scăzut după 15 minute.';
  const allRefs=[day1.body.signals[0].exact_source_excerpt,day2.body.signals[0].exact_source_excerpt,day3.body.signals[0].exact_source_excerpt,day4Text];
  const candidate={title:'Posibil gap pentru 7–8 ani',summary:'Mai multe semnale sugerează un gap de ofertă pentru 7–8 ani.',why_it_matters:'Merită verificat înainte de a schimba oferta.',suggested_next_step:'Compară implicarea în două activități diferite.',evidence_refs:allRefs,counter_evidence_refs:[],topics:['implicare'],age_categories:['7–8 ani'],relevance_score:77,confidence:.74};
  const day4=await analyze('2026-08-31',day4Text,[signal(day4Text,null)],[candidate]);assert.equal(day4.body.attention_candidates.length,1,'multi-day evidence creates one attention candidate');
  const active=await request('/api/admin/becky-memory/attention');assert.equal(active.body.candidates[0].independent_evidence_count,4);
  const counterText='Într-un joc diferit, Erdu a rămas implicat 30 de minute.';
  const counter=await analyze('2026-09-01',counterText,[signal(counterText)], [{...candidate,counter_evidence_refs:[counterText]}]);
  assert.equal(counter.body.attention_candidates.length,1);assert.equal(counter.body.attention_candidates[0].counter_evidence_signal_ids.length,1,'counter evidence stays separate');
  const persisted=await request('/api/admin/becky-memory/signals?source_note_id=2026-08-18');assert.equal(persisted.body.signals.length,1);
  const removed=await request(`/api/admin/becky-memory/signals/${day1.body.signals[0].id}`,{method:'DELETE'});assert.equal(removed.response.status,200);assert.equal(JSON.parse(await readFile(files.crm,'utf8')).observations.length,3,'deleting own signal removes only its matching CRM observation');
} finally { server.kill('SIGTERM'); }
console.log('Becky Memory checks passed');
