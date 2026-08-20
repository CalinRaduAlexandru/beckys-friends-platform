import { EXECUTABLE_DESTINATIONS, resolveAiProposal, validateProposedChange, proposalDedupeKey, canonicalExecutionPayload, sha256 } from './becky-inbox/core.mjs';
import { analyzeDailyNoteWithOpenAI } from './becky-inbox/analyze.mjs';

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
const BECKY_INBOX_COLUMNS = 'id,source_type,source_id,source_version,source_hash,source_excerpt,destination,operation,target_entity_type,target_entity_id,target_candidates,payload,field_provenance,status,validation_errors,missing_fields,destination_entity_id,dedupe_key,created_at,updated_at,executed_at,last_error';
const MONTHLY_REPORT_ROLES = [
  ['experienta-copilului', 'Experiența copilului'], ['relatia-cu-parintii', 'Relația cu părinții'], ['design-pedagogic', 'Design pedagogic'], ['cultura-experienta-becky', 'Cultura & experiența Becky'], ['marketing-comunicare', 'Marketing & comunicare'], ['sisteme-tehnologie', 'Sisteme & tehnologie'], ['operatiuni-logistica', 'Operațiuni & logistică'], ['strategie-dezvoltare', 'Strategie & dezvoltare']
];
const MONTHLY_REPORT_SECTION_KEYS = ['scope', 'objectives', 'metrics', 'done', 'evidence', 'learned', 'next_step'];
const MONTHLY_REPORT_STATUSES = ['În parametri', 'Necesită atenție', 'În urmă', 'Fără suficiente date'];
const MONTHLY_REPORT_COLUMNS = 'id,month_key,label,status,scope,objectives,metrics,done,evidence,learned,next_step,notes,created_at,updated_at';
const MONTHLY_REPORT_ENTRY_TYPES = ['done', 'evidence', 'learned'];
const MONTHLY_REPORT_ENTRY_COLUMNS = 'id,month_key,entry_date,type,text,role_ids,source_type,source_id,created_at,updated_at';
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
async function handleBeckyInbox(request, env) {
  await requireAdmin(request, env); const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/api/admin/becky-inbox/context')return json(await productionBeckyContext(env));
  if(request.method==='GET'&&url.pathname==='/api/admin/becky-inbox/proposals'){
    const destination=String(url.searchParams.get('destination')||'');const status=String(url.searchParams.get('status')||'');const sourceId=String(url.searchParams.get('source_id')||'');const filter=`${destination?`&destination=eq.${encodeURIComponent(destination)}`:''}${status?`&status=eq.${encodeURIComponent(status)}`:''}${sourceId?`&source_id=eq.${encodeURIComponent(sourceId)}`:''}`;const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?select=${BECKY_INBOX_COLUMNS}${filter}&order=created_at.desc`);let items=await response.json();const noteDates=[...new Set(items.filter(item=>item.source_type==='daily_note').map(item=>item.source_id))];const currentHashes=new Map();for(const date of noteDates){const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(date)}&select=note`);const note=(await noteResponse.json())[0]?.note||'';currentHashes.set(date,await sha256(note));}return json({proposals:items.map(item=>({...item,stale:item.source_type==='daily_note'&&currentHashes.get(item.source_id)!==item.source_hash}))});
  }
  assertSameOrigin(request);
  if(request.method==='POST'&&url.pathname==='/api/admin/becky-inbox/analyze'){
    const body=await readJson(request,100_000);const date=String(body?.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:'Data notei este invalidă.'},400);const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(date)}&select=note`);const noteText=String((await noteResponse.json())[0]?.note||'').trim();if(!noteText)return json({error:'Nota zilei nu există sau este goală.'},400);const context=await productionBeckyContext(env);const raw=await analyzeDailyNoteWithOpenAI({apiKey:env.OPENAI_API_KEY,model:env.OPENAI_TEXT_MODEL||'gpt-4.1-mini',noteDate:date,noteText,children:context.children,activities:context.activities,roles:context.roles});const sourceHash=await sha256(noteText);const proposals=[];
    for(const candidate of raw){const resolved=resolveAiProposal(candidate,{...context,note_date:date});if(!EXECUTABLE_DESTINATIONS.includes(resolved.destination))continue;const now=new Date().toISOString();const item={id:crypto.randomUUID(),source_type:'daily_note',source_id:date,source_version:sourceHash,source_hash:sourceHash,source_excerpt:resolved.source_excerpt,destination:resolved.destination,operation:resolved.operation||'add',target_entity_type:resolved.target_entity_type,target_entity_id:resolved.target_entity_id,target_candidates:resolved.target_candidates,payload:resolved.payload,field_provenance:resolved.field_provenance,status:'pending',validation_errors:[],missing_fields:[],destination_entity_id:null,created_at:now,updated_at:now,executed_at:null,last_error:null};item.validation_errors=validateProposedChange(item);item.missing_fields=item.validation_errors;item.dedupe_key=await proposalDedupeKey(item);const duplicateResponse=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?dedupe_key=eq.${encodeURIComponent(item.dedupe_key)}&select=${BECKY_INBOX_COLUMNS}&limit=1`);const duplicate=(await duplicateResponse.json())[0];if(duplicate){proposals.push(duplicate);continue;}const inserted=await supabaseRequest(env,'/rest/v1/admin_becky_inbox_proposals',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});proposals.push((await inserted.json())[0]);}
    return json({proposals,source_hash:sourceHash},201);
  }
  const match=url.pathname.match(/^\/api\/admin\/becky-inbox\/proposals\/([^/?]+)(?:\/(approve|ignore))?$/);if(!match)return json({error:'Method not allowed'},405);const id=decodeURIComponent(match[1]);const currentResponse=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}&select=${BECKY_INBOX_COLUMNS}`);const current=(await currentResponse.json())[0];if(!current)return json({error:'Propunerea nu a fost găsită'},404);
  if(request.method==='PATCH'&&!match[2]){if(['approved','ignored'].includes(current.status))return json({error:'Propunerea nu mai poate fi editată'},409);const body=await readJson(request,100_000);const context=await productionBeckyContext(env);const next={...current,payload:{...current.payload,...(body?.payload||{})},status:'pending',last_error:null,updated_at:new Date().toISOString()};if(body?.target_entity_id!==undefined){next.target_entity_id=String(body.target_entity_id||'')||null;if(next.destination==='activity_observation')next.payload.activity_id=next.target_entity_id;if(next.destination==='crm_child_observation')next.payload.child_id=next.target_entity_id;const options=next.destination==='activity_observation'?context.activities:context.children;const found=options.find(item=>item.id===next.target_entity_id);next.target_candidates=found?[{id:found.id,label:found.title||found.first_name}]:[];const key=next.destination==='activity_observation'?'activity_id':'child_id';next.field_provenance={...next.field_provenance,[key]:{source:found?'system':'missing',detail:found?'Selectat și confirmat de utilizator':'Selectează o entitate validă'}};}next.validation_errors=validateProposedChange(next);next.missing_fields=next.validation_errors;const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(next)});return json((await response.json())[0]);}
  if(request.method==='POST'&&match[2]==='ignore'){if(current.status==='approved')return json({error:'Propunerea este deja aprobată'},409);const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'ignored',updated_at:new Date().toISOString(),last_error:null})});return json((await response.json())[0]);}
  if(request.method==='POST'&&match[2]==='approve'){const body=await readJson(request,10_000);if(current.status==='approved')return json(current);if(current.status==='ignored')return json({error:'Propunerea a fost ignorată'},409);const noteResponse=await supabaseRequest(env,`/rest/v1/admin_monthly_report_notes?note_date=eq.${encodeURIComponent(current.source_id)}&select=note`);const currentHash=await sha256(String((await noteResponse.json())[0]?.note||''));if(currentHash!==current.source_hash&&!body.confirm_stale)return json({error:'Nota a fost modificată. Confirmă aprobarea propunerii vechi.',stale:true},409);const errors=validateProposedChange(current);if(errors.length)return json({error:errors[0],validation_errors:errors},400);try{const payload=canonicalExecutionPayload(current);const destinationId=`becky-inbox-${current.id}`;let entity;
      if(current.destination==='activity_observation'){const existing=await supabaseRequest(env,`/rest/v1/admin_activity_observations?id=eq.${encodeURIComponent(destinationId)}&select=${ACTIVITY_OBSERVATION_COLUMNS}`);entity=(await existing.json())[0];if(!entity){entity=normalizeActivityObservationInput({...payload,id:destinationId});const response=await supabaseRequest(env,'/rest/v1/admin_activity_observations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(entity)});entity=(await response.json())[0];}}
      else if(current.destination==='crm_child_observation'){const childResponse=await supabaseRequest(env,`/rest/v1/crm_children?id=eq.${encodeURIComponent(payload.child_id)}&select=id`);if(!(await childResponse.json()).length)throw Object.assign(new Error('Copilul nu a fost găsit'),{status:400});const existing=await supabaseRequest(env,`/rest/v1/crm_child_observations?id=eq.${encodeURIComponent(destinationId)}&select=${CRM_OBSERVATION_COLUMNS}`);entity=(await existing.json())[0];if(!entity){entity=normalizeCrmObservationInput({...payload,id:destinationId});const response=await supabaseRequest(env,'/rest/v1/crm_child_observations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(entity)});entity=(await response.json())[0];}}
      else if(current.destination==='monthly_report_entry'){const existing=await supabaseRequest(env,`/rest/v1/admin_monthly_report_entries?id=eq.${encodeURIComponent(destinationId)}&select=${MONTHLY_REPORT_ENTRY_COLUMNS}`);entity=(await existing.json())[0];if(!entity){entity=normalizeMonthlyReportEntryInput({...payload,id:destinationId},{},payload.month_key);const response=await supabaseRequest(env,'/rest/v1/admin_monthly_report_entries',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(entity)});entity=(await response.json())[0];}}
      const approved={status:'approved',destination_entity_id:entity.id,executed_at:new Date().toISOString(),updated_at:new Date().toISOString(),last_error:null,validation_errors:[],missing_fields:[]};const response=await supabaseRequest(env,`/rest/v1/admin_becky_inbox_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(approved)});return json((await response.json())[0]);
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
const CRM_VISIT_COLUMNS = 'id,child_id,visit_date,note,created_at';
const CRM_OBSERVATION_COLUMNS = 'id,child_id,visit_id,observed_at,observation,created_at,updated_at';

async function handleAdminCrm(request, env) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/admin/crm') {
    const [childrenResponse, visitsResponse] = await Promise.all([
      supabaseRequest(env, `/rest/v1/crm_children?select=${CRM_CHILD_COLUMNS}&order=first_name.asc`),
      supabaseRequest(env, `/rest/v1/crm_visits?select=${CRM_VISIT_COLUMNS}&order=visit_date.desc,created_at.desc`)
    ]);
    const children = await childrenResponse.json();
    const visits = await visitsResponse.json();
    return json({ children: children.map(child => crmChildSummary(child, visits)).sort((a, b) => (b.last_visit || '').localeCompare(a.last_visit || '') || a.first_name.localeCompare(b.first_name, 'ro')) });
  }
  assertSameOrigin(request);
  if (request.method === 'POST' && url.pathname === '/api/admin/crm/children') {
    const body = await readJson(request, 20_000);
    const child = normalizeCrmChildInput(body);
    const response = await supabaseRequest(env, '/rest/v1/crm_children?on_conflict=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(child) });
    return json((await response.json())[0], 201);
  }
  if (request.method === 'POST' && url.pathname === '/api/admin/crm/visits') {
    const body = await readJson(request, 20_000);
    const childId = String(body?.child_id || '').trim();
    const childResponse = await supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(childId)}&select=id`);
    if (!(await childResponse.json()).length) return json({ error: 'Copilul nu a fost găsit' }, 404);
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
  const match = url.pathname.match(/^\/api\/admin\/crm\/children\/([^/?]+)$/);
  if (request.method === 'DELETE' && match) {
    const id = decodeURIComponent(match[1]);
    await supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return json({ ok: true });
  }
  if (request.method === 'PATCH' && match) {
    const id = decodeURIComponent(match[1]);
    const body = await readJson(request, 20_000);
    const child = { ...normalizeCrmChildInput({ ...body, id }), updated_at: new Date().toISOString() };
    const response = await supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(child) });
    const rows = await response.json();
    if (!rows.length) return json({ error: 'Copilul nu a fost găsit' }, 404);
    return json(rows[0]);
  }
  if (request.method === 'GET' && match) {
    const id = decodeURIComponent(match[1]);
    const [childResponse, visitsResponse] = await Promise.all([
      supabaseRequest(env, `/rest/v1/crm_children?id=eq.${encodeURIComponent(id)}&select=${CRM_CHILD_COLUMNS}`),
      supabaseRequest(env, `/rest/v1/crm_visits?child_id=eq.${encodeURIComponent(id)}&select=${CRM_VISIT_COLUMNS}&order=visit_date.desc,created_at.desc`)
    ]);
    const child = (await childResponse.json())[0];
    if (!child) return json({ error: 'Copilul nu a fost găsit' }, 404);
    const visits = await visitsResponse.json();
    const observationsResponse = await supabaseRequest(env, `/rest/v1/crm_child_observations?child_id=eq.${encodeURIComponent(id)}&select=${CRM_OBSERVATION_COLUMNS}&order=observed_at.desc,created_at.desc`);
    return json({ child: crmChildSummary(child, visits), visits, observations: await observationsResponse.json() });
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
  if (!id || !childId || !/^\d{4}-\d{2}-\d{2}$/.test(visit_date) || note.length > 500) throw Object.assign(new Error('CRM visit invalid'), { status: 400 });
  return { id, child_id: childId, visit_date, note };
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
  if (pathname === '/api/admin/becky-inbox/context' || pathname === '/api/admin/becky-inbox/analyze' || pathname === '/api/admin/becky-inbox/proposals' || pathname.startsWith('/api/admin/becky-inbox/proposals/')) return handleBeckyInbox(request, env);
  if (pathname === '/api/admin/content-lab/ideas' || pathname.startsWith('/api/admin/content-lab/ideas/')) return handleContentLabIdeas(request, env);
  if (pathname === '/api/admin/event-community/findings' || pathname.startsWith('/api/admin/event-community/findings/')) return handleEventCommunityFindings(request, env);
  if (pathname === '/api/admin/knowledge-candidates' || pathname.startsWith('/api/admin/knowledge-candidates/')) return handleKnowledgeCandidates(request, env);
  if (pathname === '/api/admin/crm' || pathname.startsWith('/api/admin/crm/')) return handleAdminCrm(request, env);
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
