import { sha256 } from '../becky-inbox/core.mjs';

export const MEMORY_EPISTEMIC_TYPES = ['observed', 'direct_quote', 'activity_evidence'];
export const ATTENTION_STATUSES = ['active', 'investigating', 'promoted', 'dismissed'];

const clean = value => String(value ?? '').trim();
const normal = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ro').replace(/[^a-z0-9]+/g, ' ').trim();
const words = value => new Set(normal(value).split(/\s+/).filter(word => word.length > 2 && !['care','este','sunt','pentru','aceasta','acest','unei','unui','mai','fost','dupa'].includes(word)));
const similarity = (left, right) => { const a=words(left);const b=words(right);if(!a.size||!b.size)return 0;let shared=0;for(const word of a)if(b.has(word))shared++;return shared/Math.max(a.size,b.size); };
const clamp = (value,min,max) => Math.max(min,Math.min(max,Number(value)||0));
const exactMatches = (name, values, label) => { const sought=normal(name);return sought ? values.filter(value=>normal(value[label])===sought) : []; };

export function resolveMemorySignal(raw, context) {
  const exact_source_excerpt=clean(raw?.exact_source_excerpt);
  if(!exact_source_excerpt || !clean(context.note_text).includes(exact_source_excerpt)) return null;
  const normalized_observation=clean(raw?.normalized_observation);
  const epistemic_type=MEMORY_EPISTEMIC_TYPES.includes(raw?.epistemic_type) ? raw.epistemic_type : 'observed';
  if(!normalized_observation) return null;
  const rawEntities=raw?.entities && typeof raw.entities==='object' ? raw.entities : {};
  const children=[...new Set(Array.isArray(rawEntities.children)?rawEntities.children.map(clean).filter(Boolean):[])].map(name=>{
    const matches=exactMatches(name,context.children||[],'first_name');
    return { type:'child', label:name, id:matches.length===1?matches[0].id:null, resolution:matches.length===1?'resolved':matches.length>1?'ambiguous':'not_found' };
  });
  const activities=[...new Set(Array.isArray(rawEntities.activities)?rawEntities.activities.map(clean).filter(Boolean):[])].map(name=>{
    const matches=exactMatches(name,context.activities||[],'title');
    return { type:'activity', label:name, id:matches.length===1?matches[0].id:null, resolution:matches.length===1?'resolved':matches.length>1?'ambiguous':'not_found' };
  });
  const topics=[...new Set((Array.isArray(raw?.topics)?raw.topics:[]).map(clean).filter(value=>value.length>=2&&value.length<=80))].slice(0,8);
  const age_categories=[...new Set((Array.isArray(raw?.age_categories)?raw.age_categories:[]).map(clean).filter(Boolean))].slice(0,5);
  const confidence=clamp(raw?.confidence,0,1);
  const entities=[...children,...activities];
  const canonical_context=[];
  const resolvedChild=children.find(entity=>entity.resolution==='resolved');
  if(resolvedChild && ['observed','direct_quote'].includes(epistemic_type)) canonical_context.push({destination:'crm_child_observation',child_id:resolvedChild.id,eligibility:'auto_store'});
  return { exact_source_excerpt, normalized_observation:normalized_observation.slice(0,1200), epistemic_type, entities, topics, age_categories, possible_canonical_context:canonical_context, confidence, provenance:{source:'daily_note',verified_excerpt:true} };
}

export async function memorySignalDedupeKey(signal) {
  return sha256(JSON.stringify({source_note_id:signal.source_note_id,source_hash:signal.source_hash,exact_source_excerpt:signal.exact_source_excerpt,normalized_observation:normal(signal.normalized_observation)}));
}

export function selectAttentionCandidates(rawCandidates, { signals = [], noteDate = '' } = {}) {
  const byId=new Map(signals.map(signal=>[signal.id,signal])); const selected=[];
  for(const raw of Array.isArray(rawCandidates)?rawCandidates:[]) {
    const title=clean(raw?.title),summary=clean(raw?.summary),why_it_matters=clean(raw?.why_it_matters),suggested_next_step=clean(raw?.suggested_next_step);
    const idsFromRefs=refs=>signals.filter(signal=>refs.some(ref=>signal.exact_source_excerpt.includes(ref)||ref.includes(signal.exact_source_excerpt))).map(signal=>signal.id);
    const evidence_signal_ids=[...new Set((Array.isArray(raw?.evidence_signal_ids)?raw.evidence_signal_ids:[]).map(clean).filter(id=>byId.has(id)).concat(idsFromRefs((Array.isArray(raw?.evidence_refs)?raw.evidence_refs:[]).map(clean).filter(Boolean))))];
    const counter_evidence_signal_ids=[...new Set((Array.isArray(raw?.counter_evidence_signal_ids)?raw.counter_evidence_signal_ids:[]).map(clean).filter(id=>byId.has(id)).concat(idsFromRefs((Array.isArray(raw?.counter_evidence_refs)?raw.counter_evidence_refs:[]).map(clean).filter(Boolean))))].filter(id=>!evidence_signal_ids.includes(id));
    const evidence=evidence_signal_ids.map(id=>byId.get(id)); const dates=new Set(evidence.map(item=>item.source_date)); const entityIds=new Set(evidence.flatMap(item=>(item.entities||[]).filter(entity=>entity.resolution==='resolved').map(entity=>`${entity.type}:${entity.id}`)));
    const hasHistorical=evidence.some(item=>item.source_date!==noteDate);
    const relevance_score=clamp(raw?.relevance_score,0,100),confidence=clamp(raw?.confidence,0,1);
    const merelyRepeatsEvidence=evidence.some(item=>similarity(`${title} ${summary}`,item.normalized_observation)>=.82);
    if(!title||!summary||!why_it_matters||!suggested_next_step||evidence.length<2||dates.size<2||!hasHistorical||relevance_score<45||confidence<.55||merelyRepeatsEvidence)continue;
    const candidate={title:title.slice(0,180),summary:summary.slice(0,900),why_it_matters:why_it_matters.slice(0,900),suggested_next_step:suggested_next_step.slice(0,900),evidence_signal_ids,counter_evidence_signal_ids,topics:[...new Set((Array.isArray(raw?.topics)?raw.topics:[]).map(clean).filter(Boolean))].slice(0,8),age_categories:[...new Set((Array.isArray(raw?.age_categories)?raw.age_categories:[]).map(clean).filter(Boolean))].slice(0,5),relevance_score,confidence,independent_evidence_count:evidence.length,date_count:dates.size,entity_count:entityIds.size,reason_for_attention:`${evidence.length} semnale din ${dates.size} zile${entityIds.size?` și ${entityIds.size} entități`:''}.`,fingerprint:normal(title)};
    const duplicate=selected.some(existing=>existing.fingerprint===candidate.fingerprint||similarity(`${existing.title} ${existing.summary}`,`${candidate.title} ${candidate.summary}`)>=.62);
    if(!duplicate)selected.push(candidate);
  }
  return selected.sort((a,b)=>(b.relevance_score+b.confidence*20)-(a.relevance_score+a.confidence*20)).slice(0,3);
}

export function historicEvidenceContext({ signals = [], crmObservations = [], activityObservations = [], knowledgeCandidates = [], monthlyEntries = [] } = {}) {
  return {
    memory_signals:signals.slice(-100).map(item=>({id:item.id,date:item.source_date,observation:item.normalized_observation,entities:item.entities,topics:item.topics,age_categories:item.age_categories,excerpt:item.exact_source_excerpt})),
    crm_observations:crmObservations.slice(-40).map(item=>({id:item.id,child_id:item.child_id,observed_at:item.observed_at,observation:item.observation})),
    activity_observations:activityObservations.slice(-40).map(item=>({id:item.id,activity_id:item.activity_id,tested_at:item.tested_at,age_categories:item.age_categories,participants:item.participants,result:item.result,observed:item.observed})),
    knowledge_candidates:knowledgeCandidates.slice(-20).map(item=>({id:item.id,target:item.target,text:item.text,status:item.status})),
    monthly_evidence:monthlyEntries.filter(item=>item.type==='evidence').slice(-30).map(item=>({id:item.id,date:item.entry_date,text:item.text,role_ids:item.role_ids}))
  };
}
