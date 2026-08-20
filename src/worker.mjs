import { EXECUTABLE_DESTINATIONS, resolveAiProposal, validateProposedChange, proposalDedupeKey, canonicalExecutionPayload, selectBriefInsights, sha256 } from './becky-inbox/core.mjs';
import { analyzeDailyNoteWithOpenAI } from './becky-inbox/analyze.mjs';
import { resolveMemorySignal, isSpeculativeMemorySignal, isTaskCandidateMemorySignal, memorySignalDedupeKey, memorySignalContentMatches, selectAttentionCandidates, historicEvidenceContext } from './becky-memory/core.mjs';
import { analyzeDailyNoteForMemory } from './becky-memory/analyze.mjs';

const ROUTES = new Map([
  ['/', '/coming-soon.html'],
  ['/admin', '/admin/index.html'],
  ['/admin/', '/admin/index.html'],
  ['/admin/biblioteca-copii', '/admin/children-library.html'],
  ['/admin/biblioteca-activitati-copii', '/admin/children-library.html'],
  ['/petreceri', '/petreceri.html'],
  ['/evenimente', '/evenimente.html'],
  ['/comunitate', '/comunitate.html'],
  ['/chestionare', '/chestionare.html'],
  ['/chestionar-evenimente', '/chestionar-evenimente.html'],
  ['/chestionar-loc-de-joaca', '/chestionar-loc-de-joaca.html']
]);

const HTML_ASSET_VERSION = '20260807-3';

const DOCUMENT_KEYS = {
  '/api/manual': 'manual',
  '/api/styles': 'styles',
  '/api/workspaces': 'workspaces'
};

const SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS,
      ...extraHeaders
    }
  });
}

function withSecurityHeaders(response) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) next.headers.set(key, value);
  return next;
}

function requireEnvironment(env) {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

async function readJson(request, maxBytes) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw Object.assign(new Error('Content-Type must be application/json'), { status: 415 });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw Object.assign(new Error('Request too large'), { status: 413 });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const requestUrl = new URL(request.url);
  if (new URL(origin).host !== requestUrl.host) {
    throw Object.assign(new Error('Cross-origin write rejected'), { status: 403 });
  }
}

async function supabaseRequest(env, path, init = {}) {
  requireEnvironment(env);
  const headers = new Headers(init.headers);
  headers.set('apikey', env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${env.SUPABASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Supabase request failed', response.status, detail.slice(0, 500));
    throw Object.assign(new Error('Database request failed'), { status: 502 });
  }
  return response;
}

const ADMIN_TASK_COLUMNS = 'id,area,title,detail,owner,priority,sort_order,created_at,updated_at';
const CONTENT_LAB_IDEA_TYPES = ['growth_story', 'behind_the_scenes', 'authority_expertise', 'reusable_insight'];
const CONTENT_LAB_IDEA_STATUSES = ['active', 'archived'];
const CONTENT_LAB_IDEA_COLUMNS = 'id,idea_type,title,core_thought,status,source_type,source_id,created_at,updated_at';
const EVENT_FINDING_KINDS = ['observation', 'feedback', 'component_idea', 'hypothesis', 'pilot_result'];
const EVENT_FINDING_COLUMNS = 'id,kind,text,event_ref,concept_ref,source_type,source_id,created_at,updated_at';
const KNOWLEDGE_CANDIDATE_TARGETS = ['operational_manual', 'puieti_de_oameni', 'community_guide', 'strategic_plan'];
const KNOWLEDGE_CANDIDATE_STATUSES = ['proposed', 'approved', 'rejected'];
const KNOWLEDGE_CANDIDATE_COLUMNS = 'id,target,text,status,source_type,source_id,created_at,updated_at';
const BECKY_INBOX_COLUMNS = 'id,source_type,source_id,source_version,source_hash,source_excerpt,destination,operation,target_entity_type,target_entity_id,target_candidates,resolution_status,resolution_query,payload,field_provenance,status,validation_errors,missing_fields,destination_entity_id,destination_verified_at,destination_entity_updated_at,reverted_at,revert_error,dedupe_key,created_at,updated_at,executed_at,last_error';
const BECKY_BRIEF_COLUMNS = 'id,source_type,source_id,source_version,source_hash,insight_title,insight_summary,why_it_matters,recommended_action,evidence_refs,category,relevance_score,confidence,rank_score,related_proposal_ids,sort_order,created_at,updated_at';
const BECKY_MEMORY_COLUMNS = 'id,source_type,source_note_id,source_version,source_hash,source_date,exact_source_excerpt,normalized_observation,epistemic_type,entities,topics,age_categories,possible_canonical_context,canonical_context,confidence,provenance,dedupe_key,created_at,updated_at';
const BECKY_ATTENTION_COLUMNS = 'id,fingerprint,title,summary,why_it_matters,suggested_next_step,evidence_signal_ids,counter_evidence_signal_ids,topics,age_categories,relevance_score,confidence,independent_evidence_count,date_count,entity_count,reason_for_attention,status,knowledge_candidate_id,created_at,updated_at';
const MONTHLY_REPORT_ROLES = [
  ['experienta-copilului', 'Experiența copilului'], ['relatia-cu-parintii', 'Relația cu părinții'], ['design-pedagogic', 'Design pedagogic'], ['cultura-experienta-becky', 'Cultura & experiența Becky'], ['marketing-comunicare', 'Marketing & comunicare'], ['sisteme-tehnologie', 'Sisteme & tehnologie'], ['operatiuni-logistica', 'Operațiuni & logistică'], ['strategie-dezvoltare', 'Strategie & dezvoltare']
];
const MONTHLY_REPORT_SECTION_KEYS = ['scope', 'objectives', 'metrics', 'done', 'evidence', 'learned', 'next_step'];
const MONTHLY_REPORT_STATUSES = ['În parametri', 'Necesită atenție', 'În urmă', 'Fără suficiente date'];
const MONTHLY_REPORT_COLUMNS = 'id,month_key,label,status,scope,objectives,metrics,done,evidence,learned,next_step,sort_order,created_at,updated_at';
const MONTHLY_REPORT_ENTRY_TYPES = ['done', 'evidence', 'learned'];
const MONTHLY_REPORT_ENTRY_COLUMNS = 'id,month_key,entry_date,type,text,role_ids,source_type,source_id,created_at,updated_at';
const EXPERIENCE_REPERTOIRE_STAGES = ['welcome', 'surprise_connect', 'next_visit_thread', 'memorable_close'];
const EXPERIENCE_REPERTOIRE_AGES = ['age_2', 'age_3', 'age_4_5', 'age_6_7', 'age_8_plus'];
const EXPERIENCE_REPERTOIRE_AGE_MAP = { age_2: ['1–2 ani'], age_3: ['3–4 ani'], age_4_5: ['5–6 ani'], age_6_7: ['7–8 ani'], age_8_plus: ['9+ ani'] };
const EXPERIENCE_REPERTOIRE_COLUMNS = 'id,stage,title,description,age_groups,status,family,fallback_item_id,source_type,source_id,created_at,updated_at';
const PEDAGOGIC_AGES = ['1–2 ani','3–4 ani','5–6 ani','7–8 ani','9+ ani'];
const PEDAGOGIC_PARTICIPANTS = ['Individual','2–3 copii','4–9 copii','10+ copii'];
const PEDAGOGIC_CATEGORIES = ['Gândește','Simte','Colaborează','Devine independent','Creează','Se mișcă'];
const BECKY_THEMED_COLUMNS = 'id,title,subtitle,age_categories,participant_categories,duration_categories,category,skills,implementation,materials,steps,rules,facilitator,easier,harder,caution,reflection,status,created_at,updated_at';
const ACTIVITY_OBSERVATION_COLUMNS = 'id,activity_id,tested_at,age_categories,participants,result,observed,interpreted,hypothesized,action,capacity,behavior_observed,behaviors,created_at,updated_at';
const ACTIVITY_PARTICIPANTS = ['Individual', '2–3 copii', '4–9 copii', '10+ copii'];
const ACTIVITY_RESULTS = ['A mers bine', 'Mixt', 'Nu a mers'];
function normalizeContentLabIdeaInput(input, existing = {}) {
  const id = String(input?.id || existing.id || crypto.randomUUID()).trim(); const idea_type = String(input?.idea_type || existing.idea_type || '').trim(); const title = String(input?.title ?? existing.title ?? '').trim(); const core_thought = String(input?.core_thought ?? existing.core_thought ?? input?.text ?? existing.text ?? '').trim(); const status = String(input?.status || existing.status || 'active').trim(); const source_type = input?.source_type === null ? null : String(input?.source_type ?? existing.source_type ?? '').trim() || null; const source_id = input?.source_id === null ? null : String(input?.source_id ?? existing.source_id ?? '').trim() || null;
  if (!id || !CONTENT_LAB_IDEA_TYPES.includes(idea_type) || !core_thought || !CONTENT_LAB_IDEA_STATUSES.includes(status)) throw Object.assign(new Error('Content Lab idea invalid'), { status: 400 });
  if (title.length > 500 || core_thought.length > 10000 || (source_type && source_type.length > 100) || (source_id && source_id.length > 200)) throw Object.assign(new Error('Content Lab idea too long'), { status: 400 });
  return { id, idea_type, title, core_thought, status, source_type, source_id, created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
}
function normalizeEventFindingInput(input, existing = {}) {
  const id = String(input?.id || existing.id || crypto.randomUUID()).trim(); const kind = String(input?.kind || existing.kind || '').trim(); const text = String(input?.text ?? existing.text ?? '').trim(); const nullable = key => input?.[key] === null ? null : String(input?.[key] ?? existing[key] ?? '').trim() || null;
  const event_ref = nullable('event_ref'); const concept_ref = nullable('concept_ref'); const source_type = nullable('source_type'); const source_id = nullable('source_id');
  if (!id || !EVENT_FINDING_KINDS.includes(kind) || !text) throw Object.assign(new Error('Event finding invalid'), { status: 400 });
  if (text.length > 10000 || [event_ref, concept_ref, source_type, source_id].some((value, index) => value && value.length > (index < 2 ? 300 : index === 2 ? 100 : 200))) throw Object.assign(new Error('Event finding too long'), { status: 400 });
  return { id, kind, text, event_ref, concept_ref, source_type, source_id, created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
}
function normalizeKnowledgeCandidateInput(input, existing = {}) {
  const id = String(input?.id || existing.id || crypto.randomUUID()).trim(); const target = String(input?.target || existing.target || '').trim(); const text = String(input?.text ?? existing.text ?? '').trim(); const status = String(input?.status || existing.status || 'proposed').trim(); const source_type = input?.source_type === null ? null : String(input?.source_type ?? existing.source_type ?? '').trim() || null; const source_id = input?.source_id === null ? null : String(input?.source_id ?? existing.source_id ?? '').trim() || null;
  if (!id || !KNOWLEDGE_CANDIDATE_TARGETS.includes(target) || !KNOWLEDGE_CANDIDATE_STATUSES.includes(status) || !text) throw Object.assign(new Error('Knowledge candidate invalid'), { status: 400 });
  if (text.length > 10000 || (source_type && source_type.length > 100) || (source_id && source_id.length > 200)) throw Object.assign(new Error('Knowledge candidate too long'), { status: 400 });
  return { id, target, text, status, source_type, source_id, created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
}
function normalizeActivityObservationInput(input, existing = {}) {
  const id = String(input?.id || existing.id || crypto.randomUUID()).trim(); const activity_id = String(input?.activity_id || existing.activity_id || '').trim(); const tested_at = String(input?.tested_at || existing.tested_at || '').trim(); const age_categories = Array.isArray(input?.age_categories ?? existing.age_categories) ? (input.age_categories ?? existing.age_categories).map(String) : []; const participants = String(input?.participants || existing.participants || '').trim(); const result = String(input?.result || existing.result || '').trim(); const observed = String(input?.observed ?? existing.observed ?? '').trim();
  if (!id || !activity_id || !/^\d{4}-\d{2}-\d{2}$/.test(tested_at) || !ACTIVITY_PARTICIPANTS.includes(participants) || !ACTIVITY_RESULTS.includes(result) || !observed) throw Object.assign(new Error('Activity observation invalid'), { status: 400 });
  const behaviors = Array.isArray(input?.behaviors ?? existing.behaviors) ? (input?.behaviors ?? existing.behaviors).map(item => ({ label: String(item?.label || '').trim(), status: ['Da','Parțial','Nu'].includes(item?.status) ? item.status : '' })).filter(item => item.label) : [];
  return { id, activity_id, tested_at, age_categories, participants, result, observed, interpreted: String(input?.interpreted ?? existing.interpreted ?? '').trim(), hypothesized: String(input?.hypothesized ?? existing.hypothesized ?? '').trim(), action: String(input?.action ?? existing.action ?? '').trim(), capacity: String(input?.capacity ?? existing.capacity ?? '').trim(), behavior_observed: input?.behavior_observed === null || input?.behavior_observed === undefined ? (existing.behavior_observed ?? null) : Boolean(input.behavior_observed), behaviors, created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
}
function normalizeExperienceRepertoireInput(input, existing = {}) {
  const id = String(input?.id || existing.id || crypto.randomUUID()).trim(); const stage = String(input?.stage || existing.stage || '').trim(); const title = String(input?.title || existing.title || '').trim(); const description = String(input?.description ?? existing.description ?? '').trim(); const age_groups = Array.isArray(input?.age_groups ?? existing.age_groups) ? [...new Set((input.age_groups ?? existing.age_groups).map(String).filter(value => EXPERIENCE_REPERTOIRE_AGES.includes(value)))] : []; const status = String(input?.status || existing.status || 'active').trim(); const nullable = key => input?.[key] === null ? null : String(input?.[key] ?? existing[key] ?? '').trim() || null; const source_type = nullable('source_type'); const source_id = nullable('source_id'); const family = nullable('family'); const fallback_item_id = nullable('fallback_item_id');
  if (!id || !EXPERIENCE_REPERTOIRE_STAGES.includes(stage) || !title || !age_groups.length || !['active', 'archived'].includes(status)) throw Object.assign(new Error('Experience repertoire invalid'), { status: 400 });
  if (title.length > 180 || description.length > 5000 || (source_type && source_type.length > 100) || (source_id && source_id.length > 200)) throw Object.assign(new Error('Experience repertoire too long'), { status: 400 });
  const overlaysInput = Array.isArray(input?.age_overlays) ? input.age_overlays : (Array.isArray(existing.age_overlays) ? existing.age_overlays : []);
  const age_overlays = age_groups.map(age => { const item = overlaysInput.find(overlay => overlay.age_group === age) || {}; const validation_status = ['idea','validated'].includes(String(item.validation_status || 'idea')) ? String(item.validation_status || 'idea') : 'idea'; return { age_group: age, validation_status, age_specific_note: item.age_specific_note ? String(item.age_specific_note).trim() : null, restriction: item.restriction ? String(item.restriction).trim() : null }; });
  return { id, stage, title, description, age_groups, status, family, fallback_item_id, age_overlays, source_type, source_id, created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
}
function normalizeBeckyThemedActivityInput(input, existing = {}) {
  const id = String(input?.id || existing.id || crypto.randomUUID()).trim(); const text = key => String(input?.[key] ?? existing[key] ?? '').trim(); const list = key => [...new Set((Array.isArray(input?.[key] ?? existing[key]) ? (input?.[key] ?? existing[key]) : []).map(String).map(value => value.trim()).filter(Boolean))]; const age_categories = list('age_categories').filter(value => PEDAGOGIC_AGES.includes(value)); const participant_categories = list('participant_categories').filter(value => PEDAGOGIC_PARTICIPANTS.includes(value)); const validations = (Array.isArray(input?.validations ?? existing.validations) ? (input?.validations ?? existing.validations) : []).map(value => ({ age_category: String(value?.age_category || '').trim(), participant_category: String(value?.participant_category || '').trim(), validation_status: ['idea','validated'].includes(value?.validation_status) ? value.validation_status : 'idea' })).filter(value => age_categories.includes(value.age_category) && participant_categories.includes(value.participant_category));
  const item = { id, title: text('title'), subtitle: text('subtitle'), age_categories, participant_categories, duration_categories: list('duration_categories'), category: text('category'), skills: text('skills'), implementation: text('implementation'), materials: text('materials'), steps: text('steps'), rules: text('rules'), facilitator: text('facilitator'), easier: text('easier'), harder: text('harder'), caution: text('caution'), reflection: text('reflection'), status: text('status') || 'active', validations, created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!id || !item.title || !item.age_categories.length || !item.participant_categories.length || !PEDAGOGIC_CATEGORIES.includes(item.category) || !item.implementation || !['active','archived'].includes(item.status)) throw Object.assign(new Error('Becky themed activity invalid'), { status: 400 });
  return item;
}
function experienceRepertoireActivities(workspaces) {
  const childrenWorkspace = (workspaces.workspaces || []).find(item => item.id === 'children'); const activities = (childrenWorkspace?.activities || []).filter(item => item?.title && item.title !== 'Activitate nouă');
  const ranges = value => { const nums = String(value || '').match(/\d+/g)?.map(Number) || []; return nums.length > 1 ? [nums[0], nums[1]] : nums.length ? [nums[0], /\+/.test(value) ? 99 : nums[0]] : [0, 99]; };
  const counts = Object.fromEntries(EXPERIENCE_REPERTOIRE_AGES.map(age => [age, 0])); const previews = Object.fromEntries(EXPERIENCE_REPERTOIRE_AGES.map(age => [age, []]));
  for (const activity of activities) { const source = Array.isArray(activity.ageCategories) && activity.ageCategories.length ? activity.ageCategories : [activity.age]; for (const age of EXPERIENCE_REPERTOIRE_AGES) if (source.some(value => EXPERIENCE_REPERTOIRE_AGE_MAP[age].some(filter => { const [a,b]=ranges(value); const [c,d]=ranges(filter); return a<=d && b>=c; }))) { counts[age]++; if (previews[age].length < 3) previews[age].push({ id: activity.id, title: activity.title }); } }
  return { activity_counts: counts, activity_coverage: Object.fromEntries(EXPERIENCE_REPERTOIRE_AGES.map(age => [age, { idea: counts[age], validated: 0 }])), activity_previews: previews };
}
function pedagogicActivityAges(activity) { const source = Array.isArray(activity.ageCategories) && activity.ageCategories.length ? activity.ageCategories : [activity.age]; const range = value => { const nums = String(value || '').match(/\d+/g)?.map(Number) || []; return nums.length > 1 ? [nums[0], nums[1]] : nums.length ? [nums[0], /\+/.test(String(value)) ? 99 : nums[0]] : [0, 99]; }; return PEDAGOGIC_AGES.filter(filter => source.some(value => { const [a,b] = range(value); const [c,d] = range(filter); return a <= d && b >= c; })); }
function pedagogicActivityParticipants(activity) { const explicit = Array.isArray(activity.participantCategories) ? activity.participantCategories : []; if (explicit.length) return PEDAGOGIC_PARTICIPANTS.filter(value => explicit.includes(value)); const text = String(activity.participants || activity.group || '').toLowerCase(); if (/individual|1\s*copil/.test(text)) return ['Individual']; if (/grup\s*mare|10\+|7\+/.test(text)) return ['10+ copii']; if (/grup\s*mediu|4\s*[-–]\s*6/.test(text)) return ['4–9 copii']; if (/grup\s*mic|2\s*[-–]\s*3/.test(text)) return ['2–3 copii']; return []; }
function pedagogicCoverage(workspaces, themed) { const children = (workspaces.workspaces || []).find(item => item.id === 'children'); const library = (children?.activities || []).filter(item => item?.title && item.title !== 'Activitate nouă'); const build = (activities, source) => PEDAGOGIC_AGES.map(age => ({ age, cells: PEDAGOGIC_PARTICIPANTS.map(participant => ({ participant, domains: PEDAGOGIC_CATEGORIES.map(category => { const relevant = activities.filter(activity => (source === 'library' ? pedagogicActivityAges(activity).includes(age) && pedagogicActivityParticipants(activity).includes(participant) && (activity.category || 'Gândește') === category : activity.age_categories.includes(age) && activity.participant_categories.includes(participant) && activity.category === category)); const validated = source === 'library' ? 0 : relevant.filter(activity => (activity.validations || []).some(value => value.age_category === age && value.participant_category === participant && value.validation_status === 'validated')).length; return { category, ideas: relevant.length, validated }; }) })) })); return { library: build(library, 'library'), themed: build(themed.filter(item => item.status === 'active'), 'themed'), themed_activities: themed.filter(item => item.status === 'active'), library_activities: library.map(item => ({ id:item.id,title:item.title,category:item.category || 'Gândește',age_categories:pedagogicActivityAges(item),participant_categories:pedagogicActivityParticipants(item),implementation:item.difficulty || '' })) }; }
async function handleActivityObservations(request, env) {
  await requireAdmin(request, env); const url = new URL(request.url);
  if (request.method === 'GET') { const activityId = String(url.searchParams.get('activity_id') || '').trim(); const filter = activityId ? `&activity_id=eq.${encodeURIComponent(activityId)}` : ''; const response = await supabaseRequest(env, `/rest/v1/admin_activity_observations?select=${ACTIVITY_OBSERVATION_COLUMNS}${filter}&order=tested_at.desc,created_at.desc`); return json({ observations: await response.json() }); }
  assertSameOrigin(request); const match = url.pathname.match(/^\/api\/admin\/activity-observations\/([^/?]+)$/);
  if (request.method === 'POST') { const item = normalizeActivityObservationInput(await readJson(request, 100_000)); const response = await supabaseRequest(env, '/rest/v1/admin_activity_observations?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0], 201); }
  if (!match) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
  const id = decodeURIComponent(match[1]); if (request.method === 'DELETE') { await supabaseRequest(env, `/rest/v1/admin_activity_observations?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); return json({ ok: true }); }
  if (request.method === 'PATCH') { const body = await readJson(request, 100_000); const currentResponse = await supabaseRequest(env, `/rest/v1/admin_activity_observations?id=eq.${encodeURIComponent(id)}&select=${ACTIVITY_OBSERVATION_COLUMNS}`); const current = (await currentResponse.json())[0]; if (!current) return json({ error: 'Testarea nu a fost găsită' }, 404); const item = normalizeActivityObservationInput({ ...current, ...body, id }, current); const response = await supabaseRequest(env, `/rest/v1/admin_activity_observations?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0]); }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
}
async function handleExperienceRepertoire(request, env) {
  await requireAdmin(request, env); const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/admin/experience-repertoire') { const [itemsResponse, overlaysResponse, workspaces] = await Promise.all([supabaseRequest(env, `/rest/v1/admin_experience_repertoire_items?select=${EXPERIENCE_REPERTOIRE_COLUMNS}&order=updated_at.desc`), supabaseRequest(env, '/rest/v1/admin_experience_repertoire_age_overlays?select=id,item_id,age_group,validation_status,age_specific_note,restriction,created_at,updated_at'), getDocument(env, 'workspaces')]); const items = (await itemsResponse.json()).filter(item => item.status === 'active'); const overlays = await overlaysResponse.json(); const byItem = new Map(); for (const overlay of overlays) { if (!byItem.has(overlay.item_id)) byItem.set(overlay.item_id, []); byItem.get(overlay.item_id).push(overlay); } for (const item of items) item.age_overlays = byItem.get(item.id) || []; const coverage = Object.fromEntries(EXPERIENCE_REPERTOIRE_AGES.map(age => [age, Object.fromEntries(EXPERIENCE_REPERTOIRE_STAGES.map(stage => { const relevant = items.filter(item => item.stage === stage && item.age_groups?.includes(age)); return [stage, { idea: relevant.filter(item => (item.age_overlays || []).find(overlay => overlay.age_group === age)?.validation_status !== 'validated').length, validated: relevant.filter(item => (item.age_overlays || []).find(overlay => overlay.age_group === age)?.validation_status === 'validated').length }]; }))])); const activities = experienceRepertoireActivities(workspaces); return json({ items, coverage, ...activities }); }
  assertSameOrigin(request); const itemMatch = url.pathname.match(/^\/api\/admin\/experience-repertoire\/([^/?]+)$/);
  if (request.method === 'POST' && url.pathname === '/api/admin/experience-repertoire') { const item = normalizeExperienceRepertoireInput(await readJson(request, 40_000)); const { age_overlays, ...itemRow } = item; const response = await supabaseRequest(env, '/rest/v1/admin_experience_repertoire_items?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(itemRow) }); const saved = (await response.json())[0]; if (age_overlays.length) await supabaseRequest(env, '/rest/v1/admin_experience_repertoire_age_overlays', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(age_overlays.map(overlay => ({ ...overlay, item_id: saved.id }))) }); return json({ ...saved, age_overlays }, 201); }
  if (!itemMatch) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' }); const id = decodeURIComponent(itemMatch[1]);
  if (request.method === 'DELETE') { const response = await supabaseRequest(env, `/rest/v1/admin_experience_repertoire_items?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'archived', updated_at: new Date().toISOString() }) }); return json((await response.json())[0] || { ok: true }); }
  if (request.method === 'PATCH') { const currentResponse = await supabaseRequest(env, `/rest/v1/admin_experience_repertoire_items?id=eq.${encodeURIComponent(id)}&select=${EXPERIENCE_REPERTOIRE_COLUMNS}`); const current = (await currentResponse.json())[0]; if (!current) return json({ error: 'Ideea nu a fost găsită' }, 404); const currentOverlaysResponse = await supabaseRequest(env, `/rest/v1/admin_experience_repertoire_age_overlays?item_id=eq.${encodeURIComponent(id)}&select=id,item_id,age_group,validation_status,age_specific_note,restriction,created_at,updated_at`); const currentOverlays = await currentOverlaysResponse.json(); const body = await readJson(request, 40_000); const item = normalizeExperienceRepertoireInput({ ...current, ...body, age_overlays: body.age_overlays ?? currentOverlays, id }, current); const { age_overlays, ...itemRow } = item; const response = await supabaseRequest(env, `/rest/v1/admin_experience_repertoire_items?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(itemRow) }); await supabaseRequest(env, `/rest/v1/admin_experience_repertoire_age_overlays?item_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); if (age_overlays.length) await supabaseRequest(env, '/rest/v1/admin_experience_repertoire_age_overlays', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(age_overlays.map(overlay => ({ item_id: id, age_group: overlay.age_group, validation_status: overlay.validation_status, age_specific_note: overlay.age_specific_note, restriction: overlay.restriction }))) }); return json({ ...(await response.json())[0], age_overlays }); }
  return json({ error: 'Method not allowed' }, 405);
}
async function handleBeckyThemedActivities(request, env) {
  await requireAdmin(request, env); const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/admin/pedagogic-coverage') { const [workspaces, activitiesResponse, validationsResponse, libraryValidationsResponse] = await Promise.all([getDocument(env, 'workspaces'), supabaseRequest(env, `/rest/v1/admin_becky_themed_activities?select=${BECKY_THEMED_COLUMNS}&status=eq.active`), supabaseRequest(env, '/rest/v1/admin_becky_themed_activity_validations?select=id,activity_id,age_category,participant_category,validation_status'), supabaseRequest(env, '/rest/v1/admin_children_activity_validations?select=id,activity_id,age_category,participant_category,validation_status')]); const activities = await activitiesResponse.json(); const validations = await validationsResponse.json(); const libraryValidations = await libraryValidationsResponse.json(); const byId = new Map(); for (const validation of validations) { if (!byId.has(validation.activity_id)) byId.set(validation.activity_id, []); byId.get(validation.activity_id).push(validation); } for (const item of activities) item.validations = byId.get(item.id) || []; const children = (workspaces.workspaces || []).find(item => item.id === 'children'); for (const item of (children?.activities || [])) item.validations = libraryValidations.filter(value => value.activity_id === item.id); return json(pedagogicCoverage(workspaces, activities)); }
  if (request.method === 'POST' && url.pathname === '/api/admin/children-activity-validations') { const body = await readJson(request, 20_000); const activity_id = String(body?.activity_id || '').trim(); const age_category = String(body?.age_category || '').trim(); const participant_category = String(body?.participant_category || '').trim(); const validation_status = String(body?.validation_status || '').trim(); if (!activity_id || !PEDAGOGIC_AGES.includes(age_category) || !PEDAGOGIC_PARTICIPANTS.includes(participant_category) || !['idea','validated'].includes(validation_status)) return json({ error:'Validare invalidă' },400); const id = crypto.randomUUID(); const response = await supabaseRequest(env, '/rest/v1/admin_children_activity_validations?on_conflict=activity_id,age_category,participant_category', { method:'POST', headers:{ Prefer:'resolution=merge-duplicates,return=representation' }, body:JSON.stringify({ id, activity_id, age_category, participant_category, validation_status, updated_at:new Date().toISOString() }) }); return json((await response.json())[0] || { id, activity_id, age_category, participant_category, validation_status }); }
  if (request.method === 'GET' && url.pathname === '/api/admin/becky-themed-activities') { const [activitiesResponse, validationsResponse] = await Promise.all([supabaseRequest(env, `/rest/v1/admin_becky_themed_activities?select=${BECKY_THEMED_COLUMNS}&status=eq.active&order=updated_at.desc`), supabaseRequest(env, '/rest/v1/admin_becky_themed_activity_validations?select=id,activity_id,age_category,participant_category,validation_status')]); const activities = await activitiesResponse.json(); const validations = await validationsResponse.json(); for (const item of activities) item.validations = validations.filter(value => value.activity_id === item.id); return json({ activities }); }
  assertSameOrigin(request); const match = url.pathname.match(/^\/api\/admin\/becky-themed-activities\/([^/?]+)$/);
  if (request.method === 'POST' && url.pathname === '/api/admin/becky-themed-activities') { const item = normalizeBeckyThemedActivityInput(await readJson(request, 100_000)); const { validations, ...row } = item; const response = await supabaseRequest(env, '/rest/v1/admin_becky_themed_activities?on_conflict=id', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(row) }); const saved = (await response.json())[0]; if (validations.length) await supabaseRequest(env, '/rest/v1/admin_becky_themed_activity_validations', { method:'POST', headers:{ Prefer:'return=minimal' }, body:JSON.stringify(validations.map(value => ({ ...value, activity_id:saved.id }))) }); return json({ ...saved, validations }, 201); }
  if (!match || !['PATCH','DELETE'].includes(request.method)) return json({ error:'Method not allowed' },405,{Allow:'GET, POST, PATCH, DELETE'}); const id = decodeURIComponent(match[1]);
  if (request.method === 'DELETE') { await supabaseRequest(env, `/rest/v1/admin_becky_themed_activities?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body:JSON.stringify({ status:'archived', updated_at:new Date().toISOString() }) }); return json({ ok:true }); }
  const currentResponse = await supabaseRequest(env, `/rest/v1/admin_becky_themed_activities?id=eq.${encodeURIComponent(id)}&select=${BECKY_THEMED_COLUMNS}`); const current = (await currentResponse.json())[0]; if (!current) return json({ error:'Activitatea tematică nu a fost găsită' },404); const currentValidationsResponse = await supabaseRequest(env, `/rest/v1/admin_becky_themed_activity_validations?activity_id=eq.${encodeURIComponent(id)}&select=id,activity_id,age_category,participant_category,validation_status`); const body = await readJson(request,100_000); const item = normalizeBeckyThemedActivityInput({ ...current, ...body, validations: body.validations ?? await currentValidationsResponse.json(), id }, current); const { validations, ...row } = item; const response = await supabaseRequest(env, `/rest/v1/admin_becky_themed_activities?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify(row) }); await supabaseRequest(env, `/rest/v1/admin_becky_themed_activity_validations?activity_id=eq.${encodeURIComponent(id)}`, { method:'DELETE' }); if (validations.length) await supabaseRequest(env, '/rest/v1/admin_becky_themed_activity_validations', { method:'POST', headers:{ Prefer:'return=minimal' }, body:JSON.stringify(validations.map(value => ({ activity_id:id, ...value }))) }); return json({ ...(await response.json())[0], validations });
}
function monthlyReportDefaults() {
  const now = new Date().toISOString();
  return MONTHLY_REPORT_ROLES.map(([id, label], sort_order) => ({ id, month_key: '2026-08', label, status: 'Fără suficiente date', scope: '', objectives: '', metrics: '', done: '', evidence: '', learned: '', next_step: '', sort_order, created_at: now, updated_at: now }));
}
function monthlyRoleView(row) { return { id: row.id, label: row.label, status: row.status, sort_order: row.sort_order, created_at: row.created_at, updated_at: row.updated_at, notes: row.notes && typeof row.notes === 'object' ? row.notes : {}, sections: Object.fromEntries(MONTHLY_REPORT_SECTION_KEYS.map(key => [key, row[key] || ''])) }; }
function normalizeMonthlyReportEntryInput(input, existing = {}, monthKey = '2026-08') {
  const id = String(input?.id || existing.id || crypto.randomUUID()).trim(); const month_key = String(input?.month_key || existing.month_key || monthKey).trim(); const entry_date = String(input?.entry_date || existing.entry_date || '').trim(); const type = String(input?.type || existing.type || '').trim(); const text = String(input?.text ?? existing.text ?? '').trim(); const role_ids = Array.isArray(input?.role_ids ?? existing.role_ids) ? [...new Set((input.role_ids ?? existing.role_ids).map(String).map(value => value.trim()).filter(Boolean))] : []; const source_type = input?.source_type === null ? null : String(input?.source_type ?? existing.source_type ?? '').trim() || null; const source_id = input?.source_id === null ? null : String(input?.source_id ?? existing.source_id ?? '').trim() || null;
  const validRoles = new Set(MONTHLY_REPORT_ROLES.map(([roleId]) => roleId));
  if (!id || !/^\d{4}-\d{2}$/.test(month_key) || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date) || !MONTHLY_REPORT_ENTRY_TYPES.includes(type) || !text || !role_ids.length || role_ids.some(roleId => !validRoles.has(roleId))) throw Object.assign(new Error('Monthly report entry invalid'), { status: 400 });
  if (text.length > 5000 || (source_type && source_type.length > 100) || (source_id && source_id.length > 200)) throw Object.assign(new Error('Monthly report entry too long'), { status: 400 });
  return { id, month_key, entry_date, type, text, role_ids, source_type, source_id, created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
}
async function handleAdminMonthlyReport(request, env) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/admin/monthly-report') {
    const [response, notesResponse] = await Promise.all([supabaseRequest(env, `/rest/v1/admin_monthly_report_roles?select=${MONTHLY_REPORT_COLUMNS}&order=sort_order.asc`), supabaseRequest(env, '/rest/v1/admin_monthly_report_notes?select=note_date,note&order=note_date.desc')]);
    const rows = await response.json(); const noteRows = await notesResponse.json();
    const byId = new Map(rows.map(row => [row.id, row]));
    return json({ report: { month_key: '2026-08', due_date: '2026-09-02', notes: Object.fromEntries(noteRows.map(row => [row.note_date, row.note])), roles: monthlyReportDefaults().map(def => monthlyRoleView(byId.get(def.id) || def)) } });
  }
  if (request.method === 'PATCH' && url.pathname === '/api/admin/monthly-report/notes') {
    const body = await readJson(request, 200_000); const date = String(body?.date || '').trim(); const text = String(body?.text || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Notă invalidă' }, 400);
    if (text) await supabaseRequest(env, '/rest/v1/admin_monthly_report_notes?on_conflict=note_date', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ note_date: date, note: text, updated_at: new Date().toISOString() }) });
    else await supabaseRequest(env, `/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(date)}`, { method: 'DELETE' });
    return json({ ok: true });
  }
  if (request.method === 'GET' && url.pathname === '/api/admin/monthly-report/entries') {
    const monthKey = String(url.searchParams.get('month_key') || '2026-08').trim(); const roleId = String(url.searchParams.get('role_id') || '').trim();
    if (!/^\d{4}-\d{2}$/.test(monthKey) || (roleId && !MONTHLY_REPORT_ROLES.some(([id]) => id === roleId))) return json({ error: 'Filtru invalid' }, 400);
    const response = await supabaseRequest(env, `/rest/v1/admin_monthly_report_entries?select=${MONTHLY_REPORT_ENTRY_COLUMNS}&month_key=eq.${encodeURIComponent(monthKey)}&order=entry_date.desc,created_at.desc`); let entries = await response.json();
    if (roleId) entries = entries.filter(entry => Array.isArray(entry.role_ids) && entry.role_ids.includes(roleId));
    return json({ entries });
  }
  assertSameOrigin(request);
  const monthlyEntryMatch = url.pathname.match(/^\/api\/admin\/monthly-report\/entries\/([^/?]+)$/);
  if (request.method === 'POST' && url.pathname === '/api/admin/monthly-report/entries') {
    const item = normalizeMonthlyReportEntryInput(await readJson(request, 40_000)); const response = await supabaseRequest(env, '/rest/v1/admin_monthly_report_entries?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0], 201);
  }
  if (monthlyEntryMatch && ['PATCH', 'DELETE'].includes(request.method)) {
    const id = decodeURIComponent(monthlyEntryMatch[1]);
    if (request.method === 'DELETE') { await supabaseRequest(env, `/rest/v1/admin_monthly_report_entries?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); return json({ ok: true }); }
    const currentResponse = await supabaseRequest(env, `/rest/v1/admin_monthly_report_entries?id=eq.${encodeURIComponent(id)}&select=${MONTHLY_REPORT_ENTRY_COLUMNS}`); const current = (await currentResponse.json())[0]; if (!current) return json({ error: 'Intrarea nu a fost găsită' }, 404); const item = normalizeMonthlyReportEntryInput({ ...current, ...await readJson(request, 40_000), id }, current, current.month_key); const response = await supabaseRequest(env, `/rest/v1/admin_monthly_report_entries?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0]);
  }
  const match = url.pathname.match(/^\/api\/admin\/monthly-report\/roles\/([^/?]+)$/);
  if (request.method === 'PATCH' && match) {
    const id = decodeURIComponent(match[1]);
    const body = await readJson(request, 40_000);
    const allowed = new Set(MONTHLY_REPORT_SECTION_KEYS);
    const update = { updated_at: new Date().toISOString() };
    if (body?.status !== undefined) { const status = String(body.status); if (!MONTHLY_REPORT_STATUSES.includes(status)) return json({ error: 'Status invalid' }, 400); update.status = status; }
    for (const key of MONTHLY_REPORT_SECTION_KEYS) if (body?.sections?.[key] !== undefined) { const value = String(body.sections[key] || '').trim(); if (value.length > 5000) return json({ error: 'Secțiune prea lungă' }, 400); update[key] = value; }
    if (Object.keys(update).length === 1) return json({ error: 'Nicio modificare' }, 400);
    const response = await supabaseRequest(env, `/rest/v1/admin_monthly_report_roles?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) });
    const rows = await response.json();
    if (!rows.length) return json({ error: 'Rolul nu a fost găsit' }, 404);
    return json({ role: monthlyRoleView(rows[0]) });
  }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, PATCH' });
}

async function handleContentLabIdeas(request, env) {
  await requireAdmin(request, env); const url = new URL(request.url);
  if (request.method === 'GET') {
    const status = String(url.searchParams.get('status') || '').trim(); if (status && !CONTENT_LAB_IDEA_STATUSES.includes(status)) return json({ error: 'Filtru invalid' }, 400);
    const filter = status ? `&status=eq.${encodeURIComponent(status)}` : '';
    const response = await supabaseRequest(env, `/rest/v1/admin_content_lab_ideas?select=${CONTENT_LAB_IDEA_COLUMNS}${filter}&order=updated_at.desc,created_at.desc`); return json({ ideas: await response.json() });
  }
  assertSameOrigin(request);
  if (request.method === 'POST') { const item = normalizeContentLabIdeaInput(await readJson(request, 40_000)); const response = await supabaseRequest(env, '/rest/v1/admin_content_lab_ideas?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0], 201); }
  const match = url.pathname.match(/^\/api\/admin\/content-lab\/ideas\/([^/?]+)$/); if (!match) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' }); const id = decodeURIComponent(match[1]);
  if (request.method === 'DELETE') { await supabaseRequest(env, `/rest/v1/admin_content_lab_ideas?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); return json({ ok: true }); }
  if (request.method === 'PATCH') { const currentResponse = await supabaseRequest(env, `/rest/v1/admin_content_lab_ideas?id=eq.${encodeURIComponent(id)}&select=${CONTENT_LAB_IDEA_COLUMNS}`); const current = (await currentResponse.json())[0]; if (!current) return json({ error: 'Ideea nu a fost găsită' }, 404); const item = normalizeContentLabIdeaInput({ ...current, ...await readJson(request, 40_000), id }, current); const response = await supabaseRequest(env, `/rest/v1/admin_content_lab_ideas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0]); }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
}

async function productionBeckyContext(env) {
  const [childrenResponse, workspaces] = await Promise.all([supabaseRequest(env, `/rest/v1/crm_children?select=id,first_name,age&order=first_name.asc`), getDocument(env, 'workspaces')]);
  const childrenWorkspace = (workspaces.workspaces || []).find(item => item.id === 'children'); const activities = (childrenWorkspace?.activities || []).filter(item => item?.id && item?.title && item.title !== 'Activitate nouă').map(item => ({ id:item.id,title:item.title,age_categories:Array.isArray(item.ageCategories)?item.ageCategories:item.age?[item.age]:[] }));
  return { children:await childrenResponse.json(),activities,roles:MONTHLY_REPORT_ROLES.map(([id,label])=>({id,label})) };
}
function beckyDestinationTable(item) {
  if(item.destination==='activity_observation')return ['admin_activity_observations',ACTIVITY_OBSERVATION_COLUMNS];
  if(item.destination==='crm_child_observation')return ['crm_child_observations',CRM_OBSERVATION_COLUMNS];
  if(item.destination==='monthly_report_entry')return ['admin_monthly_report_entries',MONTHLY_REPORT_ENTRY_COLUMNS];
  throw Object.assign(new Error('Destinația nu este executabilă în V1.'),{status:400});
}
async function readProductionDestination(env,item,id=item.destination_entity_id){if(!id)return null;const [table,columns]=beckyDestinationTable(item);const response=await supabaseRequest(env,`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=${columns}`);return (await response.json())[0]||null;}
async function deleteProductionDestination(env,item,id){const [table]=beckyDestinationTable(item);await supabaseRequest(env,`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});return !(await readProductionDestination(env,item,id));}
async function activeProductionMemorySignals(env) {
  const response=await supabaseRequest(env,`/rest/v1/admin_becky_memory_signals?select=${BECKY_MEMORY_COLUMNS}&order=source_date.asc,created_at.asc`);const signals=await response.json();const hashes=new Map();for(const signal of signals){if(!hashes.has(signal.source_note_id)){const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(signal.source_note_id)}&select=note`);hashes.set(signal.source_note_id,await sha256(String((await noteResponse.json())[0]?.note||'')));}}const active=signals.filter(signal=>hashes.get(signal.source_note_id)===signal.source_hash&&!isSpeculativeMemorySignal(signal.exact_source_excerpt)&&!isSpeculativeMemorySignal(signal.normalized_observation));const unique=[];for(const signal of active){if(!unique.some(item=>memorySignalContentMatches(item,signal)))unique.push(signal);}return unique.map(signal=>({...signal,task_candidate:isTaskCandidateMemorySignal(signal.normalized_observation)}));
}
async function productionMemoryContext(env) {
  const [signals,crmResponse,activityResponse,knowledgeResponse,entryResponse]=await Promise.all([activeProductionMemorySignals(env),supabaseRequest(env,`/rest/v1/crm_child_observations?select=${CRM_OBSERVATION_COLUMNS}&order=observed_at.desc&limit=40`),supabaseRequest(env,`/rest/v1/admin_activity_observations?select=${ACTIVITY_OBSERVATION_COLUMNS}&order=tested_at.desc&limit=40`),supabaseRequest(env,`/rest/v1/admin_knowledge_candidates?select=${KNOWLEDGE_CANDIDATE_COLUMNS}&order=updated_at.desc&limit=20`),supabaseRequest(env,`/rest/v1/admin_monthly_report_entries?select=${MONTHLY_REPORT_ENTRY_COLUMNS}&type=eq.evidence&order=entry_date.desc&limit=30`)]);return historicEvidenceContext({signals,crmObservations:await crmResponse.json(),activityObservations:await activityResponse.json(),knowledgeCandidates:await knowledgeResponse.json(),monthlyEntries:await entryResponse.json()});
}
async function autoStoreProductionMemorySignal(env, signal) {
  const target=(signal.possible_canonical_context||[]).find(item=>item.destination==='crm_child_observation'&&item.eligibility==='auto_store');if(!target)return signal;const id=`memory-signal-${signal.id}`;const existingResponse=await supabaseRequest(env,`/rest/v1/crm_child_observations?id=eq.${encodeURIComponent(id)}&select=${CRM_OBSERVATION_COLUMNS}`);let entity=(await existingResponse.json())[0];if(!entity){entity=normalizeCrmObservationInput({id,child_id:target.child_id,visit_id:null,observed_at:`${signal.source_date}T12:00:00.000Z`,observation:signal.normalized_observation});const inserted=await supabaseRequest(env,'/rest/v1/crm_child_observations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(entity)});entity=(await inserted.json())[0];}else if(entity.child_id!==target.child_id){const corrected=normalizeCrmObservationInput({...entity,child_id:target.child_id,visit_id:null});const response=await supabaseRequest(env,`/rest/v1/crm_child_observations?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(corrected)});entity=(await response.json())[0];}signal.canonical_context=[{destination:'crm_child_observation',destination_entity_id:entity.id,child_id:entity.child_id,auto_stored_at:new Date().toISOString(),destination_updated_at:entity.updated_at||entity.created_at}];return signal;
}
async function buildProductionMemory(env,date,noteText,rawSignals,rawCandidates) {
  const sourceHash=await sha256(noteText);const context=await productionBeckyContext(env);const created=[];
  const noteSignalsResponse=await supabaseRequest(env,`/rest/v1/admin_becky_memory_signals?source_note_id=eq.${encodeURIComponent(date)}&select=${BECKY_MEMORY_COLUMNS}&order=created_at.asc`);const noteSignals=await noteSignalsResponse.json();
  for(const raw of Array.isArray(rawSignals)?rawSignals:[]){const resolved=resolveMemorySignal(raw,{...context,note_text:noteText});if(!resolved)continue;const now=new Date().toISOString();const draft={id:crypto.randomUUID(),source_type:'daily_note',source_note_id:date,source_version:sourceHash,source_hash:sourceHash,source_date:date,...resolved,canonical_context:[],created_at:now,updated_at:now};draft.dedupe_key=await memorySignalDedupeKey(draft);const duplicate=noteSignals.find(item=>memorySignalContentMatches(item,draft));if(duplicate){const updated={...duplicate,source_version:sourceHash,source_hash:sourceHash,updated_at:now};await supabaseRequest(env,`/rest/v1/admin_becky_memory_signals?id=eq.${encodeURIComponent(duplicate.id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({source_version:sourceHash,source_hash:sourceHash,updated_at:now})});Object.assign(duplicate,updated);created.push(updated);continue;}await autoStoreProductionMemorySignal(env,draft);const inserted=await supabaseRequest(env,'/rest/v1/admin_becky_memory_signals',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(draft)});const saved=(await inserted.json())[0];noteSignals.push(saved);created.push(saved);}
  const active=await activeProductionMemorySignals(env);const selected=selectAttentionCandidates(rawCandidates,{signals:active,noteDate:date});const candidates=[];
  for(const candidate of selected){const previousResponse=await supabaseRequest(env,`/rest/v1/admin_becky_attention_candidates?fingerprint=eq.${encodeURIComponent(candidate.fingerprint)}&select=${BECKY_ATTENTION_COLUMNS}&limit=20`);const previous=(await previousResponse.json()).find(item=>JSON.stringify([...(item.evidence_signal_ids||[])].sort())===JSON.stringify([...candidate.evidence_signal_ids].sort()));const now=new Date().toISOString();const item={id:previous?.id||crypto.randomUUID(),status:previous?.status||'active',knowledge_candidate_id:previous?.knowledge_candidate_id||null,...candidate,created_at:previous?.created_at||now,updated_at:now};const response=await supabaseRequest(env,previous?`/rest/v1/admin_becky_attention_candidates?id=eq.${encodeURIComponent(previous.id)}`:'/rest/v1/admin_becky_attention_candidates',{method:previous?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});candidates.push((await response.json())[0]);}
  return {signals:created,attention_candidates:candidates,source_hash:sourceHash};
}
async function handleBeckyMemory(request, env) {
  await requireAdmin(request,env);const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/api/admin/becky-memory/signals'){const sourceId=String(url.searchParams.get('source_note_id')||'');let signals=await activeProductionMemorySignals(env);if(sourceId)signals=signals.filter(item=>item.source_note_id===sourceId);return json({signals:signals.sort((a,b)=>`${b.source_date}${b.created_at}`.localeCompare(`${a.source_date}${a.created_at}`))});}
  if(request.method==='GET'&&url.pathname==='/api/admin/becky-memory/attention'){const response=await supabaseRequest(env,`/rest/v1/admin_becky_attention_candidates?select=${BECKY_ATTENTION_COLUMNS}&status=in.(active,investigating)&order=updated_at.desc`);return json({candidates:await response.json()});}
  assertSameOrigin(request);
  if(request.method==='POST'&&url.pathname==='/api/admin/becky-memory/analyze'){const body=await readJson(request,100_000);const date=String(body?.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:'Data notei este invalidă.'},400);const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(date)}&select=note`);const noteText=String((await noteResponse.json())[0]?.note||'').trim();if(!noteText)return json({error:'Nota zilei nu există sau este goală.'},400);const context=await productionBeckyContext(env);const historicContext=await productionMemoryContext(env);const analysis=await analyzeDailyNoteForMemory({apiKey:env.OPENAI_API_KEY,model:env.OPENAI_TEXT_MODEL||'gpt-4.1-mini',noteDate:date,noteText,children:context.children,activities:context.activities,historicContext});return json(await buildProductionMemory(env,date,noteText,analysis.memory_signals,analysis.attention_candidates),201);}
  const signalMatch=url.pathname.match(/^\/api\/admin\/becky-memory\/signals\/([^/?]+)$/);
  if(signalMatch&&['PATCH','DELETE'].includes(request.method)){
    const id=decodeURIComponent(signalMatch[1]);const currentResponse=await supabaseRequest(env,`/rest/v1/admin_becky_memory_signals?id=eq.${encodeURIComponent(id)}&select=${BECKY_MEMORY_COLUMNS}`);const current=(await currentResponse.json())[0];if(!current)return json({error:'Semnalul nu a fost găsit'},404);
    if(request.method==='DELETE'){
      const auto=(current.canonical_context||[]).find(item=>item.destination==='crm_child_observation');
      if(auto){const destination=await readProductionDestination(env,{destination:'crm_child_observation'},auto.destination_entity_id);if(destination&&(destination.updated_at||destination.created_at)===auto.destination_updated_at)await supabaseRequest(env,`/rest/v1/crm_child_observations?id=eq.${encodeURIComponent(auto.destination_entity_id)}`,{method:'DELETE'});}
      await supabaseRequest(env,`/rest/v1/admin_becky_memory_signals?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});return json({ok:true});
    }
    const body=await readJson(request,20_000);if(!Array.isArray(body.entities))return json({error:'Entitățile sunt invalide'},400);
    const entities=body.entities.map(item=>({type:item?.type==='activity'?'activity':'child',id:item?.id?String(item.id):null,label:String(item?.label||'').trim(),resolution:['resolved','ambiguous','not_found'].includes(item?.resolution)?item.resolution:'not_found'}));
    const child=entities.find(item=>item.type==='child'&&item.resolution==='resolved'&&item.id);const next={...current,entities,possible_canonical_context:child&&['observed','direct_quote'].includes(current.epistemic_type)?[{destination:'crm_child_observation',child_id:child.id,eligibility:'auto_store'}]:[],canonical_context:current.canonical_context||[],updated_at:new Date().toISOString()};
    await autoStoreProductionMemorySignal(env,next);const response=await supabaseRequest(env,`/rest/v1/admin_becky_memory_signals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(next)});return json((await response.json())[0]);
  }
  const attentionMatch=url.pathname.match(/^\/api\/admin\/becky-memory\/attention\/([^/?]+)(?:\/(promote))?$/);if(attentionMatch&&request.method==='PATCH'){const body=await readJson(request,20_000);if(!['active','investigating','dismissed'].includes(body.status))return json({error:'Status invalid'},400);const response=await supabaseRequest(env,`/rest/v1/admin_becky_attention_candidates?id=eq.${encodeURIComponent(decodeURIComponent(attentionMatch[1]))}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:body.status,updated_at:new Date().toISOString()})});return json((await response.json())[0]);}
  if(attentionMatch&&attentionMatch[2]==='promote'&&request.method==='POST'){const body=await readJson(request,20_000);if(!KNOWLEDGE_CANDIDATE_TARGETS.includes(body.target))return json({error:'Target invalid'},400);const response=await supabaseRequest(env,`/rest/v1/admin_becky_attention_candidates?id=eq.${encodeURIComponent(decodeURIComponent(attentionMatch[1]))}&select=${BECKY_ATTENTION_COLUMNS}`);const candidate=(await response.json())[0];if(!candidate)return json({error:'Candidatul nu a fost găsit'},404);const knowledge=normalizeKnowledgeCandidateInput({target:body.target,text:`${candidate.title}\n\n${candidate.summary}\n\nDe ce merită investigat: ${candidate.why_it_matters}\n\nValidare sugerată: ${candidate.suggested_next_step}`,status:'proposed',source_type:'becky_memory_attention',source_id:candidate.id});const inserted=await supabaseRequest(env,'/rest/v1/admin_knowledge_candidates',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(knowledge)});const saved=await inserted.json();await supabaseRequest(env,`/rest/v1/admin_becky_attention_candidates?id=eq.${encodeURIComponent(candidate.id)}`,{method:'PATCH',body:JSON.stringify({status:'promoted',knowledge_candidate_id:saved[0]?.id||null,updated_at:new Date().toISOString()})});return json({knowledge_candidate:saved[0]},201);}
  return json({error:'Method not allowed'},405);
}
async function handleBeckyInbox(request, env) {
  await requireAdmin(request, env); const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/api/admin/becky-inbox/brief'){const sourceId=String(url.searchParams.get('source_id')||'');const sourceVersion=String(url.searchParams.get('source_version')||'');const filter=`${sourceId?`&source_id=eq.${encodeURIComponent(sourceId)}`:''}${sourceVersion?`&source_version=eq.${encodeURIComponent(sourceVersion)}`:''}`;const response=await supabaseRequest(env,`/rest/v1/admin_becky_brief_insights?select=${BECKY_BRIEF_COLUMNS}${filter}&order=sort_order.asc,created_at.desc`);let insights=await response.json();const noteDates=[...new Set(insights.filter(item=>item.source_type==='daily_note').map(item=>item.source_id))];const currentHashes=new Map();for(const date of noteDates){const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(date)}&select=note`);const note=(await noteResponse.json())[0]?.note||'';currentHashes.set(date,await sha256(note));}return json({insights:insights.map(item=>({...item,stale:item.source_type==='daily_note'&&currentHashes.get(item.source_id)!==item.source_hash}))});}
  if(request.method==='GET'&&url.pathname==='/api/admin/becky-inbox/context')return json(await productionBeckyContext(env));
  if(request.method==='GET'&&url.pathname==='/api/admin/becky-inbox/proposals'){
    const destination=String(url.searchParams.get('destination')||'');const status=String(url.searchParams.get('status')||'');const sourceId=String(url.searchParams.get('source_id')||'');const filter=`${destination?`&destination=eq.${encodeURIComponent(destination)}`:''}${status?`&status=eq.${encodeURIComponent(status)}`:''}${sourceId?`&source_id=eq.${encodeURIComponent(sourceId)}`:''}`;const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?select=${BECKY_INBOX_COLUMNS}${filter}&order=created_at.desc`);let items=await response.json();const noteDates=[...new Set(items.filter(item=>item.source_type==='daily_note').map(item=>item.source_id))];const currentHashes=new Map();for(const date of noteDates){const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(date)}&select=note`);const note=(await noteResponse.json())[0]?.note||'';currentHashes.set(date,await sha256(note));}return json({proposals:items.map(item=>({...item,stale:item.source_type==='daily_note'&&currentHashes.get(item.source_id)!==item.source_hash}))});
  }
  assertSameOrigin(request);
  if(request.method==='POST'&&url.pathname==='/api/admin/becky-inbox/analyze'){
    const body=await readJson(request,100_000);const date=String(body?.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:'Data notei este invalidă.'},400);const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(date)}&select=note`);const noteText=String((await noteResponse.json())[0]?.note||'').trim();if(!noteText)return json({error:'Nota zilei nu există sau este goală.'},400);const context=await productionBeckyContext(env);const analysis=await analyzeDailyNoteWithOpenAI({apiKey:env.OPENAI_API_KEY,model:env.OPENAI_TEXT_MODEL||'gpt-4.1-mini',noteDate:date,noteText,children:context.children,activities:context.activities,roles:context.roles});const sourceHash=await sha256(noteText);const proposals=[];
    for(const candidate of analysis.proposals||[]){const resolved=resolveAiProposal(candidate,{...context,note_date:date,note_text:noteText});if(!EXECUTABLE_DESTINATIONS.includes(resolved.destination))continue;const now=new Date().toISOString();const item={id:crypto.randomUUID(),source_type:'daily_note',source_id:date,source_version:sourceHash,source_hash:sourceHash,source_excerpt:resolved.source_excerpt,destination:resolved.destination,operation:resolved.operation||'add',target_entity_type:resolved.target_entity_type,target_entity_id:resolved.target_entity_id,target_candidates:resolved.target_candidates,resolution_status:resolved.resolution_status,resolution_query:resolved.resolution_query,payload:resolved.payload,field_provenance:resolved.field_provenance,status:'pending',validation_errors:[],missing_fields:[],destination_entity_id:null,destination_verified_at:null,destination_entity_updated_at:null,reverted_at:null,revert_error:null,created_at:now,updated_at:now,executed_at:null,last_error:null};item.validation_errors=validateProposedChange(item);item.missing_fields=item.validation_errors;item.dedupe_key=await proposalDedupeKey(item);const duplicateResponse=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?dedupe_key=eq.${encodeURIComponent(item.dedupe_key)}&select=${BECKY_INBOX_COLUMNS}&limit=1`);const duplicate=(await duplicateResponse.json())[0];if(duplicate){proposals.push(duplicate);continue;}const inserted=await supabaseRequest(env,'/rest/v1/admin_becky_inbox_proposals',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});proposals.push((await inserted.json())[0]);}
    const existingBriefResponse=await supabaseRequest(env,`/rest/v1/admin_becky_brief_insights?source_id=eq.${encodeURIComponent(date)}&source_hash=eq.${encodeURIComponent(sourceHash)}&select=${BECKY_BRIEF_COLUMNS}&order=sort_order.asc`);let insights=await existingBriefResponse.json();if(!insights.length){const selected=selectBriefInsights(analysis.insights||[],{note_text:noteText,proposals});const now=new Date().toISOString();const rows=selected.map((item,index)=>({id:crypto.randomUUID(),source_type:'daily_note',source_id:date,source_version:sourceHash,source_hash:sourceHash,...item,sort_order:index,created_at:now,updated_at:now}));if(rows.length){const inserted=await supabaseRequest(env,'/rest/v1/admin_becky_brief_insights',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(rows)});insights=await inserted.json();}}
    return json({proposals,insights,source_hash:sourceHash},201);
  }
  const match=url.pathname.match(/^\/api\/admin\/becky-inbox\/proposals\/([^/?]+)(?:\/(approve|ignore|revert))?$/);if(!match)return json({error:'Method not allowed'},405);const id=decodeURIComponent(match[1]);const currentResponse=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}&select=${BECKY_INBOX_COLUMNS}`);const current=(await currentResponse.json())[0];if(!current)return json({error:'Propunerea nu a fost găsită'},404);
  if(request.method==='PATCH'&&!match[2]){if(['approved','ignored','reverted'].includes(current.status))return json({error:'Propunerea nu mai poate fi editată'},409);const body=await readJson(request,100_000);const context=await productionBeckyContext(env);const next={...current,payload:{...current.payload,...(body?.payload||{})},status:'pending',last_error:null,updated_at:new Date().toISOString()};if(body?.target_entity_id!==undefined){next.target_entity_id=String(body.target_entity_id||'')||null;if(next.destination==='activity_observation')next.payload.activity_id=next.target_entity_id;if(next.destination==='crm_child_observation')next.payload.child_id=next.target_entity_id;const options=next.destination==='activity_observation'?context.activities:context.children;const found=options.find(item=>item.id===next.target_entity_id);next.target_candidates=found?[{id:found.id,label:found.title||found.first_name}]:[];next.resolution_status=found?'resolved':'not_found';const key=next.destination==='activity_observation'?'activity_id':'child_id';next.field_provenance={...next.field_provenance,[key]:{source:found?'system':'missing',detail:found?'Selectat și confirmat de utilizator':'Selectează o entitate validă'}};}next.validation_errors=validateProposedChange(next);next.missing_fields=next.validation_errors;const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(next)});return json((await response.json())[0]);}
  if(request.method==='POST'&&match[2]==='ignore'){if(['approved','reverted'].includes(current.status))return json({error:'Propunerea nu mai poate fi ignorată'},409);const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'ignored',updated_at:new Date().toISOString(),last_error:null})});return json((await response.json())[0]);}
  if(request.method==='POST'&&match[2]==='revert'){if(current.status==='reverted')return json(current);if(current.status!=='approved'||!current.destination_entity_id)return json({error:'Doar o schimbare păstrată poate fi anulată.'},409);const entity=await readProductionDestination(env,current);if(!entity)return json({error:'Rezultatul canonic nu mai există. Verifică destinația înainte de anulare.'},409);const expected=current.destination_entity_updated_at||null;const actual=entity.updated_at||entity.created_at||null;if(expected&&actual!==expected){const message='Rezultatul a fost modificat după creare și nu poate fi șters automat.';await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({revert_error:message,updated_at:new Date().toISOString()})});return json({error:message,destination_entity_id:current.destination_entity_id},409);}if(!await deleteProductionDestination(env,current,current.destination_entity_id))return json({error:'Anularea nu a putut fi verificată în destinația canonică.'},500);const reverted={status:'reverted',reverted_at:new Date().toISOString(),updated_at:new Date().toISOString(),revert_error:null};const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(reverted)});return json((await response.json())[0]);}
  if(request.method==='POST'&&match[2]==='approve'){const body=await readJson(request,10_000);if(current.status==='approved'){if(await readProductionDestination(env,current))return json(current);await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status:'failed',last_error:'Rezultatul aprobat nu mai poate fi citit din destinația canonică.',updated_at:new Date().toISOString()})});return json({error:'Rezultatul aprobat nu mai poate fi citit din destinația canonică.'},409);}if(['ignored','reverted'].includes(current.status))return json({error:'Propunerea nu mai poate fi aprobată'},409);const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(current.source_id)}&select=note`);const currentHash=await sha256(String((await noteResponse.json())[0]?.note||''));if(currentHash!==current.source_hash&&!body.confirm_stale)return json({error:'Nota a fost modificată. Confirmă aprobarea propunerii vechi.',stale:true},409);const errors=validateProposedChange(current);if(errors.length)return json({error:errors[0],validation_errors:errors},400);try{const payload=canonicalExecutionPayload(current);const destinationId=`becky-inbox-${current.id}`;let entity;
      if(current.destination==='activity_observation'){const existing=await supabaseRequest(env,`/rest/v1/admin_activity_observations?id=eq.${encodeURIComponent(destinationId)}&select=${ACTIVITY_OBSERVATION_COLUMNS}`);entity=(await existing.json())[0];if(!entity){entity=normalizeActivityObservationInput({...payload,id:destinationId});const response=await supabaseRequest(env,'/rest/v1/admin_activity_observations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(entity)});entity=(await response.json())[0];}}
      else if(current.destination==='crm_child_observation'){const childResponse=await supabaseRequest(env,`/rest/v1/crm_children?id=eq.${encodeURIComponent(payload.child_id)}&select=id`);if(!(await childResponse.json()).length)throw Object.assign(new Error('Copilul nu a fost găsit'),{status:400});const existing=await supabaseRequest(env,`/rest/v1/crm_child_observations?id=eq.${encodeURIComponent(destinationId)}&select=${CRM_OBSERVATION_COLUMNS}`);entity=(await existing.json())[0];if(!entity){entity=normalizeCrmObservationInput({...payload,id:destinationId});const response=await supabaseRequest(env,'/rest/v1/crm_child_observations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(entity)});entity=(await response.json())[0];}}
      else if(current.destination==='monthly_report_entry'){const existing=await supabaseRequest(env,`/rest/v1/admin_monthly_report_entries?id=eq.${encodeURIComponent(destinationId)}&select=${MONTHLY_REPORT_ENTRY_COLUMNS}`);entity=(await existing.json())[0];if(!entity){entity=normalizeMonthlyReportEntryInput({...payload,id:destinationId},{},payload.month_key);const response=await supabaseRequest(env,'/rest/v1/admin_monthly_report_entries',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(entity)});entity=(await response.json())[0];}}
      const verified=await readProductionDestination(env,current,entity?.id);if(!verified)throw new Error('Obiectul a fost scris, dar nu a putut fi recitit din destinația canonică.');const verifiedAt=new Date().toISOString();const approved={status:'approved',destination_entity_id:verified.id,destination_verified_at:verifiedAt,destination_entity_updated_at:verified.updated_at||verified.created_at||null,executed_at:verifiedAt,updated_at:verifiedAt,last_error:null,validation_errors:[],missing_fields:[],revert_error:null};const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(approved)});return json((await response.json())[0]);
    }catch(error){await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status:'failed',last_error:String(error.message||'Execution failed'),updated_at:new Date().toISOString()})});throw error;}}
  return json({error:'Method not allowed'},405);
}

async function handleEventCommunityFindings(request, env) {
  await requireAdmin(request, env); const url = new URL(request.url);
  if (request.method === 'GET') { const kind = String(url.searchParams.get('kind') || '').trim(); if (kind && !EVENT_FINDING_KINDS.includes(kind)) return json({ error: 'Filtru invalid' }, 400); const filter = kind ? `&kind=eq.${encodeURIComponent(kind)}` : ''; const response = await supabaseRequest(env, `/rest/v1/admin_event_community_findings?select=${EVENT_FINDING_COLUMNS}${filter}&order=updated_at.desc,created_at.desc`); return json({ findings: await response.json() }); }
  assertSameOrigin(request); if (request.method === 'POST') { const item = normalizeEventFindingInput(await readJson(request, 50_000)); const response = await supabaseRequest(env, '/rest/v1/admin_event_community_findings?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0], 201); }
  const match = url.pathname.match(/^\/api\/admin\/event-community\/findings\/([^/?]+)$/); if (!match) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' }); const id = decodeURIComponent(match[1]);
  if (request.method === 'DELETE') { await supabaseRequest(env, `/rest/v1/admin_event_community_findings?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); return json({ ok: true }); }
  if (request.method === 'PATCH') { const currentResponse = await supabaseRequest(env, `/rest/v1/admin_event_community_findings?id=eq.${encodeURIComponent(id)}&select=${EVENT_FINDING_COLUMNS}`); const current = (await currentResponse.json())[0]; if (!current) return json({ error: 'Finding not found' }, 404); const item = normalizeEventFindingInput({ ...current, ...await readJson(request, 50_000), id }, current); const response = await supabaseRequest(env, `/rest/v1/admin_event_community_findings?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0]); }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
}

async function handleKnowledgeCandidates(request, env) {
  await requireAdmin(request, env); const url = new URL(request.url);
  if (request.method === 'GET') { const target = String(url.searchParams.get('target') || '').trim(); const status = String(url.searchParams.get('status') || '').trim(); if ((target && !KNOWLEDGE_CANDIDATE_TARGETS.includes(target)) || (status && !KNOWLEDGE_CANDIDATE_STATUSES.includes(status))) return json({ error: 'Filtru invalid' }, 400); const filter = `${target ? `&target=eq.${encodeURIComponent(target)}` : ''}${status ? `&status=eq.${encodeURIComponent(status)}` : ''}`; const response = await supabaseRequest(env, `/rest/v1/admin_knowledge_candidates?select=${KNOWLEDGE_CANDIDATE_COLUMNS}${filter}&order=updated_at.desc,created_at.desc`); return json({ candidates: await response.json() }); }
  assertSameOrigin(request); if (request.method === 'POST') { const item = normalizeKnowledgeCandidateInput(await readJson(request, 50_000)); const response = await supabaseRequest(env, '/rest/v1/admin_knowledge_candidates?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0], 201); }
  const match = url.pathname.match(/^\/api\/admin\/knowledge-candidates\/([^/?]+)$/); if (!match) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' }); const id = decodeURIComponent(match[1]);
  if (request.method === 'DELETE') { await supabaseRequest(env, `/rest/v1/admin_knowledge_candidates?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); return json({ ok: true }); }
  if (request.method === 'PATCH') { const currentResponse = await supabaseRequest(env, `/rest/v1/admin_knowledge_candidates?id=eq.${encodeURIComponent(id)}&select=${KNOWLEDGE_CANDIDATE_COLUMNS}`); const current = (await currentResponse.json())[0]; if (!current) return json({ error: 'Candidate not found' }, 404); const item = normalizeKnowledgeCandidateInput({ ...current, ...await readJson(request, 50_000), id }, current); const response = await supabaseRequest(env, `/rest/v1/admin_knowledge_candidates?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }); return json((await response.json())[0]); }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
}

async function handleAdminTasks(request, env) {
  await requireAdmin(request, env);
  if (request.method === 'GET') {
    const response = await supabaseRequest(env, `/rest/v1/admin_tasks?select=${ADMIN_TASK_COLUMNS}&order=sort_order.asc,created_at.asc`);
    return json({ tasks: await response.json() });
  }
  assertSameOrigin(request);
  if (request.method === 'POST' || request.method === 'PUT') {
    const body = await readJson(request, 200_000);
    const tasks = request.method === 'PUT' ? body?.tasks : [body];
    if (!Array.isArray(tasks) || tasks.length > 500) return json({ error: 'Admin tasks invalid' }, 400);
    const valid = tasks.map(task => {
      if (!task || typeof task.id !== 'string' || typeof task.area !== 'string' || typeof task.title !== 'string' || typeof task.detail !== 'string' || typeof task.owner !== 'string' || typeof task.priority !== 'string' || !Number.isInteger(Number(task.sort_order))) throw Object.assign(new Error('Admin task invalid'), { status: 400 });
      return {
        id: task.id.trim(), area: task.area.trim(), title: task.title.trim(), detail: task.detail.trim(), owner: task.owner.trim(), priority: task.priority.trim(), sort_order: Number(task.sort_order),
        ...(task.created_at ? { created_at: task.created_at } : {}), updated_at: new Date().toISOString()
      };
    });
    if (!valid.every(task => task.id && task.area && task.title && task.owner && task.priority) || new Set(valid.map(task => task.id)).size !== valid.length) return json({ error: 'Admin tasks invalid' }, 400);
    if (request.method === 'PUT') {
      const existingResponse = await supabaseRequest(env, `/rest/v1/admin_tasks?select=id${valid.length ? `&id=not.in.(${valid.map(task => encodeURIComponent(task.id)).join(',')})` : ''}`);
      const stale = await existingResponse.json();
      if (stale.length) await supabaseRequest(env, `/rest/v1/admin_tasks?id=in.(${stale.map(task => encodeURIComponent(task.id)).join(',')})`, { method: 'DELETE' });
    }
    if (!valid.length) return json({ tasks: [] }, request.method === 'POST' ? 201 : 200);
    const response = await supabaseRequest(env, '/rest/v1/admin_tasks?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(valid)
    });
    const rows = await response.json();
    rows.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
    return json(request.method === 'POST' ? rows[0] : { tasks: rows }, request.method === 'POST' ? 201 : 200);
  }
  const match = request.url.match(/\/api\/admin\/tasks\/([^/?]+)$/);
  if (!match) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PUT, PATCH, DELETE' });
  const id = decodeURIComponent(match[1]);
  if (request.method === 'DELETE') {
    await supabaseRequest(env, `/rest/v1/admin_tasks?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return json({ ok: true });
  }
  if (request.method === 'PATCH') {
    const body = await readJson(request, 40_000);
    const allowed = ['area', 'title', 'detail', 'owner', 'priority', 'sort_order'];
    const update = Object.fromEntries(allowed.filter(key => body?.[key] !== undefined).map(key => [key, key === 'sort_order' ? Number(body[key]) : String(body[key]).trim()]));
    if (!Object.keys(update).length || (update.sort_order !== undefined && !Number.isInteger(update.sort_order))) return json({ error: 'Admin task invalid' }, 400);
    update.updated_at = new Date().toISOString();
    const response = await supabaseRequest(env, `/rest/v1/admin_tasks?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) });
    const rows = await response.json();
    if (!rows.length) return json({ error: 'Admin task not found' }, 404);
    return json(rows[0]);
  }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PUT, PATCH, DELETE' });
}

const CRM_CHILD_COLUMNS = 'id,first_name,age,interests,continuity,created_at,updated_at';
const CRM_VISIT_COLUMNS = 'id,child_id,companion_id,visit_date,note,created_at';
const CRM_OBSERVATION_COLUMNS = 'id,child_id,visit_id,observed_at,observation,created_at,updated_at';
const CRM_COMPANION_COLUMNS = 'id,first_name,relationship_label,created_at,updated_at';
const CRM_CHILD_COMPANION_COLUMNS = 'child_id,companion_id,is_primary,created_at';
const CRM_COMPANION_OBSERVATION_COLUMNS = 'id,companion_id,visit_id,observed_at,observation,created_at,updated_at';

async function handleAdminCrm(request, env) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/admin/crm') {
    const [childrenResponse, visitsResponse, companionsResponse, linksResponse] = await Promise.all([
      supabaseRequest(env, `/rest/v1/crm_children?select=${CRM_CHILD_COLUMNS}&order=first_name.asc`),
      supabaseRequest(env, `/rest/v1/crm_visits?select=${CRM_VISIT_COLUMNS}&order=visit_date.desc,created_at.desc`),
      supabaseRequest(env, `/rest/v1/crm_companions?select=${CRM_COMPANION_COLUMNS}&order=first_name.asc`),
      supabaseRequest(env, `/rest/v1/crm_child_companions?select=${CRM_CHILD_COMPANION_COLUMNS}`)
    ]);
    const children = await childrenResponse.json();
    const visits = await visitsResponse.json();
    const companions=await companionsResponse.json();const links=await linksResponse.json();
    return json({ children: children.map(child => ({...crmChildSummary(child, visits),primary_companion_id:(links.find(link=>link.child_id===child.id&&link.is_primary)||{}).companion_id||null})).sort((a, b) => (b.last_visit || '').localeCompare(a.last_visit || '') || a.first_name.localeCompare(b.first_name, 'ro')), companions:companions.map(companion=>crmCompanionSummary(companion,{children,visits,child_companions:links})).sort((a,b)=>a.first_name.localeCompare(b.first_name,'ro')) });
  }
  assertSameOrigin(request);
  if (request.method === 'POST' && url.pathname === '/api/admin/crm/children') {
    const body = await readJson(request, 20_000);
    const child = normalizeCrmChildInput(body);
    const response = await supabaseRequest(env, '/rest/v1/crm_children?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(child) }); const saved=(await response.json())[0];
    const companionId=String(body?.primary_companion_id||'').trim();if(companionId){const companion=await supabaseRequest(env,`/rest/v1/crm_companions?id=eq.${encodeURIComponent(companionId)}&select=id`);if(!(await companion.json()).length)return json({error:'Însoțitorul nu a fost găsit'},400);await supabaseRequest(env,'/rest/v1/crm_child_companions',{method:'POST',body:JSON.stringify({child_id:saved.id,companion_id:companionId,is_primary:true})});}
    return json(saved, 201);
  }
  if (request.method === 'POST' && url.pathname === '/api/admin/crm/visits') {
    const body = await readJson(request, 20_000);
    const childId = String(body?.child_id || '').trim();
    const childResponse = await supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(childId)}&select=id`);
    if (!(await childResponse.json()).length) return json({ error: 'Copilul nu a fost găsit' }, 404);
    const companionId=body?.companion_id ? String(body.companion_id).trim() : null;if(companionId){const companion=await supabaseRequest(env,`/rest/v1/crm_companions?id=eq.${encodeURIComponent(companionId)}&select=id`);if(!(await companion.json()).length)return json({error:'Însoțitorul nu a fost găsit'},400);}
    const visit = normalizeCrmVisitInput(body, childId);
    const response = await supabaseRequest(env, '/rest/v1/crm_visits?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(visit) });
    return json((await response.json())[0], 201);
  }
  const observationListMatch = url.pathname.match(/^\/api\/admin\/crm\/children\/([^/?]+)\/observations$/);
  if (request.method === 'GET' && observationListMatch) {
    const childId = decodeURIComponent(observationListMatch[1]);
    const response = await supabaseRequest(env, `/rest/v1/crm_child_observations?child_id=eq.${encodeURIComponent(childId)}&select=${CRM_OBSERVATION_COLUMNS}&order=observed_at.desc,created_at.desc`);
    return json({ observations: await response.json() });
  }
  if (request.method === 'POST' && observationListMatch) {
    const childId = decodeURIComponent(observationListMatch[1]);
    const body = await readJson(request, 40_000);
    const childResponse = await supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(childId)}&select=id`);
    if (!(await childResponse.json()).length) return json({ error: 'Copilul nu a fost găsit' }, 404);
    const observation = normalizeCrmObservationInput({ ...body, child_id: childId });
    if (observation.visit_id) {
      const visitResponse = await supabaseRequest(env, `/rest/v1/crm_visits?id=eq.${encodeURIComponent(observation.visit_id)}&child_id=eq.${encodeURIComponent(childId)}&select=id`);
      if (!(await visitResponse.json()).length) return json({ error: 'Vizita asociată nu a fost găsită' }, 400);
    }
    const response = await supabaseRequest(env, '/rest/v1/crm_child_observations?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(observation) });
    return json((await response.json())[0], 201);
  }
  const observationMatch = url.pathname.match(/^\/api\/admin\/crm\/observations\/([^/?]+)$/);
  if (observationMatch && request.method === 'DELETE') {
    await supabaseRequest(env, `/rest/v1/crm_child_observations?id=eq.${encodeURIComponent(decodeURIComponent(observationMatch[1]))}`, { method: 'DELETE' });
    return json({ ok: true });
  }
  if (observationMatch && request.method === 'PATCH') {
    const id = decodeURIComponent(observationMatch[1]);
    const body = await readJson(request, 40_000);
    const currentResponse = await supabaseRequest(env, `/rest/v1/crm_child_observations?id=eq.${encodeURIComponent(id)}&select=${CRM_OBSERVATION_COLUMNS}`);
    const current = (await currentResponse.json())[0];
    if (!current) return json({ error: 'Observația nu a fost găsită' }, 404);
    const observation = normalizeCrmObservationInput({ ...current, ...body, id }, current);
    if (observation.visit_id) {
      const visitResponse = await supabaseRequest(env, `/rest/v1/crm_visits?id=eq.${encodeURIComponent(observation.visit_id)}&child_id=eq.${encodeURIComponent(observation.child_id)}&select=id`);
      if (!(await visitResponse.json()).length) return json({ error: 'Vizita asociată nu a fost găsită' }, 400);
    }
    const response = await supabaseRequest(env, `/rest/v1/crm_child_observations?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(observation) });
    const rows = await response.json();
    return json(rows[0] || { error: 'Observația nu a fost găsită' }, rows.length ? 200 : 404);
  }
  if(request.method==='POST'&&url.pathname==='/api/admin/crm/companions'){const companion=normalizeCrmCompanionInput(await readJson(request,20_000));const response=await supabaseRequest(env,'/rest/v1/crm_companions',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(companion)});return json((await response.json())[0],201);}
  const companionObservationListMatch=url.pathname.match(/^\/api\/admin\/crm\/companions\/([^/?]+)\/observations$/);
  if(companionObservationListMatch&&request.method==='POST'){const companion_id=decodeURIComponent(companionObservationListMatch[1]);const companion=await supabaseRequest(env,`/rest/v1/crm_companions?id=eq.${encodeURIComponent(companion_id)}&select=id`);if(!(await companion.json()).length)return json({error:'Însoțitorul nu a fost găsit'},404);const observation=normalizeCrmCompanionObservationInput({...await readJson(request,40_000),companion_id});if(observation.visit_id){const visit=await supabaseRequest(env,`/rest/v1/crm_visits?id=eq.${encodeURIComponent(observation.visit_id)}&select=id`);if(!(await visit.json()).length)return json({error:'Vizita asociată nu a fost găsită'},400);}const response=await supabaseRequest(env,'/rest/v1/crm_companion_observations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(observation)});return json((await response.json())[0],201);}
  const companionObservationMatch=url.pathname.match(/^\/api\/admin\/crm\/companion-observations\/([^/?]+)$/);
  if(companionObservationMatch&&request.method==='DELETE'){await supabaseRequest(env,`/rest/v1/crm_companion_observations?id=eq.${encodeURIComponent(decodeURIComponent(companionObservationMatch[1]))}`,{method:'DELETE'});return json({ok:true});}
  if(companionObservationMatch&&request.method==='PATCH'){const id=decodeURIComponent(companionObservationMatch[1]);const currentResponse=await supabaseRequest(env,`/rest/v1/crm_companion_observations?id=eq.${encodeURIComponent(id)}&select=${CRM_COMPANION_OBSERVATION_COLUMNS}`);const current=(await currentResponse.json())[0];if(!current)return json({error:'Observația nu a fost găsită'},404);const item=normalizeCrmCompanionObservationInput({...current,...await readJson(request,40_000),id},current);const response=await supabaseRequest(env,`/rest/v1/crm_companion_observations?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});return json((await response.json())[0]);}
  const companionMatch=url.pathname.match(/^\/api\/admin\/crm\/companions\/([^/?]+)$/);
  if(companionMatch&&request.method==='GET'){const id=decodeURIComponent(companionMatch[1]);const [companionResponse,childrenResponse,visitsResponse,linksResponse,observationsResponse]=await Promise.all([supabaseRequest(env,`/rest/v1/crm_companions?id=eq.${encodeURIComponent(id)}&select=${CRM_COMPANION_COLUMNS}`),supabaseRequest(env,`/rest/v1/crm_children?select=${CRM_CHILD_COLUMNS}`),supabaseRequest(env,`/rest/v1/crm_visits?companion_id=eq.${encodeURIComponent(id)}&select=${CRM_VISIT_COLUMNS}&order=visit_date.desc,created_at.desc`),supabaseRequest(env,`/rest/v1/crm_child_companions?companion_id=eq.${encodeURIComponent(id)}&select=${CRM_CHILD_COMPANION_COLUMNS}`),supabaseRequest(env,`/rest/v1/crm_companion_observations?companion_id=eq.${encodeURIComponent(id)}&select=${CRM_COMPANION_OBSERVATION_COLUMNS}&order=observed_at.desc,created_at.desc`)]);const companion=(await companionResponse.json())[0];if(!companion)return json({error:'Însoțitorul nu a fost găsit'},404);const children=await childrenResponse.json(),visits=await visitsResponse.json(),links=await linksResponse.json();return json({companion:crmCompanionSummary(companion,{children,visits,child_companions:links}),visits,observations:await observationsResponse.json()});}
  if(companionMatch&&request.method==='PATCH'){const id=decodeURIComponent(companionMatch[1]);const currentResponse=await supabaseRequest(env,`/rest/v1/crm_companions?id=eq.${encodeURIComponent(id)}&select=${CRM_COMPANION_COLUMNS}`);const current=(await currentResponse.json())[0];if(!current)return json({error:'Însoțitorul nu a fost găsit'},404);const item=normalizeCrmCompanionInput({...current,...await readJson(request,20_000),id},current);const response=await supabaseRequest(env,`/rest/v1/crm_companions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});return json((await response.json())[0]);}
  if(companionMatch&&request.method==='DELETE'){await supabaseRequest(env,`/rest/v1/crm_companions?id=eq.${encodeURIComponent(decodeURIComponent(companionMatch[1]))}`,{method:'DELETE'});return json({ok:true});}
  const match = url.pathname.match(/^\/api\/admin\/crm\/children\/([^/?]+)$/);
  if (request.method === 'DELETE' && match) {
    const id = decodeURIComponent(match[1]);
    await supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return json({ ok: true });
  }
  if (request.method === 'PATCH' && match) {
    const id = decodeURIComponent(match[1]);
    const body = await readJson(request, 20_000);
    if(body?.primary_companion_id!==undefined){const companionId=String(body.primary_companion_id||'').trim();if(companionId){const found=await supabaseRequest(env,`/rest/v1/crm_companions?id=eq.${encodeURIComponent(companionId)}&select=id`);if(!(await found.json()).length)return json({error:'Însoțitorul nu a fost găsit'},400);}await supabaseRequest(env,`/rest/v1/crm_child_companions?child_id=eq.${encodeURIComponent(id)}&is_primary=is.true`,{method:'PATCH',body:JSON.stringify({is_primary:false})});if(companionId)await supabaseRequest(env,'/rest/v1/crm_child_companions',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({child_id:id,companion_id:companionId,is_primary:true})});}
    const child = { ...normalizeCrmChildInput({ ...body, id }), updated_at: new Date().toISOString() };
    const response = await supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(child) });
    const rows = await response.json();
    if (!rows.length) return json({ error: 'Copilul nu a fost găsit' }, 404);
    return json(rows[0]);
  }
  if (request.method === 'GET' && match) {
    const id = decodeURIComponent(match[1]);
    const [childResponse, visitsResponse, companionsResponse, linksResponse] = await Promise.all([
      supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(id)}&select=${CRM_CHILD_COLUMNS}`),
      supabaseRequest(env, `/rest/v1/crm_visits?child_id=eq.${encodeURIComponent(id)}&select=${CRM_VISIT_COLUMNS}&order=visit_date.desc,created_at.desc`),
      supabaseRequest(env,`/rest/v1/crm_companions?select=${CRM_COMPANION_COLUMNS}`),
      supabaseRequest(env,`/rest/v1/crm_child_companions?child_id=eq.${encodeURIComponent(id)}&select=${CRM_CHILD_COMPANION_COLUMNS}`)
    ]);
    const child = (await childResponse.json())[0];
    if (!child) return json({ error: 'Copilul nu a fost găsit' }, 404);
    const visits = await visitsResponse.json();const companions=await companionsResponse.json();const links=await linksResponse.json();
    const observationsResponse = await supabaseRequest(env, `/rest/v1/crm_child_observations?child_id=eq.${encodeURIComponent(id)}&select=${CRM_OBSERVATION_COLUMNS}&order=observed_at.desc,created_at.desc`);
    const primary=links.find(link=>link.is_primary);return json({ child: {...crmChildSummary(child, visits),primary_companion_id:primary?.companion_id||null}, visits, observations: await observationsResponse.json(), companions:links.map(link=>({...companions.find(item=>item.id===link.companion_id),is_primary:link.is_primary})).filter(item=>item.id) });
  }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
}

function normalizeCrmChildInput(input) {
  const id = String(input?.id || crypto.randomUUID()).trim();
  const first_name = String(input?.first_name || '').trim();
  const age = Number(input?.age);
  const interests = String(input?.interests || '').trim();
  const continuity = String(input?.continuity || '').trim();
  if (!id || !first_name || !Number.isInteger(age) || age < 0 || age > 18 || interests.length > 240 || continuity.length > 500) throw Object.assign(new Error('CRM child invalid'), { status: 400 });
  return { id, first_name, age, interests, continuity };
}

function normalizeCrmVisitInput(input, childId) {
  const id = String(input?.id || crypto.randomUUID()).trim();
  const visit_date = String(input?.visit_date || '').trim();
  const note = String(input?.note || '').trim();
  const companion_id=input?.companion_id === null || input?.companion_id === undefined || input?.companion_id === '' ? null : String(input.companion_id).trim();
  if (!id || !childId || !/^\d{4}-\d{2}-\d{2}$/.test(visit_date) || note.length > 500) throw Object.assign(new Error('CRM visit invalid'), { status: 400 });
  return { id, child_id: childId, companion_id, visit_date, note };
}

function normalizeCrmCompanionInput(input, existing = {}) {
  const id=String(input?.id||existing.id||crypto.randomUUID()).trim();const first_name=String(input?.first_name??existing.first_name??'').trim();const relationship_label=String(input?.relationship_label??existing.relationship_label??'').trim()||null;
  if(!id||!first_name||first_name.length>100||(relationship_label||'').length>80)throw Object.assign(new Error('CRM companion invalid'),{status:400});return {id,first_name,relationship_label,created_at:existing.created_at||input?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
}
function normalizeCrmCompanionObservationInput(input, existing = {}) {
  const id=String(input?.id||existing.id||crypto.randomUUID()).trim();const companion_id=String(input?.companion_id||existing.companion_id||'').trim();const visit_id=input?.visit_id === null || input?.visit_id === undefined || input?.visit_id === '' ? (existing.visit_id||null) : String(input.visit_id).trim();const observedAt=new Date(String(input?.observed_at||existing.observed_at||'').trim());const observation=String(input?.observation??existing.observation??'').trim();
  if(!id||!companion_id||Number.isNaN(observedAt.getTime())||!observation||observation.length>5000)throw Object.assign(new Error('CRM companion observation invalid'),{status:400});return {id,companion_id,visit_id,observed_at:observedAt.toISOString(),observation,created_at:existing.created_at||input?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
}

function normalizeCrmObservationInput(input, existing = {}) {
  const id = String(input?.id || existing.id || crypto.randomUUID()).trim();
  const child_id = String(input?.child_id || existing.child_id || '').trim();
  const visit_id = input?.visit_id === null || input?.visit_id === undefined || input?.visit_id === '' ? (existing.visit_id || null) : String(input.visit_id).trim();
  const observedAt = new Date(String(input?.observed_at || existing.observed_at || '').trim());
  const observation = String(input?.observation ?? existing.observation ?? '').trim();
  if (!id || !child_id || Number.isNaN(observedAt.getTime()) || !observation || observation.length > 5000) throw Object.assign(new Error('CRM observation invalid'), { status: 400 });
  return { id, child_id, visit_id, observed_at: observedAt.toISOString(), observation, created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
}

function crmChildSummary(child, visits) {
  const childVisits = visits.filter(visit => visit.child_id === child.id).sort((a, b) => `${b.visit_date}T${b.created_at || ''}`.localeCompare(`${a.visit_date}T${a.created_at || ''}`));
  return { ...child, visit_count: childVisits.length, last_visit: childVisits[0]?.visit_date || null };
}
function crmCompanionSummary(companion, {children,visits,child_companions}) { const linked=(child_companions||[]).filter(link=>link.companion_id===companion.id).map(link=>children.find(child=>child.id===link.child_id)).filter(Boolean).map(child=>crmChildSummary(child,visits));const history=visits.filter(visit=>visit.companion_id===companion.id).sort((a,b)=>`${b.visit_date}${b.created_at||''}`.localeCompare(`${a.visit_date}${a.created_at||''}`));return {...companion,children:linked,visit_count:history.length,last_visit:history[0]?.visit_date||null}; }

const CALENDAR_COLUMNS = 'id,title,type,date,start_time,end_time,note,created_at,updated_at';
const CALENDAR_TYPES = new Set(['open', 'event', 'private', 'closed']);

function normalizeCalendarEntryInput(input, existing = {}) {
  const entry = {
    id: String(input?.id ?? existing.id ?? '').trim(),
    title: String(input?.title ?? existing.title ?? '').trim(),
    type: String(input?.type ?? existing.type ?? '').trim(),
    date: String(input?.date ?? existing.date ?? '').trim(),
    start_time: String(input?.start_time ?? existing.start_time ?? '').trim(),
    end_time: String(input?.end_time ?? existing.end_time ?? '').trim(),
    note: String(input?.note ?? existing.note ?? '').trim(),
    ...(input?.created_at ? { created_at: input.created_at } : {}),
    updated_at: new Date().toISOString()
  };
  if (!entry.id || !entry.title || !CALENDAR_TYPES.has(entry.type) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !/^\d{2}:\d{2}$/.test(entry.start_time) || !/^\d{2}:\d{2}$/.test(entry.end_time) || entry.start_time >= entry.end_time) throw Object.assign(new Error('Calendar entry invalid'), { status: 400 });
  return entry;
}

async function handleAdminCalendar(request, env) {
  await requireAdmin(request, env);
  if (request.method === 'GET') {
    const response = await supabaseRequest(env, `/rest/v1/calendar_becky_entries?select=${CALENDAR_COLUMNS}&order=date.asc,start_time.asc`);
    return json({ entries: await response.json() });
  }
  assertSameOrigin(request);
  if (request.method === 'POST') {
    const entry = normalizeCalendarEntryInput(await readJson(request, 40_000), { id: crypto.randomUUID() });
    const response = await supabaseRequest(env, '/rest/v1/calendar_becky_entries?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(entry) });
    return json((await response.json())[0], 201);
  }
  if (request.method === 'PUT' && new URL(request.url).pathname === '/api/admin/calendar/week') {
    const body = await readJson(request, 120_000);
    const weekStart = String(body?.week_start || '').trim();
    const start = new Date(`${weekStart}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || Number.isNaN(start.getTime()) || start.getDay() !== 1 || !Array.isArray(body?.entries) || body.entries.length > 50) return json({ error: 'Calendar week invalid' }, 400);
    const dates = Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date.toISOString().slice(0, 10); });
    const entries = body.entries.map(entry => normalizeCalendarEntryInput(entry));
    if (entries.some(entry => !dates.includes(entry.date))) return json({ error: 'Calendar entry outside week' }, 400);
    const existingResponse = await supabaseRequest(env, `/rest/v1/calendar_becky_entries?select=id&date=gte.${dates[0]}&date=lte.${dates[6]}`);
    const existing = await existingResponse.json();
    if (existing.length) await supabaseRequest(env, `/rest/v1/calendar_becky_entries?id=in.(${existing.map(entry => encodeURIComponent(entry.id)).join(',')})`, { method: 'DELETE' });
    if (!entries.length) return json({ entries: [] });
    const response = await supabaseRequest(env, '/rest/v1/calendar_becky_entries?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(entries) });
    const rows = await response.json();
    rows.sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`));
    return json({ entries: rows });
  }
  const match = request.url.match(/\/api\/admin\/calendar\/([^/?]+)$/);
  if (!match) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
  const id = decodeURIComponent(match[1]);
  if (request.method === 'DELETE') {
    await supabaseRequest(env, `/rest/v1/calendar_becky_entries?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return json({ ok: true });
  }
  if (request.method === 'PATCH') {
    const body = await readJson(request, 40_000);
    const currentResponse = await supabaseRequest(env, `/rest/v1/calendar_becky_entries?id=eq.${encodeURIComponent(id)}&select=${CALENDAR_COLUMNS}`);
    const current = (await currentResponse.json())[0];
    if (!current) return json({ error: 'Calendar entry not found' }, 404);
    const entry = normalizeCalendarEntryInput({ ...current, ...body, id }, current);
    delete entry.created_at;
    const response = await supabaseRequest(env, `/rest/v1/calendar_becky_entries?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(entry) });
    return json((await response.json())[0]);
  }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
}

async function getDocument(env, key) {
  const response = await supabaseRequest(env, `/rest/v1/app_documents?key=eq.${encodeURIComponent(key)}&select=payload&limit=1`);
  const rows = await response.json();
  if (!rows.length) throw Object.assign(new Error(`Document not seeded: ${key}`), { status: 404 });
  return rows[0].payload;
}

async function saveDocument(env, key, payload, userId) {
  const response = await supabaseRequest(env, '/rest/v1/app_documents?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{ key, payload, updated_by: userId }])
  });
  const rows = await response.json();
  return rows[0].payload;
}

async function requireAdmin(request, env) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: authorization
    }
  });
  if (!response.ok) throw Object.assign(new Error('Session invalid or expired'), { status: 401 });
  const user = await response.json();
  const allowed = String(env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  if (!user.email || !allowed.includes(user.email.toLowerCase())) {
    throw Object.assign(new Error('Admin access denied'), { status: 403 });
  }
  return user;
}

function adminEmailAllowed(env, email) {
  const allowed = String(env.ADMIN_EMAILS || '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

async function supabaseAuth(env, grantType, body) {
  requireEnvironment(env);
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error('Emailul sau parola nu sunt corecte'), { status: 401 });
  }
  if (!adminEmailAllowed(env, result.user?.email)) {
    throw Object.assign(new Error('Contul nu are acces la administrare'), { status: 403 });
  }
  return result;
}

async function handleAuth(request, env, pathname) {
  if (pathname === '/api/auth/me') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
    const user = await requireAdmin(request, env);
    return json({ id: user.id, email: user.email });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  assertSameOrigin(request);
  const body = await readJson(request, 20_000);
  if (pathname === '/api/auth/login') {
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return json({ error: 'Emailul și parola sunt obligatorii' }, 400);
    }
    return json(await supabaseAuth(env, 'password', { email: body.email, password: body.password }));
  }
  if (pathname === '/api/auth/refresh') {
    if (typeof body.refresh_token !== 'string') return json({ error: 'Sesiune invalidă' }, 400);
    return json(await supabaseAuth(env, 'refresh_token', { refresh_token: body.refresh_token }));
  }
  return json({ error: 'Not found' }, 404);
}

function validateDocument(key, payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (key === 'manual') return Array.isArray(payload.blocks);
  if (key === 'styles') return typeof payload.css === 'string';
  if (key === 'workspaces') return Array.isArray(payload.workspaces);
  return false;
}

async function handleDocument(request, env, key) {
  if (request.method === 'GET') {
    await requireAdmin(request, env);
    return json(await getDocument(env, key));
  }
  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, PUT' });
  assertSameOrigin(request);
  const admin = await requireAdmin(request, env);
  const limits = { manual: 5_000_000, styles: 1_000_000, workspaces: 12_000_000 };
  const payload = await readJson(request, limits[key]);
  if (!validateDocument(key, payload)) return json({ error: 'Invalid document' }, 400);
  payload.updatedAt = new Date().toISOString();
  return json(await saveDocument(env, key, payload, admin.id));
}

async function handleCarouselImage(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  assertSameOrigin(request);
  await requireAdmin(request, env);
  if (!env.OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY lipsește din configurația Worker-ului'), { status: 503 });
  const body = await readJson(request, 30_000);
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const quality = ['low', 'medium', 'high'].includes(body?.quality) ? body.quality : 'medium';
  const transparent = body?.transparent === true;
  if (!prompt || prompt.length > 8_000) return json({ error: 'Descrierea imaginii este invalidă' }, 400);
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, size: '1024x1024', quality, output_format: 'webp', output_compression: 82, ...(transparent ? { background: 'transparent' } : {}) })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.data?.[0]?.b64_json) {
    console.error('OpenAI image generation failed', response.status, result.error?.code || result.error?.message || 'unknown');
    const message = response.status === 401 ? 'Cheia OpenAI nu este validă.' : response.status === 429 ? 'Limita OpenAI a fost atinsă. Încearcă din nou în câteva momente.' : 'Generarea imaginii nu a reușit';
    return json({ error: message }, response.status === 401 ? 503 : response.status === 429 ? 429 : 502);
  }
  return json({ image: result.data[0].b64_json, mimeType: 'image/webp', model: 'gpt-image-2' });
}

async function handleCarouselPlan(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  assertSameOrigin(request);
  await requireAdmin(request, env);
  if (!env.OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY lipsește din configurația Worker-ului'), { status: 503 });
  const body = await readJson(request, 40_000);
  const context = typeof body?.context === 'string' ? body.context.trim() : '';
  if (!context || context.length > 12_000) return json({ error: 'Contextul postării este invalid' }, 400);
  const headingPart = { type: 'object', additionalProperties: false, properties: { text: { type: 'string' }, color: { type: 'string', enum: ['teal', 'coral'] }, breakBefore: { type: 'boolean' } }, required: ['text', 'color', 'breakBefore'] };
  const slide = { type: 'object', additionalProperties: false, properties: { heading: { type: 'string' }, body: { type: 'string' }, headingParts: { type: 'array', minItems: 2, maxItems: 2, items: headingPart }, artworkInstruction: { type: 'string' } }, required: ['heading', 'body', 'headingParts', 'artworkInstruction'] };
  const schema = { type: 'object', additionalProperties: false, properties: { slides: { type: 'array', minItems: 5, maxItems: 5, items: slide }, caption: { type: 'string', minLength: 40, maxLength: 400 } }, required: ['slides', 'caption'] };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
      instructions: `Creează direct draftul final de text pentru un carousel social media Becky’s Garden în limba română. Obiectiv unic: awareness prin informație de calitate, prezentată matur, profesionist și atractiv.

REGULA EDITORIALĂ PRINCIPALĂ: nu aduna idei pedagogice corecte doar fiindcă au legătură cu aceeași temă. Construiește o singură intervenție coerentă, ancorată într-un moment precis din viața părintelui. Înainte de redactare, stabilește intern: (1) comportamentul observabil al copilului, (2) clipa exactă în care părintele are nevoie de ajutor, (3) rezultatul imediat promis și (4) ordinea logică a răspunsurilor. Toate slide-urile de conținut trebuie să păstreze același actor, aceeași situație, aceeași scară de timp și același rezultat.

Fir obligatoriu: slide 1 numește situația recognoscibilă și promite concret 3 răspunsuri/pași pentru acel moment; slide-urile 2–4 formează o secvență progresivă, nu trei sfaturi independente; slide 5 încheie conversațional și nu este prezentat drept una dintre soluții. Fiecare pas trebuie să decurgă din cel anterior: ce face părintele mai întâi, ce face dacă acel lucru nu ajunge, apoi care este nivelul minim următor de sprijin. Nu amesteca pregătirea activității, intervenția din timpul blocajului, feedbackul de după și reflecția de final sub aceeași promisiune. Le poți combina numai dacă hook-ul promite explicit un proces complet de la început la final, iar ordinea temporală este evidentă.

Aplicabilitate și realism: fiecare slide 2–4 trebuie să ofere o acțiune observabilă pe care părintele o poate face imediat și, când încape natural, o replică exactă, scurtă, pe care o poate spune. Pornește de la scene casnice recognoscibile, nu de la concepte precum autonomie, reziliență, proces sau scaffolding. Explicația poate arăta mecanismul, dar acțiunea concretă rămâne în centru. O soluție bună deschide următoarea opțiune fără să refuze copilului ajutorul și fără să ceară părintelui să aplice rigid o tehnică.

Test de coerență înainte de răspuns: rezumă mental carouselul ca „Când X se întâmplă, fă A; dacă încă este blocat, fă B; apoi C”. Dacă nu poate fi rezumat astfel, reconstruiește-l. Elimină orice slide care este adevărat în general, dar nu răspunde direct promisiunii de pe copertă. Test de utilitate: părintele trebuie să știe ce poate spune sau face în următoarele 30 de secunde. Test de lumină nouă: pașii nu sunt sinonime; fiecare reduce altfel blocajul și pregătește următorul nivel de sprijin.

Hook-ul și conținutul trebuie să livreze aceeași promisiune. Dacă slide-urile oferă strategii pentru schimbarea unui comportament, hook-ul formulează scurt comportamentul recognoscibil, de exemplu „Cere ajutor înainte să încerce singur?”, și NU întreabă „De ce...?”, deoarece asta ar promite explicarea cauzelor. Folosește „De ce...?” numai când slide-urile următoare explică efectiv motive sau mecanisme. Pentru exemplul cu cererea de ajutor, o secvență coerentă este: adultul nu preia și confirmă că este disponibil → cere copilului să arate primul pas → restrânge alegerile sau oferă indiciul minim. Nu devia spre aprecierea efortului ori întrebări retrospective, deoarece acestea se petrec după momentul promis.

Headerele slide-urilor 2–4 încep cu un verb de acțiune adresat părintelui; nu folosi adevăruri abstracte precum „Frustrarea face parte din creștere”. Nu vinde agresiv și nu cere utilizatorului alte alegeri. Folosește numai afirmațiile susținute de context; nu inventa studii, cifre sau concluzii. Body-ul copertei urmează forma „3 răspunsuri/pași care [rezultat imediat legat de situație]”, alegând substantivul potrivit mecanismului. Sunt interzise drept hook afirmațiile instituționale și generice precum „Încurajăm răbdarea celor mici”, „Susținem dezvoltarea”, „Copiii învață prin joacă” sau orice formulare care începe cu „La Becky…”, „Încurajăm…”, „Susținem…”, „Promovăm…”. Headerele au 4–10 cuvinte, descrierile maximum 24 de cuvinte. Headerul formulează acțiunea slide-ului; descrierea o concretizează și NU repetă, NU continuă și NU începe cu aceleași cuvinte ca headerul. Fiecare card trebuie să fie clar la citire, iar împreună cardurile trebuie să funcționeze ca un singur traseu. CTA-ul continuă situația postării. Descrierea lui folosește exact: „Scrie-ne în comentarii ce funcționează la voi. Ideea ta poate inspira și alți părinți. [emoji adecvat subiectului]”. Alege un singur emoji relevant și variază-l între teme; nu folosi mereu aceeași inimă sau aceeași steluță.

Pe lângă slide-uri, scrie caption: un teaser social media scurt, NU un rezumat al carouselului. Are exact două paragrafe: (1) o singură observație de 10–18 cuvinte care exprimă emoția sau miza situației și poate include un emoji potrivit; (2) o întrebare de 8–18 cuvinte care deschide curiozitatea și îl face pe părinte să caute răspunsul în slide-uri. Nu numi, nu enumera și nu parafraza soluțiile. Nu explica mecanismul pedagogic, nu oferi concluzia și nu anticipa traseul cardurilor. Maximum 36 de cuvinte în total și maximum un emoji. Nu folosi hashtaguri, titlu, listă sau separator „---”. Model de profunzime și ritm: „Uneori, nu corectarea îl doare, ci felul în care ajunge la el. 💛\n\nCum îl ajuți să audă îndrumarea fără să simtă că este el greșeala?”.

Pentru ORICE slide, inclusiv cover și CTA, headingParts conține exact două fragmente semantice: primul este contextul ideii, color teal și breakBefore true; al doilea este sintagma-cheie care poartă concluzia sau schimbă sensul propoziției, color coral și breakBefore false. Cele două fragmente trebuie să recompună exact heading-ul. artworkInstruction descrie un singur simbol sau o singură ilustrație simplă, fără text. Respectă vocea, audiența, vocabularul și CTA-ul din brand.`,
      input: JSON.stringify({ context, brand: body?.brand || {} }),
      text: { format: { type: 'json_schema', name: 'becky_carousel_plan', strict: true, schema } }
    })
  });
  const result = await response.json().catch(() => ({}));
  const outputText = result.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!response.ok || !outputText) {
    console.error('OpenAI carousel plan failed', response.status, result.error?.code || result.error?.message || 'unknown');
    return json({ error: response.status === 429 ? 'Limita OpenAI a fost atinsă.' : 'Draftul carouselului nu a putut fi construit.' }, response.status === 429 ? 429 : 502);
  }
  return json({ plan: JSON.parse(outputText), model: result.model });
}

async function handleCarouselEdit(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  assertSameOrigin(request);
  await requireAdmin(request, env);
  if (!env.OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY lipsește din configurația Worker-ului'), { status: 503 });
  const body = await readJson(request, 30_000);
  const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction || instruction.length > 2_000 || !body?.slide || typeof body.slide !== 'object') return json({ error: 'Instrucțiunea pentru slide este invalidă' }, 400);
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      heading: { type: ['string', 'null'] }, body: { type: ['string', 'null'] }, headingParts: { type: ['array', 'null'], items: { type: 'object', additionalProperties: false, properties: { text: { type: 'string' }, color: { type: 'string', enum: ['teal', 'coral'] } }, required: ['text', 'color'] } }, artworkInstruction: { type: ['string', 'null'] },
      headerOffsetDelta: { type: 'integer', minimum: -80, maximum: 80 }, artworkOffsetDelta: { type: 'integer', minimum: -160, maximum: 160 },
      decorationOffsetDelta: { type: 'integer', minimum: -120, maximum: 120 }, decorationMode: { type: 'string', enum: ['keep', 'balanced', 'airy', 'opposite'] }
    },
    required: ['heading', 'body', 'headingParts', 'artworkInstruction', 'headerOffsetDelta', 'artworkOffsetDelta', 'decorationOffsetDelta', 'decorationMode']
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
      instructions: 'Ești editorul de layout pentru un carousel Becky în limba română. Aplică doar schimbările cerute și respectă regulile din currentSlide.brand pentru voce, audiență, vocabular și CTA. Pentru câmpurile de text sau ilustrație necerute întoarce null. Offseturile sunt diferențe în pixeli față de poziția curentă; întoarce 0 dacă nu se cere mutarea. heading trebuie să rămână scurt, clar și de sine stătător. body trebuie să explice relevanța pentru părinte. Fontul Mali, conturul alb, norii și paginația sunt reguli fixe de brand. Dacă utilizatorul indică exact ce parte din header vrea teal sau coral, întoarce headingParts în ordinea afișării, fiecare fragment având textul și culoarea cerută; fiecare fragment devine un rând colorat. Dacă nu cere culori, headingParts trebuie să fie null și aplicația păstrează alternanța implicită teal/coral.',
      input: JSON.stringify({ instruction, currentSlide: body.slide }),
      text: { format: { type: 'json_schema', name: 'carousel_slide_edit', strict: true, schema } }
    })
  });
  const result = await response.json().catch(() => ({}));
  const outputText = result.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!response.ok || !outputText) {
    console.error('OpenAI slide edit failed', response.status, result.error?.code || result.error?.message || 'unknown');
    return json({ error: response.status === 429 ? 'Limita OpenAI a fost atinsă.' : 'Content Assistant nu a putut interpreta modificarea.' }, response.status === 429 ? 429 : 502);
  }
  return json({ edit: JSON.parse(outputText), model: result.model });
}

async function handleSurvey(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  assertSameOrigin(request);
  const body = await readJson(request, 500_000);
  if (!body || typeof body.answers !== 'object' || !Array.isArray(body.duels) || !Array.isArray(body.conceptRanking)) {
    return json({ error: 'Survey response invalid' }, 400);
  }
  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  await supabaseRequest(env, '/rest/v1/event_survey_responses', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id,
      submitted_at: submittedAt,
      answers: body.answers,
      duels: body.duels,
      concept_ranking: body.conceptRanking,
      schema_version: 2
    })
  });
  return json({ id, submittedAt }, 201);
}

async function handleSurveyFunnel(request, env) {
  if (request.method === 'POST') {
    assertSameOrigin(request);
    const body = await readJson(request, 20_000);
    const eventTypes = new Set(['open', 'step', 'complete']);
    if (!body || typeof body.sessionId !== 'string' || !eventTypes.has(body.eventType)) {
      return json({ error: 'Funnel event invalid' }, 400);
    }
    const step = Number(body.step);
    if (!Number.isInteger(step) || step < 0 || step > 13) return json({ error: 'Funnel step invalid' }, 400);
    await supabaseRequest(env, '/rest/v1/event_survey_funnel_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        session_id: body.sessionId,
        event_type: body.eventType,
        step,
        section: Number.isInteger(body.section) ? body.section : null,
        milestone: Number.isInteger(body.milestone) ? body.milestone : null,
        duel_index: Number.isInteger(body.duelIndex) ? body.duelIndex : null
      })
    });
    return json({ ok: true }, 201);
  }
  if (request.method === 'GET') {
    await requireAdmin(request, env);
    const response = await supabaseRequest(
      env,
      '/rest/v1/event_survey_funnel_events?select=session_id,event_type,step,section,milestone,duel_index,created_at&order=created_at.asc&limit=100000'
    );
    return json({ events: await response.json(), generatedAt: new Date().toISOString() });
  }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
}

async function handleSurveyResults(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  await requireAdmin(request, env);
  const response = await supabaseRequest(
    env,
    '/rest/v1/event_survey_responses?select=id,submitted_at,answers,duels,concept_ranking,schema_version&order=submitted_at.desc&limit=5000'
  );
  const rows = await response.json();
  return json({ responses: rows, generatedAt: new Date().toISOString() });
}

async function handlePlaygroundSurvey(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  assertSameOrigin(request);
  const body = await readJson(request, 250_000);
  if (!body || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
    return json({ error: 'Survey response invalid' }, 400);
  }
  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  await supabaseRequest(env, '/rest/v1/playground_survey_responses', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ id, submitted_at: submittedAt, answers: body.answers, schema_version: 1 })
  });
  return json({ id, submittedAt }, 201);
}

async function handlePlaygroundFunnel(request, env) {
  if (request.method === 'POST') {
    assertSameOrigin(request);
    const body = await readJson(request, 20_000);
    if (!body || typeof body.sessionId !== 'string' || !['open', 'step', 'complete'].includes(body.eventType)) {
      return json({ error: 'Funnel event invalid' }, 400);
    }
    const step = Number(body.step);
    if (!Number.isInteger(step) || step < 0 || step > 10) return json({ error: 'Funnel step invalid' }, 400);
    await supabaseRequest(env, '/rest/v1/playground_survey_funnel_events', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ session_id: body.sessionId, event_type: body.eventType, step, section: Number.isInteger(body.section) ? body.section : null })
    });
    return json({ ok: true }, 201);
  }
  if (request.method === 'GET') {
    await requireAdmin(request, env);
    const response = await supabaseRequest(env, '/rest/v1/playground_survey_funnel_events?select=session_id,event_type,step,section,created_at&order=created_at.asc&limit=100000');
    return json({ events: await response.json(), generatedAt: new Date().toISOString() });
  }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
}

async function handlePlaygroundResults(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  await requireAdmin(request, env);
  const response = await supabaseRequest(env, '/rest/v1/playground_survey_responses?select=id,submitted_at,answers,schema_version&order=submitted_at.desc&limit=5000');
  return json({ responses: await response.json(), generatedAt: new Date().toISOString() });
}

async function handlePlaygroundRaffle(request, env) {
  if (request.method === 'POST') {
    assertSameOrigin(request);
    const body = await readJson(request, 20_000);
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    if (!firstName || firstName.length > 60 || phone.length < 9 || phone.length > 15 || body.consent !== true) {
      return json({ error: 'Raffle entry invalid' }, 400);
    }
    const drawMonth = `${new Date().toISOString().slice(0, 7)}-01`;
    await supabaseRequest(env, '/rest/v1/playground_survey_raffle_entries?on_conflict=phone,draw_month', {
      method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ first_name: firstName, phone, consent: true, draw_month: drawMonth })
    });
    return json({ ok: true }, 201);
  }
  if (request.method === 'GET') {
    await requireAdmin(request, env);
    const response = await supabaseRequest(env, '/rest/v1/playground_survey_raffle_entries?select=id,first_name,phone,draw_month,created_at&order=created_at.desc&limit=5000');
    return json({ entries: await response.json(), generatedAt: new Date().toISOString() });
  }
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

async function downloadManual(env) {
  const [document, styles] = await Promise.all([
    getDocument(env, 'manual'),
    getDocument(env, 'styles')
  ]);
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${escapeHtml(document.title || 'Becky Friends')}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mali:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap"><style>body{font:16px 'Nunito',sans-serif;max-width:820px;margin:50px auto;line-height:1.6;color:#243447}h1,h2,h3{font-family:'Mali',sans-serif;font-weight:500;color:#168F9F}.manual-content .chapter-number{font-family:'Nunito',sans-serif;font-weight:700;color:#FB7176}li{margin:.35rem 0}</style><style>${styles.css || ''}</style></head><body><main class="manual-content"><h1>${escapeHtml(document.title || '')}</h1>${document.blocks.map(block => block.html).join('\n')}</main></body></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="becky-friends-manual.html"',
      ...SECURITY_HEADERS
    }
  });
}

async function handleApi(request, env, pathname) {
  if (pathname === '/api/runtime') return json({
    runtime: 'cloudflare',
    authRequired: true,
    testingMode: env.APP_ENV === 'testing'
  });
  if (pathname.startsWith('/api/auth/')) return handleAuth(request, env, pathname);
  if (pathname === '/api/admin/tasks' || pathname.startsWith('/api/admin/tasks/')) return handleAdminTasks(request, env);
  if (pathname === '/api/admin/becky-memory/analyze' || pathname === '/api/admin/becky-memory/signals' || pathname.startsWith('/api/admin/becky-memory/signals/') || pathname === '/api/admin/becky-memory/attention' || pathname.startsWith('/api/admin/becky-memory/attention/')) return handleBeckyMemory(request, env);
  if (pathname === '/api/admin/becky-inbox/context' || pathname === '/api/admin/becky-inbox/brief' || pathname === '/api/admin/becky-inbox/analyze' || pathname === '/api/admin/becky-inbox/proposals' || pathname.startsWith('/api/admin/becky-inbox/proposals/')) return handleBeckyInbox(request, env);
  if (pathname === '/api/admin/content-lab/ideas' || pathname.startsWith('/api/admin/content-lab/ideas/')) return handleContentLabIdeas(request, env);
  if (pathname === '/api/admin/event-community/findings' || pathname.startsWith('/api/admin/event-community/findings/')) return handleEventCommunityFindings(request, env);
  if (pathname === '/api/admin/knowledge-candidates' || pathname.startsWith('/api/admin/knowledge-candidates/')) return handleKnowledgeCandidates(request, env);
  if (pathname === '/api/admin/crm' || pathname.startsWith('/api/admin/crm/')) return handleAdminCrm(request, env);
  if (pathname === '/api/admin/experience-repertoire' || pathname.startsWith('/api/admin/experience-repertoire/')) return handleExperienceRepertoire(request, env);
  if (pathname === '/api/admin/pedagogic-coverage' || pathname === '/api/admin/becky-themed-activities' || pathname.startsWith('/api/admin/becky-themed-activities/')) return handleBeckyThemedActivities(request, env);
  if (pathname === '/api/admin/children-activity-validations') return handleBeckyThemedActivities(request, env);
  if (pathname === '/api/admin/monthly-report' || pathname.startsWith('/api/admin/monthly-report/')) return handleAdminMonthlyReport(request, env);
  if (pathname === '/api/admin/activity-observations' || pathname.startsWith('/api/admin/activity-observations/')) return handleActivityObservations(request, env);
  if (pathname === '/api/admin/calendar' || pathname.startsWith('/api/admin/calendar/')) return handleAdminCalendar(request, env);
  if (pathname === '/api/event-survey/results') return handleSurveyResults(request, env);
  if (pathname === '/api/event-survey/funnel') return handleSurveyFunnel(request, env);
  if (pathname === '/api/event-survey') return handleSurvey(request, env);
  if (pathname === '/api/playground-survey/results') return handlePlaygroundResults(request, env);
  if (pathname === '/api/playground-survey/funnel') return handlePlaygroundFunnel(request, env);
  if (pathname === '/api/playground-survey/raffle') return handlePlaygroundRaffle(request, env);
  if (pathname === '/api/playground-survey') return handlePlaygroundSurvey(request, env);
  if (pathname === '/api/content/carousel/image') return handleCarouselImage(request, env);
  if (pathname === '/api/content/carousel/plan') return handleCarouselPlan(request, env);
  if (pathname === '/api/content/carousel/edit') return handleCarouselEdit(request, env);
  if (pathname === '/api/manual/download') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
    await requireAdmin(request, env);
    return downloadManual(env);
  }
  const key = DOCUMENT_KEYS[pathname];
  if (key) return handleDocument(request, env, key);
  return json({ error: 'Not found' }, 404);
}

async function handleAsset(request, env, pathname) {
  const target = ROUTES.get(pathname) || pathname;
  const url = new URL(request.url);
  url.pathname = target;
  if (target.endsWith('.html')) url.searchParams.set('__asset', HTML_ASSET_VERSION);
  const response = withSecurityHeaders(await env.ASSETS.fetch(new Request(url, request)));
  if (target.endsWith('.html')) response.headers.set('Cache-Control', 'no-store');
  return response;
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env, url.pathname);
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
      }
      return await handleAsset(request, env, url.pathname);
    } catch (error) {
      if (!error.status || error.status >= 500) console.error(error);
      return json({ error: error.message || 'Unexpected error' }, error.status || 500);
    }
  }
};
