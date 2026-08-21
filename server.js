const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(ROOT, 'data', 'manual.json');
const CSS_FILE = path.join(ROOT, 'data', 'custom.css');
const WORKSPACES_FILE = process.env.BECKY_WORKSPACES_FILE || path.join(ROOT, 'data', 'workspaces.json');
const EVENT_SURVEY_FILE = path.join(ROOT, 'data', 'event-survey-responses.json');
const EVENT_FUNNEL_FILE = path.join(ROOT, 'data', 'event-survey-funnel-events.json');
const PLAYGROUND_SURVEY_FILE = path.join(ROOT, 'data', 'playground-survey-responses.json');
const PLAYGROUND_FUNNEL_FILE = path.join(ROOT, 'data', 'playground-survey-funnel-events.json');
const PLAYGROUND_RAFFLE_FILE = path.join(ROOT, 'data', 'playground-survey-raffle.json');
const ADMIN_TASKS_FILE = path.join(ROOT, 'data', 'admin-tasks.json');
const ADMIN_CALENDAR_FILE = path.join(ROOT, 'data', 'admin-calendar.json');
const ADMIN_CRM_FILE = process.env.BECKY_CRM_FILE || path.join(ROOT, 'data', 'admin-crm.json');
const ADMIN_MONTHLY_REPORT_FILE = process.env.BECKY_MONTHLY_REPORT_FILE || path.join(ROOT, 'data', 'admin-monthly-report.json');
const ADMIN_ACTIVITY_OBSERVATIONS_FILE = process.env.BECKY_ACTIVITY_OBSERVATIONS_FILE || path.join(ROOT, 'data', 'admin-activity-observations.json');
const ADMIN_CONTENT_LAB_IDEAS_FILE = path.join(ROOT, 'data', 'admin-content-lab-ideas.json');
const ADMIN_EVENT_FINDINGS_FILE = path.join(ROOT, 'data', 'admin-event-community-findings.json');
const ADMIN_KNOWLEDGE_CANDIDATES_FILE = path.join(ROOT, 'data', 'admin-knowledge-candidates.json');
const ADMIN_EXPERIENCE_REPERTOIRE_FILE = path.join(ROOT, 'data', 'admin-experience-repertoire.json');
const EXPERIENCE_REPERTOIRE_SEED_FILE = path.join(ROOT, 'data', 'admin-experience-repertoire.seed.json');
const ADMIN_BECKY_THEMED_ACTIVITIES_FILE = path.join(ROOT, 'data', 'admin-becky-themed-activities.json');
const ADMIN_CHILDREN_ACTIVITY_VALIDATIONS_FILE = path.join(ROOT, 'data', 'admin-children-activity-validations.json');
const ADMIN_BECKY_INBOX_FILE = process.env.BECKY_INBOX_STORE_FILE || path.join(ROOT, 'data', 'admin-becky-inbox-proposals.json');
const ADMIN_BECKY_BRIEF_FILE = process.env.BECKY_BRIEF_STORE_FILE || path.join(ROOT, 'data', 'admin-becky-brief.json');
const ADMIN_BECKY_MEMORY_FILE = process.env.BECKY_MEMORY_STORE_FILE || path.join(ROOT, 'data', 'admin-becky-memory-signals.json');
const ADMIN_BECKY_ATTENTION_FILE = process.env.BECKY_ATTENTION_STORE_FILE || path.join(ROOT, 'data', 'admin-becky-attention-candidates.json');
const PUBLIC = path.join(ROOT, 'public');
const beckyInboxCorePromise = import('./src/becky-inbox/core.mjs');
const beckyInboxAnalyzePromise = import('./src/becky-inbox/analyze.mjs');
const beckyMemoryCorePromise = import('./src/becky-memory/core.mjs');
const beckyMemoryAnalyzePromise = import('./src/becky-memory/analyze.mjs');

const MONTHLY_REPORT_ROLES = [
  ['experienta-copilului', 'Experiența copilului'], ['relatia-cu-parintii', 'Relația cu părinții'],
  ['design-pedagogic', 'Design pedagogic'], ['cultura-experienta-becky', 'Cultura & experiența Becky'],
  ['marketing-comunicare', 'Marketing & comunicare'], ['sisteme-tehnologie', 'Sisteme & tehnologie'],
  ['operatiuni-logistica', 'Operațiuni & logistică'], ['strategie-dezvoltare', 'Strategie & dezvoltare']
];
const MONTHLY_REPORT_SECTION_KEYS = ['scope', 'objectives', 'metrics', 'done', 'evidence', 'learned', 'next_step'];
const MONTHLY_REPORT_STATUSES = ['În parametri', 'Necesită atenție', 'În urmă', 'Fără suficiente date'];
const MONTHLY_REPORT_ENTRY_TYPES = ['done', 'evidence', 'learned'];
const CONTENT_LAB_IDEA_TYPES = ['growth_story', 'behind_the_scenes', 'authority_expertise', 'reusable_insight'];
const CONTENT_LAB_IDEA_STATUSES = ['active', 'archived'];
const EVENT_FINDING_KINDS = ['observation', 'feedback', 'component_idea', 'hypothesis', 'pilot_result'];
const KNOWLEDGE_CANDIDATE_TARGETS = ['operational_manual', 'puieti_de_oameni', 'community_guide', 'strategic_plan'];
const KNOWLEDGE_CANDIDATE_STATUSES = ['proposed', 'approved', 'rejected'];
const EXPERIENCE_REPERTOIRE_STAGES = ['welcome', 'surprise_connect', 'next_visit_thread', 'memorable_close'];
const EXPERIENCE_REPERTOIRE_AGES = ['age_2', 'age_3', 'age_4_5', 'age_6_7', 'age_8_plus'];
const EXPERIENCE_REPERTOIRE_AGE_LABELS = [['age_2', '2 ani'], ['age_3', '3–4 ani'], ['age_4_5', '5–6 ani'], ['age_6_7', '7–8 ani'], ['age_8_plus', '9+ ani']];
const EXPERIENCE_REPERTOIRE_AGE_MAP = { age_2: ['1–2 ani'], age_3: ['3–4 ani'], age_4_5: ['5–6 ani'], age_6_7: ['7–8 ani'], age_8_plus: ['9+ ani'] };
const PEDAGOGIC_AGES = ['1–2 ani', '3–4 ani', '5–6 ani', '7–8 ani', '9+ ani'];
const PEDAGOGIC_PARTICIPANTS = ['Individual', '2–3 copii', '4–9 copii', '10+ copii'];
const PEDAGOGIC_CATEGORIES = ['Gândește', 'Simte', 'Colaborează', 'Devine independent', 'Creează', 'Se mișcă'];
const BECKY_THEMED_COLUMNS = ['id','title','subtitle','age_categories','participant_categories','duration_categories','category','skills','implementation','materials','steps','rules','facilitator','easier','harder','caution','reflection','status','created_at','updated_at'];

function defaultMonthlyReport() {
  const now = new Date().toISOString();
  return { month_key: '2026-08', due_date: '2026-09-02', entries: [], roles: MONTHLY_REPORT_ROLES.map(([id, label], sort_order) => ({ id, label, status: 'Fără suficiente date', sections: Object.fromEntries(MONTHLY_REPORT_SECTION_KEYS.map(key => [key, ''])), sort_order, created_at: now, updated_at: now })) };
}
function readMonthlyReport() {
  try {
    const raw = fs.existsSync(ADMIN_MONTHLY_REPORT_FILE) ? JSON.parse(fs.readFileSync(ADMIN_MONTHLY_REPORT_FILE, 'utf8')) : null;
    const base = defaultMonthlyReport();
    const roles = base.roles.map(item => ({ ...item, ...(raw?.roles || []).find(role => role.id === item.id), sections: { ...item.sections, ...((raw?.roles || []).find(role => role.id === item.id)?.sections || {}) } }));
  return { ...base, ...raw, entries: Array.isArray(raw?.entries) ? raw.entries : [], roles: roles.map(role => ({ ...role, notes: role.notes && typeof role.notes === 'object' ? role.notes : {} })) };
  } catch { throw new Error('Invalid monthly report store'); }
}
function writeMonthlyReport(report) { fs.mkdirSync(path.dirname(ADMIN_MONTHLY_REPORT_FILE), { recursive: true }); fs.writeFileSync(ADMIN_MONTHLY_REPORT_FILE, JSON.stringify(report, null, 2)); }
function readContentLabIdeas() { try { const value = fs.existsSync(ADMIN_CONTENT_LAB_IDEAS_FILE) ? JSON.parse(fs.readFileSync(ADMIN_CONTENT_LAB_IDEAS_FILE, 'utf8')) : []; return Array.isArray(value) ? value : []; } catch { throw new Error('Invalid Content Lab ideas store'); } }
function writeContentLabIdeas(items) { fs.mkdirSync(path.dirname(ADMIN_CONTENT_LAB_IDEAS_FILE), { recursive: true }); fs.writeFileSync(ADMIN_CONTENT_LAB_IDEAS_FILE, JSON.stringify(items, null, 2)); }
function readJsonStore(file, label) { try { const value = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; return Array.isArray(value) ? value : []; } catch { throw new Error(`Invalid ${label} store`); } }
function writeJsonStore(file, items) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(items, null, 2)); }
function readExperienceRepertoire() {
  if (!fs.existsSync(ADMIN_EXPERIENCE_REPERTOIRE_FILE) && fs.existsSync(EXPERIENCE_REPERTOIRE_SEED_FILE)) {
    try { const seed = JSON.parse(fs.readFileSync(EXPERIENCE_REPERTOIRE_SEED_FILE, 'utf8')); return Array.isArray(seed) ? seed : []; } catch { throw new Error('Invalid experience repertoire seed'); }
  }
  return readJsonStore(ADMIN_EXPERIENCE_REPERTOIRE_FILE, 'experience repertoire');
}
function normalizeExperienceRepertoireOverlay(input, existing = {}, itemId = null) {
  const age_group = String(input?.age_group ?? existing.age_group ?? '').trim();
  const validation_status = String(input?.validation_status ?? existing.validation_status ?? 'idea').trim();
  const nullable = key => input?.[key] === null ? null : String(input?.[key] ?? existing[key] ?? '').trim() || null;
  if (!EXPERIENCE_REPERTOIRE_AGES.includes(age_group) || !['idea', 'validated'].includes(validation_status)) throw new Error('Experience repertoire age overlay invalid');
  const now = new Date().toISOString();
  return { id: String(input?.id ?? existing.id ?? crypto.randomUUID()), item_id: itemId || input?.item_id || existing.item_id || null, age_group, validation_status, age_specific_note: nullable('age_specific_note'), restriction: nullable('restriction'), created_at: existing.created_at || input?.created_at || now, updated_at: now };
}
function normalizeExperienceRepertoire(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim(); const stage = String(input?.stage ?? existing.stage ?? '').trim(); const title = String(input?.title ?? existing.title ?? '').trim(); const description = String(input?.description ?? existing.description ?? '').trim(); const age_groups = Array.isArray(input?.age_groups ?? existing.age_groups) ? [...new Set((input?.age_groups ?? existing.age_groups).map(String).filter(value => EXPERIENCE_REPERTOIRE_AGES.includes(value)))] : []; const status = String(input?.status ?? existing.status ?? 'active').trim(); const nullable = key => input?.[key] === null ? null : String(input?.[key] ?? existing[key] ?? '').trim() || null; const source_type = nullable('source_type'); const source_id = nullable('source_id'); const family = nullable('family'); const fallback_item_id = nullable('fallback_item_id');
  if (!id || !EXPERIENCE_REPERTOIRE_STAGES.includes(stage) || !title || !age_groups.length || !['active', 'archived'].includes(status)) throw new Error('Experience repertoire invalid');
  if (title.length > 180 || description.length > 5000 || (source_type && source_type.length > 100) || (source_id && source_id.length > 200)) throw new Error('Experience repertoire too long');
  const overlaysInput = Array.isArray(input?.age_overlays) ? input.age_overlays : (Array.isArray(existing.age_overlays) ? existing.age_overlays : []);
  const age_overlays = age_groups.map(age => normalizeExperienceRepertoireOverlay(overlaysInput.find(item => item.age_group === age) || { age_group: age }, {}, id));
  const now = new Date().toISOString(); return { id, stage, title, description, age_groups, status, family, fallback_item_id, age_overlays, source_type, source_id, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}
function experienceRepertoireView(items) {
  const workspaces = readWorkspaces(); const childrenWorkspace = (workspaces.workspaces || []).find(item => item.id === 'children'); const activities = (childrenWorkspace?.activities || []).filter(item => item?.title && item.title !== 'Activitate nouă');
  const activityMatches = activity => { const source = Array.isArray(activity.ageCategories) && activity.ageCategories.length ? activity.ageCategories : [activity.age]; const ranges = value => { const nums = String(value || '').match(/\d+/g)?.map(Number) || []; return nums.length > 1 ? [nums[0], nums[1]] : nums.length ? [nums[0], /\+/.test(value) ? 99 : nums[0]] : [0, 99]; }; return EXPERIENCE_REPERTOIRE_AGE_LABELS.reduce((acc, [id]) => { const matches = EXPERIENCE_REPERTOIRE_AGE_MAP[id]; acc[id] = source.some(value => { const [a,b] = ranges(value); return matches.some(filter => { const [c,d] = ranges(filter); return a <= d && b >= c; }); }); return acc; }, {}); };
  const activity_counts = Object.fromEntries(EXPERIENCE_REPERTOIRE_AGES.map(age => [age, activities.filter(activity => activityMatches(activity)[age]).length]));
  const activity_coverage = Object.fromEntries(EXPERIENCE_REPERTOIRE_AGES.map(age => [age, { idea: activity_counts[age], validated: 0 }]));
  const active = items.filter(item => item.status === 'active');
  const coverage = Object.fromEntries(EXPERIENCE_REPERTOIRE_AGES.map(age => [age, Object.fromEntries(EXPERIENCE_REPERTOIRE_STAGES.map(stage => { const relevant = active.filter(item => item.stage === stage && item.age_groups?.includes(age)); return [stage, { idea: relevant.filter(item => (item.age_overlays || []).find(overlay => overlay.age_group === age)?.validation_status !== 'validated').length, validated: relevant.filter(item => (item.age_overlays || []).find(overlay => overlay.age_group === age)?.validation_status === 'validated').length }]; }))]));
  return { items: active, activity_counts, activity_coverage, activity_previews: Object.fromEntries(EXPERIENCE_REPERTOIRE_AGES.map(age => [age, activities.filter(activity => activityMatches(activity)[age]).slice(0, 3).map(item => ({ id: item.id, title: item.title }))])), coverage };
}
function defaultBeckyThemedActivities() {
  const now = new Date().toISOString(); const age_categories = ['5–6 ani', '7–8 ani']; const participant_categories = [...PEDAGOGIC_PARTICIPANTS];
  return [{ id: '14141414-1414-4141-8141-141414141414', title: 'Becky spune', subtitle: 'Un joc de mișcare și atenție în care copiii urmează doar comenzile care încep cu „Becky spune”.', age_categories, participant_categories, duration_categories: [], category: 'Se mișcă', skills: '', implementation: 'Fără echipament', materials: '', steps: '', rules: '', facilitator: '', easier: '', harder: '', caution: '', reflection: '', status: 'active', validations: age_categories.flatMap(age => participant_categories.map(participant => ({ age_category: age, participant_category: participant, validation_status: age === '5–6 ani' && ['Individual', '2–3 copii'].includes(participant) ? 'validated' : 'idea' }))), created_at: now, updated_at: now }];
}
function readBeckyThemedActivities() { if (!fs.existsSync(ADMIN_BECKY_THEMED_ACTIVITIES_FILE)) return defaultBeckyThemedActivities(); return readJsonStore(ADMIN_BECKY_THEMED_ACTIVITIES_FILE, 'Becky themed activities'); }
function normalizeBeckyThemedActivity(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim(); const text = key => String(input?.[key] ?? existing[key] ?? '').trim(); const list = key => [...new Set((Array.isArray(input?.[key] ?? existing[key]) ? (input?.[key] ?? existing[key]) : []).map(String).map(value => value.trim()).filter(Boolean))];
  const age_categories = list('age_categories').filter(value => PEDAGOGIC_AGES.includes(value)); const participant_categories = list('participant_categories').filter(value => PEDAGOGIC_PARTICIPANTS.includes(value));
  const item = { id, title: text('title'), subtitle: text('subtitle'), age_categories, participant_categories, duration_categories: list('duration_categories'), category: text('category'), skills: text('skills'), implementation: text('implementation'), materials: text('materials'), steps: text('steps'), rules: text('rules'), facilitator: text('facilitator'), easier: text('easier'), harder: text('harder'), caution: text('caution'), reflection: text('reflection'), status: text('status') || 'active', validations: Array.isArray(input?.validations ?? existing.validations) ? (input?.validations ?? existing.validations).map(value => ({ age_category: String(value?.age_category || '').trim(), participant_category: String(value?.participant_category || '').trim(), validation_status: ['idea', 'validated'].includes(value?.validation_status) ? value.validation_status : 'idea' })).filter(value => age_categories.includes(value.age_category) && participant_categories.includes(value.participant_category)) : [], created_at: existing.created_at || input?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!id || !item.title || !item.age_categories.length || !item.participant_categories.length || !PEDAGOGIC_CATEGORIES.includes(item.category) || !item.implementation || !['active', 'archived'].includes(item.status)) throw new Error('Becky themed activity invalid');
  if ([item.title, item.subtitle, item.skills, item.materials, item.steps, item.rules, item.facilitator, item.easier, item.harder, item.caution, item.reflection].some(value => value.length > 10000)) throw new Error('Becky themed activity too long');
  return item;
}
function itemAgeValid(age, participants) { return PEDAGOGIC_AGES.includes(age) && PEDAGOGIC_PARTICIPANTS.some(value => participants.includes(value)); }
function pedagogicActivityParticipants(activity) { const explicit = Array.isArray(activity.participantCategories) ? activity.participantCategories : []; if (explicit.length) return PEDAGOGIC_PARTICIPANTS.filter(value => explicit.includes(value)); const text = String(activity.participants || activity.group || '').toLowerCase(); if (/individual|1\s*copil/.test(text)) return ['Individual']; if (/grup\s*mare|10\+|7\+/.test(text)) return ['10+ copii']; if (/grup\s*mediu|4\s*[-–]\s*6/.test(text)) return ['4–9 copii']; if (/grup\s*mic|2\s*[-–]\s*3/.test(text)) return ['2–3 copii']; return []; }
function pedagogicActivityAges(activity) { const source = Array.isArray(activity.ageCategories) && activity.ageCategories.length ? activity.ageCategories : [activity.age]; const range = value => { const nums = String(value || '').match(/\d+/g)?.map(Number) || []; return nums.length > 1 ? [nums[0], nums[1]] : nums.length ? [nums[0], /\+/.test(String(value)) ? 99 : nums[0]] : [0, 99]; }; return PEDAGOGIC_AGES.filter(filter => source.some(value => { const [a,b] = range(value); const [c,d] = range(filter); return a <= d && b >= c; })); }
function pedagogicCoverage() {
  const workspaces = readWorkspaces(); const children = (workspaces.workspaces || []).find(item => item.id === 'children'); const library = (children?.activities || []).filter(item => item?.title && item.title !== 'Activitate nouă'); const themed = readBeckyThemedActivities().filter(item => item.status === 'active'); const validations = readJsonStore(ADMIN_CHILDREN_ACTIVITY_VALIDATIONS_FILE, 'children activity validations'); const withValidations = library.map(item => ({ ...item, validations: validations.filter(value => value.activity_id === item.id) }));
  const build = (activities, source) => PEDAGOGIC_AGES.map(age => ({ age, cells: PEDAGOGIC_PARTICIPANTS.map(participant => ({ participant, domains: PEDAGOGIC_CATEGORIES.map(category => { const relevant = activities.filter(activity => (source === 'library' ? pedagogicActivityAges(activity).includes(age) && (pedagogicActivityParticipants(activity).includes(participant)) && (activity.category || 'Gândește') === category : activity.age_categories.includes(age) && activity.participant_categories.includes(participant) && activity.category === category)); const validated = relevant.filter(activity => (activity.validations || []).some(value => value.age_category === age && value.participant_category === participant && value.validation_status === 'validated')).length; return { category, ideas: relevant.length, validated }; }) })) }));
  return { library: build(withValidations, 'library'), themed: build(themed, 'themed'), themed_activities: themed, library_activities: withValidations.map(item => ({ id: item.id, title: item.title, category: item.category || 'Gândește', age_categories: pedagogicActivityAges(item), participant_categories: pedagogicActivityParticipants(item), implementation: item.difficulty || '', validations: item.validations || [] })) };
}
function readBeckyInbox() { return readJsonStore(ADMIN_BECKY_INBOX_FILE, 'Becky Inbox'); }
function writeBeckyInbox(items) { writeJsonStore(ADMIN_BECKY_INBOX_FILE, items); }
function readBeckyBrief() { return readJsonStore(ADMIN_BECKY_BRIEF_FILE, 'Becky Brief'); }
function writeBeckyBrief(items) { writeJsonStore(ADMIN_BECKY_BRIEF_FILE, items); }
function readBeckyMemory() { return readJsonStore(ADMIN_BECKY_MEMORY_FILE, 'Becky Memory'); }
function writeBeckyMemory(items) { writeJsonStore(ADMIN_BECKY_MEMORY_FILE, items); }
function readBeckyAttention() { return readJsonStore(ADMIN_BECKY_ATTENTION_FILE, 'Becky Attention'); }
function writeBeckyAttention(items) { writeJsonStore(ADMIN_BECKY_ATTENTION_FILE, items); }
function localBeckyContext() {
  const crm = readCrmStore(); const workspaces = readWorkspaces(); const childrenWorkspace = (workspaces.workspaces || []).find(item => item.id === 'children');
  const activities = (childrenWorkspace?.activities || []).filter(item => item?.id && item?.title && item.title !== 'Activitate nouă').map(item => ({ id:item.id, title:item.title, age_categories:Array.isArray(item.ageCategories) ? item.ageCategories : item.age ? [item.age] : [] }));
  return { children:crm.children.map(item => ({ id:item.id, first_name:item.first_name, age:item.age })), activities, roles:MONTHLY_REPORT_ROLES.map(([id,label]) => ({ id,label })) };
}
async function activeLocalMemorySignals() {
  const inboxCore=await beckyInboxCorePromise;const memoryCore=await beckyMemoryCorePromise;const report=readMonthlyReport();const hashes=new Map();const signals=readBeckyMemory();
  for(const signal of signals){if(!hashes.has(signal.source_note_id))hashes.set(signal.source_note_id,await inboxCore.sha256(String(report.notes?.[signal.source_note_id]||'')));}
  const active=signals.filter(signal=>hashes.get(signal.source_note_id)===signal.source_hash&&!memoryCore.isSpeculativeMemorySignal(signal.exact_source_excerpt)&&!memoryCore.isSpeculativeMemorySignal(signal.normalized_observation));
  const unique=[];for(const signal of active){const duplicate=unique.find(item=>memoryCore.memorySignalContentMatches(item,signal));if(!duplicate)unique.push(signal);}
  return unique.map(signal=>({...signal,task_candidate:memoryCore.isTaskCandidateMemorySignal(signal.normalized_observation)}));
}
async function localMemoryContext() {
  const memoryCore=await beckyMemoryCorePromise;const crm=readCrmStore();const report=readMonthlyReport();
  return memoryCore.historicEvidenceContext({signals:await activeLocalMemorySignals(),crmObservations:crm.observations||[],activityObservations:readActivityObservations(),knowledgeCandidates:readJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE,'knowledge candidates'),monthlyEntries:report.entries||[]});
}
function autoStoreLocalMemorySignal(signal) {
  const target=(signal.possible_canonical_context||[]).find(item=>item.destination==='crm_child_observation'&&item.eligibility==='auto_store');
  if(!target)return signal;
  const store=readCrmStore();if(!store.children.some(child=>child.id===target.child_id))return signal;
  const id=`memory-signal-${signal.id}`;const existing=store.observations.find(item=>item.id===id);const payload={id,child_id:target.child_id,visit_id:null,observed_at:`${signal.source_date}T12:00:00.000Z`,observation:signal.normalized_observation};
  let entity;if(!existing){entity=normalizeCrmObservation(payload,{},new Set(store.children.map(child=>child.id)),new Map(store.visits.map(visit=>[visit.id,visit])));store.observations.push(entity);writeCrmStore(store);}else if(existing.child_id!==target.child_id&&(signal.canonical_context||[]).some(item=>item.destination_entity_id===id&&item.destination_updated_at===(existing.updated_at||existing.created_at))){entity=normalizeCrmObservation({...existing,...payload},existing,new Set(store.children.map(child=>child.id)),new Map(store.visits.map(visit=>[visit.id,visit])));store.observations[store.observations.indexOf(existing)]=entity;writeCrmStore(store);}else entity=existing;
  signal.canonical_context=[{destination:'crm_child_observation',destination_entity_id:entity.id,child_id:entity.child_id,auto_stored_at:new Date().toISOString(),destination_updated_at:entity.updated_at||entity.created_at}];return signal;
}
async function buildLocalMemory(date,noteText,rawSignals,rawCandidates) {
  const memoryCore=await beckyMemoryCorePromise;const inboxCore=await beckyInboxCorePromise;const sourceHash=await inboxCore.sha256(noteText);const context=localBeckyContext();const existing=readBeckyMemory();const created=[];
  for(const raw of Array.isArray(rawSignals)?rawSignals:[]){const resolved=memoryCore.resolveMemorySignal(raw,{...context,note_text:noteText});if(!resolved)continue;const now=new Date().toISOString();const draft={id:crypto.randomUUID(),source_type:'daily_note',source_note_id:date,source_version:sourceHash,source_hash:sourceHash,source_date:date,...resolved,created_at:now,updated_at:now};draft.dedupe_key=await memoryCore.memorySignalDedupeKey(draft);const duplicate=existing.find(item=>memoryCore.memorySignalContentMatches(item,draft));if(duplicate){Object.assign(duplicate,{source_version:sourceHash,source_hash:sourceHash,updated_at:now});created.push(duplicate);continue;}autoStoreLocalMemorySignal(draft);existing.push(draft);created.push(draft);}
  writeBeckyMemory(existing);const active=await activeLocalMemorySignals();const selected=memoryCore.selectAttentionCandidates(rawCandidates,{signals:active,noteDate:date});const attention=readBeckyAttention();const candidates=[];
  for(const candidate of selected){const previous=attention.find(item=>item.fingerprint===candidate.fingerprint&&JSON.stringify([...(item.evidence_signal_ids||[])].sort())===JSON.stringify([...candidate.evidence_signal_ids].sort()));const now=new Date().toISOString();const item={id:previous?.id||crypto.randomUUID(),status:previous?.status||'active',...candidate,created_at:previous?.created_at||now,updated_at:now};if(previous)attention[attention.indexOf(previous)]=item;else attention.push(item);candidates.push(item);}
  writeBeckyAttention(attention);return {signals:created,attention_candidates:candidates,source_hash:sourceHash};
}
function normalizeEventFinding(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim(); const kind = String(input?.kind ?? existing.kind ?? '').trim(); const text = String(input?.text ?? existing.text ?? '').trim();
  const nullable = key => input?.[key] === null ? null : String(input?.[key] ?? existing[key] ?? '').trim() || null;
  const event_ref = nullable('event_ref'); const concept_ref = nullable('concept_ref'); const source_type = nullable('source_type'); const source_id = nullable('source_id');
  if (!id || !EVENT_FINDING_KINDS.includes(kind) || !text) throw new Error('Event finding invalid');
  if (text.length > 10000 || [event_ref, concept_ref, source_type, source_id].some((value, index) => value && value.length > (index < 2 ? 300 : index === 2 ? 100 : 200))) throw new Error('Event finding too long');
  const now = new Date().toISOString(); return { id, kind, text, event_ref, concept_ref, source_type, source_id, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}
function normalizeKnowledgeCandidate(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim(); const target = String(input?.target ?? existing.target ?? '').trim(); const text = String(input?.text ?? existing.text ?? '').trim(); const status = String(input?.status ?? existing.status ?? 'proposed').trim();
  const source_type = input?.source_type === null ? null : String(input?.source_type ?? existing.source_type ?? '').trim() || null; const source_id = input?.source_id === null ? null : String(input?.source_id ?? existing.source_id ?? '').trim() || null;
  if (!id || !KNOWLEDGE_CANDIDATE_TARGETS.includes(target) || !KNOWLEDGE_CANDIDATE_STATUSES.includes(status) || !text) throw new Error('Knowledge candidate invalid');
  if (text.length > 10000 || (source_type && source_type.length > 100) || (source_id && source_id.length > 200)) throw new Error('Knowledge candidate too long');
  const now = new Date().toISOString(); return { id, target, text, status, source_type, source_id, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}
function normalizeContentLabIdea(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim(); const idea_type = String(input?.idea_type ?? existing.idea_type ?? '').trim(); const title = String(input?.title ?? existing.title ?? '').trim(); const core_thought = String(input?.core_thought ?? existing.core_thought ?? input?.text ?? existing.text ?? '').trim(); const status = String(input?.status ?? existing.status ?? 'active').trim(); const source_type = input?.source_type === null ? null : String(input?.source_type ?? existing.source_type ?? '').trim() || null; const source_id = input?.source_id === null ? null : String(input?.source_id ?? existing.source_id ?? '').trim() || null;
  if (!id || !CONTENT_LAB_IDEA_TYPES.includes(idea_type) || !core_thought || !CONTENT_LAB_IDEA_STATUSES.includes(status)) throw new Error('Content Lab idea invalid');
  if (title.length > 500 || core_thought.length > 10000 || (source_type && source_type.length > 100) || (source_id && source_id.length > 200)) throw new Error('Content Lab idea too long');
  const now = new Date().toISOString(); return { id, idea_type, title, core_thought, status, source_type, source_id, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}
function normalizeMonthlyReportEntry(input, existing = {}, monthKey = '2026-08') {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim();
  const month_key = String(input?.month_key ?? existing.month_key ?? monthKey).trim();
  const entry_date = String(input?.entry_date ?? existing.entry_date ?? '').trim();
  const type = String(input?.type ?? existing.type ?? '').trim();
  const text = String(input?.text ?? existing.text ?? '').trim();
  const role_ids = Array.isArray(input?.role_ids ?? existing.role_ids) ? [...new Set((input?.role_ids ?? existing.role_ids).map(value => String(value).trim()).filter(Boolean))] : [];
  const source_type = input?.source_type === null ? null : String(input?.source_type ?? existing.source_type ?? '').trim() || null;
  const source_id = input?.source_id === null ? null : String(input?.source_id ?? existing.source_id ?? '').trim() || null;
  const validRoles = new Set(MONTHLY_REPORT_ROLES.map(([roleId]) => roleId));
  if (!id || !/^\d{4}-\d{2}$/.test(month_key) || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date) || !MONTHLY_REPORT_ENTRY_TYPES.includes(type) || !text || !role_ids.length || role_ids.some(roleId => !validRoles.has(roleId))) throw new Error('Monthly report entry invalid');
  if (text.length > 5000 || (source_type && source_type.length > 100) || (source_id && source_id.length > 200)) throw new Error('Monthly report entry too long');
  const now = new Date().toISOString();
  return { id, month_key, entry_date, type, text, role_ids, source_type, source_id, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}
function readActivityObservations() { try { const value = fs.existsSync(ADMIN_ACTIVITY_OBSERVATIONS_FILE) ? JSON.parse(fs.readFileSync(ADMIN_ACTIVITY_OBSERVATIONS_FILE, 'utf8')) : []; return Array.isArray(value) ? value : []; } catch { throw new Error('Invalid activity observations store'); } }
function writeActivityObservations(items) { fs.mkdirSync(path.dirname(ADMIN_ACTIVITY_OBSERVATIONS_FILE), { recursive: true }); fs.writeFileSync(ADMIN_ACTIVITY_OBSERVATIONS_FILE, JSON.stringify(items, null, 2)); }
function normalizeActivityObservation(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim(); const activityId = String(input?.activity_id ?? existing.activity_id ?? '').trim(); const testedAt = String(input?.tested_at ?? existing.tested_at ?? '').trim();
  const ages = Array.isArray(input?.age_categories ?? existing.age_categories) ? (input?.age_categories ?? existing.age_categories).map(String).filter(Boolean) : []; const participants = String(input?.participants ?? existing.participants ?? '').trim(); const result = String(input?.result ?? existing.result ?? '').trim();
  const observed = String(input?.observed ?? existing.observed ?? '').trim(); const interpreted = String(input?.interpreted ?? existing.interpreted ?? '').trim(); const hypothesized = String(input?.hypothesized ?? existing.hypothesized ?? '').trim(); const action = String(input?.action ?? existing.action ?? '').trim(); const capacity = String(input?.capacity ?? existing.capacity ?? '').trim(); const behaviorObserved = input?.behavior_observed === null || input?.behavior_observed === undefined ? (existing.behavior_observed ?? null) : Boolean(input.behavior_observed); const behaviors = Array.isArray(input?.behaviors ?? existing.behaviors) ? (input?.behaviors ?? existing.behaviors).map(item => ({ label: String(item?.label || '').trim(), status: ['Da','Parțial','Nu'].includes(item?.status) ? item.status : '' })).filter(item => item.label) : [];
  if (!id || !activityId || !/^\d{4}-\d{2}-\d{2}$/.test(testedAt) || !['Individual','2–3 copii','4–9 copii','10+ copii'].includes(participants) || !['A mers bine','Mixt','Nu a mers'].includes(result) || !observed) throw new Error('Activity observation invalid');
  if ([...arguments].length && [observed, interpreted, hypothesized, action, capacity].some(value => value.length > 10000)) throw new Error('Activity observation too long');
  const now = new Date().toISOString(); return { id, activity_id: activityId, tested_at: testedAt, age_categories: ages, participants, result, observed, interpreted, hypothesized, action, capacity, behavior_observed: behaviorObserved, behaviors, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}

function importManualFromDocx() {
  const source = '/Users/radu/Desktop/Proiecte/Becky/MANUAL.docx';
  if (!fs.existsSync(source)) return { title: 'Becky Friends — Community Playbook', blocks: [] };
  try {
    const { execFileSync } = require('child_process');
    const xml = execFileSync('unzip', ['-p', source, 'word/document.xml'], { encoding: 'utf8' });
    const paragraphs = [];
    for (const paragraph of xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || []) {
      const text = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (!text) continue;
      paragraphs.push({ text, heading: /^(Introducere|Capitolul \d+|Anexă)/i.test(text) });
    }
    const actualStart = paragraphs.findIndex(item => /^Capitolul 1\s*[–-]\s*De ce există Becky\?/i.test(item.text));
    const blocks = [];
    const addBlock = (items, type = 'chapter') => {
      if (!items.length) return;
      const first = items[0];
      const html = items.map(item => item.heading ? `<h2>${escapeHtml(item.text)}</h2>` : `<p>${escapeHtml(item.text)}</p>`).join('\n');
      blocks.push({ id: `block-${String(blocks.length + 1).padStart(3, '0')}`, type, html });
    };
    if (actualStart > 0) addBlock(paragraphs.slice(0, actualStart), 'overview');
    const content = actualStart > 0 ? paragraphs.slice(actualStart) : paragraphs;
    let current = [];
    for (const item of content) {
      if (item.heading && current.length) { addBlock(current); current = []; }
      current.push(item);
    }
    addBlock(current);
    const document = { title: 'Becky Friends — Community Playbook', source: 'MANUAL.docx', importedAt: new Date().toISOString(), blocks };
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(document, null, 2));
    return document;
  } catch (error) {
    console.error('Manual import failed:', error.message);
    return { title: 'Becky Friends — Community Playbook', blocks: [] };
  }
}

function normalizeDocument(document) {
  if (!document || !Array.isArray(document.blocks)) return document;
  return {
    ...document,
    blocks: document.blocks.map(block => {
      if (block.id !== 'block-011' || typeof block.html !== 'string') return block;
      const html = block.html.replace(/<div class="cta">[\s\S]*?(?=<div class="section">\s*<h2>Cum măsurăm succesul<\/h2>)/i, '').replace('<section class="chapter">', '<section class="chapter chapter-website">');
      return html === block.html ? block : { ...block, html };
    })
  };
}

function readDocument() {
  try { if (!fs.existsSync(DATA_FILE)) return importManualFromDocx(); return normalizeDocument(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); }
  catch { return { title: 'Becky Friends — Community Playbook', blocks: [] }; }
}

function readWorkspaces() {
  try { return JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf8')); }
  catch { return { updatedAt: null, workspaces: [] }; }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.includes('json') ? JSON.stringify(body) : body);
}

function readArrayFile(file) {
  if (!fs.existsSync(file)) return [];
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(value)) throw new Error('Invalid local data store');
  return value;
}

function appendArrayFile(file, entry) {
  const values = readArrayFile(file);
  values.push(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(values, null, 2));
}

function readAdminTasks() {
  try {
    const tasks = fs.existsSync(ADMIN_TASKS_FILE) ? JSON.parse(fs.readFileSync(ADMIN_TASKS_FILE, 'utf8')) : [];
    return Array.isArray(tasks) ? tasks : [];
  } catch { throw new Error('Invalid admin task store'); }
}

function writeAdminTasks(tasks) {
  fs.mkdirSync(path.dirname(ADMIN_TASKS_FILE), { recursive: true });
  fs.writeFileSync(ADMIN_TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function normalizeAdminTask(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim();
  const area = String(input?.area ?? existing.area ?? '').trim();
  const title = String(input?.title ?? existing.title ?? '').trim();
  const detail = String(input?.detail ?? existing.detail ?? '').trim();
  const owner = String(input?.owner ?? existing.owner ?? '').trim();
  const priority = String(input?.priority ?? existing.priority ?? '').trim();
  const sortOrder = Number(input?.sort_order ?? existing.sort_order ?? 0);
  if (!id || !area || !title || !owner || !priority || !Number.isInteger(sortOrder)) throw new Error('Admin task invalid');
  const now = new Date().toISOString();
  return {
    id, area, title, detail, owner, priority, sort_order: sortOrder,
    created_at: existing.created_at || input?.created_at || now,
    updated_at: now
  };
}

function readCalendarEntries() {
  try {
    const entries = fs.existsSync(ADMIN_CALENDAR_FILE) ? JSON.parse(fs.readFileSync(ADMIN_CALENDAR_FILE, 'utf8')) : [];
    return Array.isArray(entries) ? entries : [];
  } catch { throw new Error('Invalid calendar store'); }
}

function writeCalendarEntries(entries) {
  fs.mkdirSync(path.dirname(ADMIN_CALENDAR_FILE), { recursive: true });
  fs.writeFileSync(ADMIN_CALENDAR_FILE, JSON.stringify(entries, null, 2));
}

function normalizeCalendarEntry(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim();
  const title = String(input?.title ?? existing.title ?? '').trim();
  const type = String(input?.type ?? existing.type ?? '').trim();
  const date = String(input?.date ?? existing.date ?? '').trim();
  const startTime = String(input?.start_time ?? existing.start_time ?? '').trim();
  const endTime = String(input?.end_time ?? existing.end_time ?? '').trim();
  const note = String(input?.note ?? existing.note ?? '').trim();
  if (!id || !title || !['open', 'event', 'private', 'closed'].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) throw new Error('Calendar entry invalid');
  if (startTime >= endTime) throw new Error('Calendar entry time invalid');
  const now = new Date().toISOString();
  return { id, title, type, date, start_time: startTime, end_time: endTime, note, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}

function calendarWeekDates(weekStart) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new Error('Calendar week invalid');
  const start = new Date(`${weekStart}T12:00:00`);
  if (start.getDay() !== 1) throw new Error('Calendar week must start on Monday');
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date.toISOString().slice(0, 10); });
}

function readCrmStore() {
  try {
    const store = fs.existsSync(ADMIN_CRM_FILE) ? JSON.parse(fs.readFileSync(ADMIN_CRM_FILE, 'utf8')) : {};
    return { children: Array.isArray(store.children) ? store.children : [], visits: Array.isArray(store.visits) ? store.visits : [], observations: Array.isArray(store.observations) ? store.observations : [], companions: Array.isArray(store.companions) ? store.companions : [], child_companions: Array.isArray(store.child_companions) ? store.child_companions : [], companion_observations: Array.isArray(store.companion_observations) ? store.companion_observations : [] };
  } catch { throw new Error('Invalid CRM store'); }
}

function writeCrmStore(store) {
  fs.mkdirSync(path.dirname(ADMIN_CRM_FILE), { recursive: true });
  fs.writeFileSync(ADMIN_CRM_FILE, JSON.stringify(store, null, 2));
}

function normalizeCrmChild(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim();
  const firstName = String(input?.first_name ?? existing.first_name ?? '').trim();
  const age = Number(input?.age ?? existing.age);
  const interests = String(input?.interests ?? existing.interests ?? '').trim();
  const continuity = String(input?.continuity ?? existing.continuity ?? '').trim();
  if (!id || !firstName || !Number.isInteger(age) || age < 0 || age > 18 || interests.length > 240 || continuity.length > 500) throw new Error('CRM child invalid');
  const now = new Date().toISOString();
  return { id, first_name: firstName, age, interests, continuity, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}

function normalizeCrmCompanion(input, existing = {}) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim();
  const firstName = String(input?.first_name ?? existing.first_name ?? '').trim();
  const relationshipLabel = String(input?.relationship_label ?? existing.relationship_label ?? '').trim();
  if (!id || !firstName || firstName.length > 100 || relationshipLabel.length > 80) throw new Error('CRM companion invalid');
  const now = new Date().toISOString();
  return { id, first_name:firstName, relationship_label:relationshipLabel || null, created_at:existing.created_at || input?.created_at || now, updated_at:now };
}

function normalizeCrmVisit(input, existing = {}, childIds = new Set(), companionIds = new Set()) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim();
  const childId = String(input?.child_id ?? existing.child_id ?? '').trim();
  const visitDate = String(input?.visit_date ?? existing.visit_date ?? '').trim();
  const note = String(input?.note ?? existing.note ?? '').trim();
  const companionId = input?.companion_id === null || input?.companion_id === undefined || input?.companion_id === '' ? (existing.companion_id || null) : String(input.companion_id).trim();
  if (!id || !childIds.has(childId) || (companionId && !companionIds.has(companionId)) || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || note.length > 500) throw new Error('CRM visit invalid');
  return { id, child_id: childId, companion_id:companionId, visit_date: visitDate, note, created_at: existing.created_at || input?.created_at || new Date().toISOString() };
}

function normalizeCrmCompanionObservation(input, existing = {}, companionIds = new Set(), visitMap = new Map()) {
  const id=String(input?.id ?? existing.id ?? crypto.randomUUID()).trim();const companionId=String(input?.companion_id ?? existing.companion_id ?? '').trim();const visitId=input?.visit_id === null || input?.visit_id === undefined || input?.visit_id === '' ? (existing.visit_id || null) : String(input.visit_id).trim();const observedAt=new Date(String(input?.observed_at ?? existing.observed_at ?? '').trim());const observation=String(input?.observation ?? existing.observation ?? '').trim();
  if(!id||!companionIds.has(companionId)||(visitId&&!visitMap.has(visitId))||Number.isNaN(observedAt.getTime())||!observation||observation.length>5000)throw new Error('CRM companion observation invalid');
  const now=new Date().toISOString();return {id,companion_id:companionId,visit_id:visitId,observed_at:observedAt.toISOString(),observation,created_at:existing.created_at||input?.created_at||now,updated_at:now};
}

function normalizeCrmObservation(input, existing = {}, childIds = new Set(), visitMap = new Map()) {
  const id = String(input?.id ?? existing.id ?? crypto.randomUUID()).trim();
  const childId = String(input?.child_id ?? existing.child_id ?? '').trim();
  const visitId = input?.visit_id === null || input?.visit_id === undefined || input?.visit_id === '' ? (existing.visit_id || null) : String(input.visit_id).trim();
  const rawObservedAt = String(input?.observed_at ?? existing.observed_at ?? '').trim();
  const observation = String(input?.observation ?? existing.observation ?? '').trim();
  const observedDate = new Date(rawObservedAt);
  if (!id || !childIds.has(childId) || (visitId && (!visitMap.has(visitId) || visitMap.get(visitId).child_id !== childId)) || Number.isNaN(observedDate.getTime()) || !observation || observation.length > 5000) throw new Error('CRM observation invalid');
  const now = new Date().toISOString();
  return { id, child_id: childId, visit_id: visitId, observed_at: observedDate.toISOString(), observation, created_at: existing.created_at || input?.created_at || now, updated_at: now };
}

function crmChildSummary(child, visits) {
  const childVisits = visits.filter(visit => visit.child_id === child.id).sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.created_at.localeCompare(a.created_at));
  return { ...child, visit_count: childVisits.length, last_visit: childVisits[0]?.visit_date || null };
}

function crmCompanionSummary(companion, store) {
  const children=(store.child_companions||[]).filter(link=>link.companion_id===companion.id).map(link=>store.children.find(child=>child.id===link.child_id)).filter(Boolean).map(child=>crmChildSummary(child,store.visits));
  const visits=store.visits.filter(visit=>visit.companion_id===companion.id).sort((a,b)=>`${b.visit_date}${b.created_at}`.localeCompare(`${a.visit_date}${a.created_at}`));
  return {...companion,children,visit_count:visits.length,last_visit:visits[0]?.visit_date||null};
}

function readRequestJson(req, res, maxBytes, callback) {
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > maxBytes) req.destroy(); });
  req.on('end', () => {
    try { callback(JSON.parse(raw)); }
    catch { send(res, 400, { error: 'Invalid request' }); }
  });
}
function readRequestJsonAsync(req, maxBytes) { return new Promise((resolve, reject) => { let raw=''; req.on('data', chunk => { raw += chunk; if (Buffer.byteLength(raw) > maxBytes) reject(Object.assign(new Error('Request too large'), { status:413 })); }); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(Object.assign(new Error('Invalid request'), { status:400 })); } }); req.on('error', reject); }); }

async function generateCarouselArtwork(apiKey, prompt, quality = 'medium', transparent = false) {
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY lipsește din mediul local'), { status: 503 });
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      size: '1024x1024',
      quality,
      output_format: 'webp',
      output_compression: 82,
      ...(transparent ? { background: 'transparent' } : {})
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.data?.[0]?.b64_json) {
    console.error('OpenAI image generation failed', response.status, result.error?.code || result.error?.message || 'unknown');
    const message = response.status === 401 ? 'Cheia OpenAI nu este validă. Configurează OPENAI_API_KEY în .dev.vars.' : response.status === 429 ? 'Limita OpenAI a fost atinsă. Încearcă din nou în câteva momente.' : 'Generarea imaginii nu a reușit';
    throw Object.assign(new Error(message), { status: response.status === 401 ? 503 : response.status === 429 ? 429 : 502 });
  }
  return { image: result.data[0].b64_json, mimeType: 'image/webp', model: 'gpt-image-2' };
}

async function generateCarouselPlan(apiKey, context, brand, mode = 'standard') {
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY lipsește din mediul local'), { status: 503 });
  const headingPart = { type: 'object', additionalProperties: false, properties: { text: { type: 'string' }, color: { type: 'string', enum: ['teal', 'coral'] }, breakBefore: { type: 'boolean' } }, required: ['text', 'color', 'breakBefore'] };
  const slide = { type: 'object', additionalProperties: false, properties: { heading: { type: 'string' }, body: { type: 'string' }, headingParts: { type: 'array', minItems: 2, maxItems: 2, items: headingPart }, artworkInstruction: { type: 'string' } }, required: ['heading', 'body', 'headingParts', 'artworkInstruction'] };
  const storyMode = mode === 'story-of-day';
  const schema = { type: 'object', additionalProperties: false, properties: { slides: { type: 'array', minItems: storyMode ? 4 : 5, maxItems: storyMode ? 10 : 5, items: slide }, caption: { type: 'string', minLength: 40, maxLength: 500 } }, required: ['slides', 'caption'] };
  const storyInstructions = 'Creează draftul final al unui carousel narativ Becky’s Garden, în limba română, pornind strict din povestea selectată. Acesta este storytelling despre conexiune și despre un moment mic, adevărat și frumos care merită împărtășit. NU este un carousel pedagogic de tip problemă + sfaturi, nu oferă modalități sau pași pentru părinți și nu schimbă tema. Vocea este la persoana I a lui Radu, facilitatorul Becky care stă cu copiii. Alege flexibil între 4 și 10 slide-uri, strict cât are nevoie povestea. Fiecare slide conține o singură idee și mută povestea înainte. Arcul narativ este obligatoriu: începutul și relația dintre personaje → schimbarea sau tensiunea → punctul culminant/alegerea lui Radu → deznodământul observabil → concluzia sinceră cu care a rămas. Primul heading este hook-ul viu al scenei, de exemplu „Mara mă voia doar pentru ea.”; disclaimerul „Poveste reală · numele au fost schimbate pentru protejarea identității copiilor.” apare discret la începutul body-ului, niciodată ca heading. REGULĂ DE CONFIDENȚIALITATE: nu reproduce niciun nume de copil găsit în nota-sursă. Înlocuiește fiecare nume cu un pseudonim românesc natural și păstrează aceeași mapare pe toate slide-urile; de exemplu, Erdu poate deveni Mara. Nu inventa replici, reacții, rezultate, gânduri ale copiilor sau detalii care nu există în context. Poți formula doar reflecția lui Radu ca reflecție, nu ca adevăr despre copil. Ultimul slide nu este CTA comercial și nu cere comentarii; încheie cu ideea umană a poveștii. Nu folosi titluri generice, jargon pedagogic, liste, recomandări ori formule precum „3 moduri”. Headerele au 3–10 cuvinte, body-urile maximum 55 de cuvinte, cu paragrafe scurte și accent pe una-două propoziții importante. Pentru fiecare slide, headingParts conține exact două fragmente care recompun heading-ul: primul teal cu breakBefore true, al doilea coral cu breakBefore false. artworkInstruction descrie o singură scenă relevantă pentru acel moment; când apare adultul, este Radu, bazat pe ilustrația de profil RADU.png, cu aceeași identitate vizuală în toate slide-urile. Captionul este o introducere caldă și fidelă în poveste, nu un rezumat, nu o lecție și nu adaugă metafore sau fapte care nu există în sursă.';
  const standardInstructions = 'Creează direct draftul final de text pentru un carousel social media Becky’s Garden în limba română. Obiectiv unic: awareness prin informație de calitate, prezentată matur, profesionist și atractiv. Firul argumentului este obligatoriu: slide 1 identifică problema părintelui și promite concret 3 modalități de ajutor; slide-urile 2–4 sunt trei soluții practice, distincte și aplicabile; slide 5 arată firesc, fără reclamă forțată, cum spațiul Becky aplică exact principiile prezentate. Hook-ul și conținutul trebuie să livreze aceeași promisiune. Dacă slide-urile oferă strategii pentru schimbarea unui comportament, hook-ul formulează scurt comportamentul recognoscibil și nu întreabă „De ce?” decât dacă explică motive. Nu inventa studii, cifre sau concluzii. Headerele au 4–10 cuvinte, descrierile maximum 24 de cuvinte. Pentru orice slide, headingParts conține exact două fragmente care recompun heading-ul: primul teal cu breakBefore true, al doilea coral cu breakBefore false. artworkInstruction descrie o singură ilustrație simplă, fără text.';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: localSecret('OPENAI_TEXT_MODEL') || 'gpt-4.1-mini',
      instructions: mode === 'story-of-day' ? storyInstructions : standardInstructions,
      input: JSON.stringify({ context, brand }),
      text: { format: { type: 'json_schema', name: 'becky_carousel_plan', strict: true, schema } }
    })
  });
  const result = await response.json().catch(() => ({}));
  const outputText = result.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!response.ok || !outputText) {
    console.error('OpenAI carousel plan failed', response.status, result.error?.code || result.error?.message || 'unknown');
    throw Object.assign(new Error(response.status === 429 ? 'Limita OpenAI a fost atinsă.' : 'Draftul carouselului nu a putut fi construit.'), { status: response.status === 429 ? 429 : 502 });
  }
  const parsedPlan = JSON.parse(outputText);
  const safePlan = storyMode
    ? JSON.parse(JSON.stringify(parsedPlan).replace(/\bErdu\b/gi, 'Mara'))
    : parsedPlan;
  return { plan: safePlan, model: result.model };
}

async function generateStoryCandidates(apiKey, noteText) {
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY lipsește din mediul local'), { status: 503 });
  const story = { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, summary: { type: 'string' }, emotional_core: { type: 'string' }, why_it_matters: { type: 'string' }, context: { type: 'string' } }, required: ['title', 'summary', 'emotional_core', 'why_it_matters', 'context'] };
  const schema = { type: 'object', additionalProperties: false, properties: { stories: { type: 'array', minItems: 0, maxItems: 3, items: story } }, required: ['stories'] };
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: localSecret('OPENAI_TEXT_MODEL') || 'gpt-4.1-mini', instructions: 'Din nota de zi extrage între 0 și 3 povești editoriale care ar putea deveni un carousel Becky pe Facebook. Alege un singur moment cu inimă, nu o listă de probleme și nu o lecție tehnică: o scenă concretă, o realizare sinceră, o emoție, o promisiune sau ceva cu care adultul a rămas. Persoana I din notă este Radu, facilitatorul Becky care stă cu copiii; păstrează vocea lui când contextul o cere. Povestea trebuie să sune ca o mărturisire caldă și recognoscibilă pentru un părinte: ce s-a întâmplat, cum s-a simțit, ce am înțeles și de ce contează. Nu transforma lipsurile, planurile sau intențiile în fapte deja întâmplate. Nu inventa copii, părinți, reacții, rezultate ori formule de tipul „educatoarea”, „părinții vor aprecia” sau „copiii au învățat” dacă nota nu le spune explicit. Dacă nota conține doar un plan, o problemă administrativă sau o idee prea subțire pentru o poveste publică, întoarce un array gol. Anonimizează orice apariție a numelui Erdu ca „Domnișoara E.”, dar nu anonimiza și nu înlocui persoana I a lui Radu. title trebuie să fie o propoziție scurtă, vie și umană, nu „O scenă care merită păstrată”. summary este teaserul publicabil, cu miez, nu o listă. emotional_core spune simplu ce s-a simțit. why_it_matters explică de ce ar recunoaște un părinte această experiență. context este brief-ul adevărat pentru carousel și nu adaugă fapte.', input: noteText, text: { format: { type: 'json_schema', name: 'becky_story_candidates', strict: true, schema } } }) });
  const result = await response.json().catch(() => ({}));
  const outputText = result.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!response.ok || !outputText) throw Object.assign(new Error('Poveștile nu au putut fi extrase.'), { status: 502 });
  return { stories: JSON.parse(outputText).stories || [], model: result.model };
}

async function editCarouselSlide(apiKey, instruction, slide) {
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY lipsește din mediul local'), { status: 503 });
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      heading: { type: ['string', 'null'] },
      body: { type: ['string', 'null'] },
      headingParts: { type: ['array', 'null'], items: { type: 'object', additionalProperties: false, properties: { text: { type: 'string' }, color: { type: 'string', enum: ['teal', 'coral'] } }, required: ['text', 'color'] } },
      artworkInstruction: { type: ['string', 'null'] },
      headerOffsetDelta: { type: 'integer', minimum: -80, maximum: 80 },
      artworkOffsetDelta: { type: 'integer', minimum: -160, maximum: 160 },
      decorationOffsetDelta: { type: 'integer', minimum: -120, maximum: 120 },
      decorationMode: { type: 'string', enum: ['keep', 'balanced', 'airy', 'opposite'] }
    },
    required: ['heading', 'body', 'headingParts', 'artworkInstruction', 'headerOffsetDelta', 'artworkOffsetDelta', 'decorationOffsetDelta', 'decorationMode']
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: localSecret('OPENAI_TEXT_MODEL') || 'gpt-4.1-mini',
      instructions: 'Ești editorul de layout pentru un carousel Becky în limba română. Aplică doar schimbările cerute și respectă regulile din currentSlide.brand pentru voce, audiență, vocabular și CTA. Pentru câmpurile de text sau ilustrație necerute întoarce null. Offseturile sunt diferențe în pixeli față de poziția curentă; întoarce 0 dacă nu se cere mutarea. heading trebuie să rămână scurt, clar și de sine stătător. body trebuie să explice relevanța pentru părinte. Fontul Mali, conturul alb, norii și paginația sunt reguli fixe de brand. Dacă utilizatorul indică exact ce parte din header vrea teal sau coral, întoarce headingParts în ordinea afișării, fiecare fragment având textul și culoarea cerută; fiecare fragment devine un rând colorat. Dacă nu cere culori, headingParts trebuie să fie null și aplicația păstrează alternanța implicită teal/coral.',
      input: JSON.stringify({ instruction, currentSlide: slide }),
      text: { format: { type: 'json_schema', name: 'carousel_slide_edit', strict: true, schema } }
    })
  });
  const result = await response.json().catch(() => ({}));
  const outputText = result.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!response.ok || !outputText) {
    console.error('OpenAI slide edit failed', response.status, result.error?.code || result.error?.message || 'unknown');
    throw Object.assign(new Error(response.status === 429 ? 'Limita OpenAI a fost atinsă.' : 'Content Assistant nu a putut interpreta modificarea.'), { status: response.status === 429 ? 429 : 502 });
  }
  return { edit: JSON.parse(outputText), model: result.model };
}

function localSecret(name) {
  try {
    const file = path.join(ROOT, '.dev.vars');
    if (fs.existsSync(file)) {
      const match = fs.readFileSync(file, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
      if (match?.[1]?.trim()) return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {}
  return process.env[name];
}

function serve(res, pathname) {
  const routes = {'/':'/index.html','/admin':'/admin/index.html','/admin/biblioteca-copii':'/admin/children-library.html','/admin/biblioteca-activitati-copii':'/admin/children-library.html','/petreceri':'/petreceri.html','/evenimente':'/evenimente.html','/comunitate':'/comunitate.html','/chestionare':'/chestionare.html','/chestionar-evenimente':'/chestionar-evenimente.html','/chestionar-loc-de-joaca':'/chestionar-loc-de-joaca.html'};
  let decodedPathname;
  try { decodedPathname = decodeURIComponent(pathname); }
  catch { return send(res, 400, { error: 'Invalid path' }); }
  const requested = routes[pathname] || decodedPathname;
  const file = path.normalize(path.join(PUBLIC, requested));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found' });
    const ext = path.extname(file);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
    send(res, 200, data, types[ext] || 'application/octet-stream');
  });
}

async function buildLocalProposals(noteDate, noteText, rawProposals) {
  const core = await beckyInboxCorePromise; const sourceHash = await core.sha256(noteText); const context = { ...localBeckyContext(), note_date:noteDate, note_text:noteText }; const existing = readBeckyInbox(); const created = [];
  for (const raw of rawProposals) {
    const resolved = core.resolveAiProposal(raw, context); if (!core.EXECUTABLE_DESTINATIONS.includes(resolved.destination)) continue;
    const now = new Date().toISOString(); const draft = { id:crypto.randomUUID(), source_type:'daily_note', source_id:noteDate, source_version:sourceHash, source_hash:sourceHash, source_excerpt:resolved.source_excerpt, destination:resolved.destination, operation:resolved.operation || 'add', target_entity_type:resolved.target_entity_type, target_entity_id:resolved.target_entity_id, target_candidates:resolved.target_candidates, resolution_status:resolved.resolution_status, resolution_query:resolved.resolution_query, payload:resolved.payload, field_provenance:resolved.field_provenance, status:'pending', validation_errors:[], missing_fields:[], destination_entity_id:null, destination_verified_at:null, destination_entity_updated_at:null, reverted_at:null, revert_error:null, created_at:now, updated_at:now, executed_at:null, last_error:null };
    draft.validation_errors = core.validateProposedChange(draft); draft.missing_fields = draft.validation_errors; draft.dedupe_key = await core.proposalDedupeKey(draft);
    const duplicate = existing.find(item => item.dedupe_key === draft.dedupe_key); if (duplicate) { created.push(duplicate); continue; }
    existing.push(draft); created.push(draft);
  }
  writeBeckyInbox(existing); return { proposals:created, source_hash:sourceHash };
}
async function buildLocalBrief(noteDate,noteText,rawInsights,proposals){const core=await beckyInboxCorePromise;const sourceHash=await core.sha256(noteText);const existing=readBeckyBrief();const persisted=existing.filter(item=>item.source_type==='daily_note'&&item.source_id===noteDate&&item.source_hash===sourceHash);if(persisted.length)return persisted.sort((a,b)=>b.rank_score-a.rank_score);const selected=core.selectBriefInsights(rawInsights,{note_text:noteText,proposals});const now=new Date().toISOString();const created=selected.map((item,index)=>({id:crypto.randomUUID(),source_type:'daily_note',source_id:noteDate,source_version:sourceHash,source_hash:sourceHash,...item,sort_order:index,created_at:now,updated_at:now}));writeBeckyBrief([...existing,...created]);return created;}
async function updateLocalProposal(id, body) {
  const core = await beckyInboxCorePromise; const items = readBeckyInbox(); const index = items.findIndex(item => item.id === id); if (index < 0) throw Object.assign(new Error('Propunerea nu a fost găsită'), { status:404 }); const current = items[index]; if (current.status === 'approved' || current.status === 'ignored') throw Object.assign(new Error('Propunerea nu mai poate fi editată'), { status:409 });
  const context = localBeckyContext(); const next = { ...current, payload:{ ...current.payload, ...(body?.payload && typeof body.payload === 'object' ? body.payload : {}) }, updated_at:new Date().toISOString(), status:'pending', last_error:null };
  if (body?.target_entity_id !== undefined) { next.target_entity_id = String(body.target_entity_id || '') || null; if (next.destination === 'activity_observation') next.payload.activity_id = next.target_entity_id; if (next.destination === 'crm_child_observation') next.payload.child_id = next.target_entity_id; const options = next.destination === 'activity_observation' ? context.activities : context.children; const found = options.find(item => item.id === next.target_entity_id); next.target_candidates = found ? [{ id:found.id, label:found.title || found.first_name }] : []; next.resolution_status=found?'resolved':'not_found'; const key = next.destination === 'activity_observation' ? 'activity_id' : 'child_id'; next.field_provenance = { ...next.field_provenance, [key]:{ source:found?'system':'missing', detail:found?'Selectat și confirmat de utilizator':'Selectează o entitate validă' } }; }
  next.validation_errors = core.validateProposedChange(next); next.missing_fields = next.validation_errors; items[index] = next; writeBeckyInbox(items); return next;
}
function readLocalDestination(item, id = item.destination_entity_id) {
  if (!id) return null;
  if (item.destination === 'activity_observation') return readActivityObservations().find(value => value.id === id) || null;
  if (item.destination === 'crm_child_observation') return readCrmStore().observations.find(value => value.id === id) || null;
  if (item.destination === 'monthly_report_entry') return readMonthlyReport().entries.find(value => value.id === id) || null;
  return null;
}
function deleteLocalDestination(item, id) {
  if (item.destination === 'activity_observation') { const values=readActivityObservations(); const next=values.filter(value=>value.id!==id); if(next.length===values.length)return false; writeActivityObservations(next); return true; }
  if (item.destination === 'crm_child_observation') { const store=readCrmStore(); const next=store.observations.filter(value=>value.id!==id); if(next.length===store.observations.length)return false; store.observations=next; writeCrmStore(store); return true; }
  if (item.destination === 'monthly_report_entry') { const report=readMonthlyReport(); const next=report.entries.filter(value=>value.id!==id); if(next.length===report.entries.length)return false; report.entries=next; writeMonthlyReport(report); return true; }
  return false;
}
async function executeLocalProposal(id) {
  const core = await beckyInboxCorePromise; const items = readBeckyInbox(); const index = items.findIndex(item => item.id === id); if (index < 0) throw Object.assign(new Error('Propunerea nu a fost găsită'), { status:404 }); const item = items[index];
  if (item.status === 'approved') { if(readLocalDestination(item))return item; item.status='failed';item.last_error='Rezultatul aprobat nu mai poate fi citit din destinația canonică.';item.updated_at=new Date().toISOString();items[index]=item;writeBeckyInbox(items);throw Object.assign(new Error(item.last_error),{status:409}); } if (item.status === 'ignored' || item.status === 'reverted') throw Object.assign(new Error('Propunerea nu mai poate fi aprobată'), { status:409 }); const errors = core.validateProposedChange(item); if (errors.length) throw Object.assign(new Error(errors[0]), { status:400, validation_errors:errors });
  try { const payload = core.canonicalExecutionPayload(item); const destinationId=`becky-inbox-${item.id}`; let entity;
    if (item.destination === 'activity_observation') { const values = readActivityObservations(); entity=values.find(value=>value.id===destinationId); if(!entity){entity = normalizeActivityObservation({ ...payload,id:destinationId }); values.push(entity); writeActivityObservations(values);} }
    else if (item.destination === 'crm_child_observation') { const store = readCrmStore(); entity=store.observations.find(value=>value.id===destinationId); if(!entity){entity = normalizeCrmObservation({ ...payload,id:destinationId }, {}, new Set(store.children.map(child => child.id)), new Map(store.visits.map(visit => [visit.id, visit]))); store.observations.push(entity); writeCrmStore(store);} }
    else if (item.destination === 'monthly_report_entry') { const report = readMonthlyReport(); entity=report.entries.find(value=>value.id===destinationId); if(!entity){entity = normalizeMonthlyReportEntry({ ...payload,id:destinationId }, {}, report.month_key); report.entries.push(entity); writeMonthlyReport(report);} }
    const verified=readLocalDestination(item,entity?.id); if(!verified)throw new Error('Obiectul a fost scris, dar nu a putut fi recitit din destinația canonică.');
    item.status='approved'; item.destination_entity_id=verified.id; item.destination_verified_at=new Date().toISOString(); item.destination_entity_updated_at=verified.updated_at||verified.created_at||null; item.executed_at=item.destination_verified_at; item.updated_at=item.executed_at; item.last_error=null; item.validation_errors=[]; item.missing_fields=[]; item.revert_error=null; items[index]=item; writeBeckyInbox(items); return item;
  } catch (error) { item.status='failed'; item.last_error=String(error.message||'Execution failed'); item.updated_at=new Date().toISOString(); items[index]=item; writeBeckyInbox(items); throw error; }
}
async function revertLocalProposal(id) {
  const items=readBeckyInbox();const index=items.findIndex(item=>item.id===id);if(index<0)throw Object.assign(new Error('Propunerea nu a fost găsită'),{status:404});const item=items[index];
  if(item.status==='reverted')return item;if(item.status!=='approved'||!item.destination_entity_id)throw Object.assign(new Error('Doar o schimbare păstrată poate fi anulată.'),{status:409});
  const entity=readLocalDestination(item);if(!entity)throw Object.assign(new Error('Rezultatul canonic nu mai există. Verifică destinația înainte de anulare.'),{status:409});
  const expected=item.destination_entity_updated_at||null;const actual=entity.updated_at||entity.created_at||null;if(expected&&actual!==expected){item.revert_error='Rezultatul a fost modificat după creare și nu poate fi șters automat.';item.updated_at=new Date().toISOString();items[index]=item;writeBeckyInbox(items);throw Object.assign(new Error(item.revert_error),{status:409,destination_entity_id:item.destination_entity_id});}
  if(!deleteLocalDestination(item,item.destination_entity_id)||readLocalDestination(item))throw new Error('Anularea nu a putut fi verificată în destinația canonică.');
  item.status='reverted';item.reverted_at=new Date().toISOString();item.updated_at=item.reverted_at;item.revert_error=null;items[index]=item;writeBeckyInbox(items);return item;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/runtime') return send(res, 200, {
    runtime: 'node-local',
    authRequired: false,
    testingMode: process.env.NODE_ENV !== 'production'
  });
  if (req.method === 'GET' && url.pathname === '/api/manual') return send(res, 200, readDocument());
  if (req.method === 'GET' && url.pathname === '/api/styles') return send(res, 200, { css: fs.existsSync(CSS_FILE) ? fs.readFileSync(CSS_FILE, 'utf8') : '' });
  if (req.method === 'GET' && url.pathname === '/api/workspaces') return send(res, 200, readWorkspaces());
  if (url.pathname === '/api/admin/becky-memory/signals' && req.method === 'GET') { try { const sourceId=String(url.searchParams.get('source_note_id')||'');const report=readMonthlyReport();const inboxCore=await beckyInboxCorePromise;const memoryCore=await beckyMemoryCorePromise;let signals=readBeckyMemory().filter(item=>(!sourceId||item.source_note_id===sourceId)&&!memoryCore.isSpeculativeMemorySignal(item.exact_source_excerpt)&&!memoryCore.isSpeculativeMemorySignal(item.normalized_observation));const hashes=new Map();for(const item of signals){if(!hashes.has(item.source_note_id))hashes.set(item.source_note_id,await inboxCore.sha256(String(report.notes?.[item.source_note_id]||'')));}signals=signals.map(item=>({...item,stale:hashes.get(item.source_note_id)!==item.source_hash})).sort((a,b)=>`${b.source_date}${b.created_at}`.localeCompare(`${a.source_date}${a.created_at}`));return send(res,200,{signals});}catch(error){return send(res,500,{error:error.message||'Memoria Becky nu este disponibilă'});} }
  if (url.pathname === '/api/admin/becky-memory/attention' && req.method === 'GET') { try { return send(res,200,{candidates:readBeckyAttention().filter(item=>item.status==='active'||item.status==='investigating').sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)))}); } catch(error){return send(res,500,{error:error.message||'Atenția Becky nu este disponibilă'});} }
  if (url.pathname === '/api/admin/becky-memory/analyze' && req.method === 'POST') { try { const body=await readRequestJsonAsync(req,100_000);const date=String(body?.date||'');const report=readMonthlyReport();const noteText=String(report.notes?.[date]||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!noteText)return send(res,400,{error:'Nota zilei nu există sau este goală.'});const context=localBeckyContext();const historicContext=await localMemoryContext();let analysis;if(process.env.BECKY_INBOX_TEST_MODE==='1'&&Array.isArray(body.memory_override))analysis={memory_signals:body.memory_override,attention_candidates:Array.isArray(body.attention_override)?body.attention_override:[]};else{const analyzer=await beckyMemoryAnalyzePromise;analysis=await analyzer.analyzeDailyNoteForMemory({apiKey:localSecret('OPENAI_API_KEY'),model:localSecret('OPENAI_TEXT_MODEL')||'gpt-4.1-mini',noteDate:date,noteText,children:context.children,activities:context.activities,historicContext});}return send(res,201,await buildLocalMemory(date,noteText,analysis.memory_signals,analysis.attention_candidates));}catch(error){return send(res,error.status||500,{error:error.message||'Nota nu a putut fi procesată.'});} }
  const memorySignalMatch=url.pathname.match(/^\/api\/admin\/becky-memory\/signals\/([^/?]+)$/);
  if(memorySignalMatch&&['PATCH','DELETE'].includes(req.method)){try{const id=decodeURIComponent(memorySignalMatch[1]);const signals=readBeckyMemory();const index=signals.findIndex(item=>item.id===id);if(index<0)return send(res,404,{error:'Semnalul nu a fost găsit'});if(req.method==='DELETE'){const signal=signals[index];const auto=(signal.canonical_context||[]).find(item=>item.destination==='crm_child_observation');if(auto){const store=readCrmStore();const existing=store.observations.find(item=>item.id===auto.destination_entity_id);if(existing&&(existing.updated_at||existing.created_at)===auto.destination_updated_at){store.observations=store.observations.filter(item=>item.id!==existing.id);writeCrmStore(store);}}signals.splice(index,1);writeBeckyMemory(signals);return send(res,200,{ok:true});}const body=await readRequestJsonAsync(req,20_000);if(!Array.isArray(body.entities))return send(res,400,{error:'Entitățile sunt invalide'});const entities=body.entities.map(item=>({type:item.type==='activity'?'activity':'child',id:item.id?String(item.id):null,label:String(item.label||'').trim(),resolution:['resolved','ambiguous','not_found'].includes(item.resolution)?item.resolution:'not_found'}));const child=entities.find(item=>item.type==='child'&&item.resolution==='resolved'&&item.id);let next={...signals[index],entities,updated_at:new Date().toISOString()};next.possible_canonical_context=child&&['observed','direct_quote'].includes(next.epistemic_type)?[{destination:'crm_child_observation',child_id:child.id,eligibility:'auto_store'}]:[];autoStoreLocalMemorySignal(next);signals[index]=next;writeBeckyMemory(signals);return send(res,200,next);}catch(error){return send(res,400,{error:error.message||'Semnalul nu a putut fi actualizat'});} }
  const memoryAttentionMatch=url.pathname.match(/^\/api\/admin\/becky-memory\/attention\/([^/?]+)(?:\/(promote))?$/);
  if(memoryAttentionMatch&&['PATCH','POST'].includes(req.method)){try{const id=decodeURIComponent(memoryAttentionMatch[1]);const candidates=readBeckyAttention();const index=candidates.findIndex(item=>item.id===id);if(index<0)return send(res,404,{error:'Candidatul nu a fost găsit'});const candidate=candidates[index];if(memoryAttentionMatch[2]==='promote'){const body=await readRequestJsonAsync(req,20_000);const knowledge=normalizeKnowledgeCandidate({target:body.target,text:`${candidate.title}\n\n${candidate.summary}\n\nDe ce merită investigat: ${candidate.why_it_matters}\n\nValidare sugerată: ${candidate.suggested_next_step}`,status:'proposed',source_type:'becky_memory_attention',source_id:candidate.id});const values=readJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE,'knowledge candidates');values.push(knowledge);writeJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE,values);candidates[index]={...candidate,status:'promoted',updated_at:new Date().toISOString(),knowledge_candidate_id:knowledge.id};writeBeckyAttention(candidates);return send(res,201,{candidate:candidates[index],knowledge_candidate:knowledge});}const body=await readRequestJsonAsync(req,20_000);if(!['active','investigating','dismissed'].includes(body.status))return send(res,400,{error:'Status invalid'});candidates[index]={...candidate,status:body.status,updated_at:new Date().toISOString()};writeBeckyAttention(candidates);return send(res,200,candidates[index]);}catch(error){return send(res,400,{error:error.message||'Candidatul nu a putut fi actualizat'});} }
  if (url.pathname === '/api/admin/becky-inbox/brief' && req.method === 'GET') { try { const core=await beckyInboxCorePromise;const report=readMonthlyReport();const sourceId=String(url.searchParams.get('source_id')||'');const sourceVersion=String(url.searchParams.get('source_version')||'');let insights=readBeckyBrief().filter(item=>(!sourceId||item.source_id===sourceId)&&(!sourceVersion||item.source_version===sourceVersion));const hashes=new Map();for(const item of insights){if(item.source_type==='daily_note'&&!hashes.has(item.source_id))hashes.set(item.source_id,await core.sha256(String(report.notes?.[item.source_id]||'')));}insights=insights.map(item=>({...item,stale:item.source_type==='daily_note'&&hashes.get(item.source_id)!==item.source_hash})).sort((a,b)=>(a.sort_order??99)-(b.sort_order??99)||String(b.created_at).localeCompare(String(a.created_at)));return send(res,200,{insights}); } catch(error){return send(res,500,{error:error.message||'Becky Brief indisponibil'});}}
  if (url.pathname === '/api/admin/becky-inbox/context' && req.method === 'GET') return send(res, 200, localBeckyContext());
  if (url.pathname === '/api/admin/becky-inbox/proposals' && req.method === 'GET') {
    try { const core=await beckyInboxCorePromise; const report=readMonthlyReport(); const destination=String(url.searchParams.get('destination')||''); const status=String(url.searchParams.get('status')||''); const sourceId=String(url.searchParams.get('source_id')||''); let items=readBeckyInbox().filter(item=>(!destination||item.destination===destination)&&(!status||item.status===status)&&(!sourceId||item.source_id===sourceId)); const hashes=new Map(); for(const item of items){if(item.source_type==='daily_note'&&!hashes.has(item.source_id))hashes.set(item.source_id,await core.sha256(String(report.notes?.[item.source_id]||'')));} items=items.map(item=>({...item,resolution_status:item.resolution_status||(item.destination==='monthly_report_entry'||item.target_entity_id?'resolved':(item.target_candidates||[]).length>1?'ambiguous':'not_found'),stale:item.source_type==='daily_note'&&hashes.get(item.source_id)!==item.source_hash})).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))); return send(res,200,{proposals:items}); } catch(error){return send(res,500,{error:error.message||'Becky Inbox indisponibil'});}
  }
  if (url.pathname === '/api/admin/becky-inbox/analyze' && req.method === 'POST') {
    try { const body=await readRequestJsonAsync(req,100_000); const date=String(body?.date||''); const report=readMonthlyReport(); const noteText=String(report.notes?.[date]||'').trim(); if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!noteText)return send(res,400,{error:'Nota zilei nu există sau este goală.'}); const context=localBeckyContext(); let raw;
      let analysis;if(process.env.BECKY_INBOX_TEST_MODE==='1'&&Array.isArray(body.analysis_override))analysis={proposals:body.analysis_override,insights:Array.isArray(body.brief_override)?body.brief_override:[]}; else { const analyzer=await beckyInboxAnalyzePromise; analysis=await analyzer.analyzeDailyNoteWithOpenAI({apiKey:localSecret('OPENAI_API_KEY'),model:localSecret('OPENAI_TEXT_MODEL')||'gpt-4.1-mini',noteDate:date,noteText,children:context.children,activities:context.activities,roles:context.roles}); }
      const result=await buildLocalProposals(date,noteText,analysis.proposals||[]);const insights=await buildLocalBrief(date,noteText,analysis.insights||[],result.proposals); return send(res,201,{...result,insights});
    } catch(error){return send(res,error.status||500,{error:error.message||'Nota nu a putut fi analizată.'});}
  }
  const beckyProposalMatch=url.pathname.match(/^\/api\/admin\/becky-inbox\/proposals\/([^/?]+)(?:\/(approve|ignore|revert))?$/);
  if(beckyProposalMatch&&req.method==='PATCH'&&!beckyProposalMatch[2]){try{return send(res,200,await updateLocalProposal(decodeURIComponent(beckyProposalMatch[1]),await readRequestJsonAsync(req,100_000)));}catch(error){return send(res,error.status||400,{error:error.message,validation_errors:error.validation_errors||[]});}}
  if(beckyProposalMatch&&req.method==='POST'&&beckyProposalMatch[2]==='ignore'){try{const items=readBeckyInbox();const index=items.findIndex(item=>item.id===decodeURIComponent(beckyProposalMatch[1]));if(index<0)return send(res,404,{error:'Propunerea nu a fost găsită'});if(['approved','reverted'].includes(items[index].status))return send(res,409,{error:'Propunerea nu mai poate fi ignorată'});items[index]={...items[index],status:'ignored',updated_at:new Date().toISOString(),last_error:null};writeBeckyInbox(items);return send(res,200,items[index]);}catch{return send(res,500,{error:'Propunerea nu a putut fi ignorată'});}}
  if(beckyProposalMatch&&req.method==='POST'&&beckyProposalMatch[2]==='approve'){try{const body=await readRequestJsonAsync(req,10_000);const core=await beckyInboxCorePromise;const report=readMonthlyReport();const items=readBeckyInbox();const item=items.find(entry=>entry.id===decodeURIComponent(beckyProposalMatch[1]));if(!item)return send(res,404,{error:'Propunerea nu a fost găsită'});if(item.status!=='approved'){const currentHash=await core.sha256(String(report.notes?.[item.source_id]||''));if(currentHash!==item.source_hash&&!Boolean(body.confirm_stale))return send(res,409,{error:'Nota a fost modificată. Confirmă aprobarea propunerii vechi.',stale:true});}return send(res,200,await executeLocalProposal(item.id));}catch(error){return send(res,error.status||500,{error:error.message||'Aprobarea a eșuat',validation_errors:error.validation_errors||[]});}}
  if(beckyProposalMatch&&req.method==='POST'&&beckyProposalMatch[2]==='revert'){try{return send(res,200,await revertLocalProposal(decodeURIComponent(beckyProposalMatch[1])));}catch(error){return send(res,error.status||500,{error:error.message||'Anularea a eșuat',destination_entity_id:error.destination_entity_id||null});}}
  if (url.pathname === '/api/admin/tasks' && req.method === 'GET') {
    try { return send(res, 200, { tasks: readAdminTasks() }); }
    catch { return send(res, 500, { error: 'Admin tasks unavailable' }); }
  }
  if (url.pathname === '/api/admin/tasks' && req.method === 'POST') {
    readRequestJson(req, res, 40_000, body => {
      try {
        const tasks = readAdminTasks();
        const task = normalizeAdminTask(body);
        if (tasks.some(item => item.id === task.id)) return send(res, 409, { error: 'Admin task already exists' });
        tasks.push(task);
        writeAdminTasks(tasks);
        send(res, 201, task);
      } catch { send(res, 400, { error: 'Admin task invalid' }); }
    });
    return;
  }
  if (url.pathname === '/api/admin/tasks' && req.method === 'PUT') {
    readRequestJson(req, res, 200_000, body => {
      try {
        if (!Array.isArray(body?.tasks)) throw new Error('Admin tasks invalid');
        const existing = new Map(readAdminTasks().map(task => [task.id, task]));
        const tasks = body.tasks.map(task => normalizeAdminTask(task, existing.get(task.id)));
        if (new Set(tasks.map(task => task.id)).size !== tasks.length) throw new Error('Duplicate admin task');
        writeAdminTasks(tasks);
        send(res, 200, { tasks });
      } catch { send(res, 400, { error: 'Admin tasks invalid' }); }
    });
    return;
  }
  if (url.pathname.startsWith('/api/admin/tasks/') && ['PATCH', 'DELETE'].includes(req.method)) {
    const id = decodeURIComponent(url.pathname.slice('/api/admin/tasks/'.length));
    if (!id) return send(res, 400, { error: 'Admin task id missing' });
    if (req.method === 'DELETE') {
      try {
        const tasks = readAdminTasks();
        const next = tasks.filter(task => task.id !== id);
        if (next.length === tasks.length) return send(res, 404, { error: 'Admin task not found' });
        writeAdminTasks(next);
        return send(res, 200, { ok: true });
      } catch { return send(res, 500, { error: 'Admin task unavailable' }); }
    }
    readRequestJson(req, res, 40_000, body => {
      try {
        const tasks = readAdminTasks();
        const index = tasks.findIndex(task => task.id === id);
        if (index < 0) return send(res, 404, { error: 'Admin task not found' });
        tasks[index] = normalizeAdminTask({ ...tasks[index], ...body, id }, tasks[index]);
        writeAdminTasks(tasks);
        send(res, 200, tasks[index]);
      } catch { send(res, 400, { error: 'Admin task invalid' }); }
    });
    return;
  }
  if (url.pathname === '/api/admin/crm' && req.method === 'GET') {
    try {
      const store = readCrmStore();
      return send(res, 200, { children: store.children.map(child => ({...crmChildSummary(child, store.visits), primary_companion_id:(store.child_companions.find(link=>link.child_id===child.id&&link.is_primary)||{}).companion_id||null})).sort((a, b) => (b.last_visit || '').localeCompare(a.last_visit || '') || a.first_name.localeCompare(b.first_name, 'ro')), companions:store.companions.map(companion=>crmCompanionSummary(companion,store)).sort((a,b)=>a.first_name.localeCompare(b.first_name,'ro')) });
    } catch { return send(res, 500, { error: 'CRM unavailable' }); }
  }
  if (url.pathname === '/api/admin/monthly-report' && req.method === 'GET') {
    try { return send(res, 200, { report: readMonthlyReport() }); } catch { return send(res, 500, { error: 'Raport lunar indisponibil' }); }
  }
  if (url.pathname === '/api/admin/experience-repertoire' && req.method === 'GET') {
    try { return send(res, 200, experienceRepertoireView(readExperienceRepertoire())); } catch { return send(res, 500, { error: 'Repertoriul experienței nu este disponibil' }); }
  }
  if (url.pathname === '/api/admin/experience-repertoire' && req.method === 'POST') {
    readRequestJson(req, res, 40_000, body => { try { const items = readExperienceRepertoire(); const item = normalizeExperienceRepertoire(body); items.push(item); writeJsonStore(ADMIN_EXPERIENCE_REPERTOIRE_FILE, items); send(res, 201, item); } catch { send(res, 400, { error: 'Ideea de repertoriu este invalidă' }); } }); return;
  }
  const repertoireMatch = url.pathname.match(/^\/api\/admin\/experience-repertoire\/([^/?]+)$/);
  if (repertoireMatch && ['PATCH', 'DELETE'].includes(req.method)) {
    const id = decodeURIComponent(repertoireMatch[1]);
    if (req.method === 'DELETE') { try { const items = readExperienceRepertoire(); const index = items.findIndex(item => item.id === id); if (index < 0) return send(res, 404, { error: 'Ideea nu a fost găsită' }); items[index] = normalizeExperienceRepertoire({ ...items[index], status: 'archived', id }, items[index]); writeJsonStore(ADMIN_EXPERIENCE_REPERTOIRE_FILE, items); return send(res, 200, items[index]); } catch { return send(res, 400, { error: 'Ideea nu a putut fi arhivată' }); } }
    readRequestJson(req, res, 40_000, body => { try { const items = readExperienceRepertoire(); const index = items.findIndex(item => item.id === id); if (index < 0) return send(res, 404, { error: 'Ideea nu a fost găsită' }); items[index] = normalizeExperienceRepertoire({ ...items[index], ...body, id }, items[index]); writeJsonStore(ADMIN_EXPERIENCE_REPERTOIRE_FILE, items); send(res, 200, items[index]); } catch { send(res, 400, { error: 'Ideea repertoriului este invalidă' }); } }); return;
  }
  if (url.pathname === '/api/admin/pedagogic-coverage' && req.method === 'GET') { try { return send(res, 200, pedagogicCoverage()); } catch { return send(res, 500, { error: 'Coverage pedagogic indisponibil' }); } }
  if (url.pathname === '/api/admin/children-activity-validations' && req.method === 'POST') { readRequestJson(req, res, 20_000, body => { try { const activityId = String(body?.activity_id || '').trim(); const age = String(body?.age_category || '').trim(); const participant = String(body?.participant_category || '').trim(); const status = String(body?.validation_status || '').trim(); if (!activityId || !PEDAGOGIC_AGES.includes(age) || !PEDAGOGIC_PARTICIPANTS.includes(participant) || !['idea','validated'].includes(status)) return send(res, 400, { error: 'Validare invalidă' }); const items = readJsonStore(ADMIN_CHILDREN_ACTIVITY_VALIDATIONS_FILE, 'children activity validations'); const now = new Date().toISOString(); const index = items.findIndex(item => item.activity_id === activityId && item.age_category === age && item.participant_category === participant); const item = { id: index >= 0 ? items[index].id : crypto.randomUUID(), activity_id: activityId, age_category: age, participant_category: participant, validation_status: status, created_at: index >= 0 ? items[index].created_at : now, updated_at: now }; if (index >= 0) items[index] = item; else items.push(item); writeJsonStore(ADMIN_CHILDREN_ACTIVITY_VALIDATIONS_FILE, items); return send(res, 200, item); } catch { return send(res, 400, { error: 'Validarea nu a putut fi salvată' }); } }); return; }
  if (url.pathname === '/api/admin/becky-themed-activities' && req.method === 'GET') { try { return send(res, 200, { activities: readBeckyThemedActivities().filter(item => item.status === 'active') }); } catch { return send(res, 500, { error: 'Activitățile tematice nu sunt disponibile' }); } }
  if (url.pathname === '/api/admin/becky-themed-activities' && req.method === 'POST') { readRequestJson(req, res, 100_000, body => { try { const items = readBeckyThemedActivities(); const item = normalizeBeckyThemedActivity(body); items.push(item); writeJsonStore(ADMIN_BECKY_THEMED_ACTIVITIES_FILE, items); send(res, 201, item); } catch { send(res, 400, { error: 'Activitatea tematică este invalidă' }); } }); return; }
  const themedMatch = url.pathname.match(/^\/api\/admin\/becky-themed-activities\/([^/?]+)$/);
  if (themedMatch && ['PATCH', 'DELETE'].includes(req.method)) { const id = decodeURIComponent(themedMatch[1]); readRequestJson(req, res, 100_000, body => { try { const items = readBeckyThemedActivities(); const index = items.findIndex(item => item.id === id); if (index < 0) return send(res, 404, { error: 'Activitatea tematică nu a fost găsită' }); const payload = req.method === 'DELETE' ? { ...items[index], status: 'archived' } : { ...items[index], ...body, id }; items[index] = normalizeBeckyThemedActivity(payload, items[index]); writeJsonStore(ADMIN_BECKY_THEMED_ACTIVITIES_FILE, items); send(res, 200, items[index]); } catch { send(res, 400, { error: 'Activitatea tematică este invalidă' }); } }); return; }
  if (url.pathname === '/api/admin/monthly-report/entries' && req.method === 'GET') {
    try {
      const report = readMonthlyReport();
      const monthKey = String(url.searchParams.get('month_key') || report.month_key || '2026-08');
      const roleId = String(url.searchParams.get('role_id') || '').trim();
      if (!/^\d{4}-\d{2}$/.test(monthKey) || (roleId && !MONTHLY_REPORT_ROLES.some(([id]) => id === roleId))) return send(res, 400, { error: 'Filtru invalid' });
      const entries = report.entries.filter(entry => entry.month_key === monthKey && (!roleId || entry.role_ids.includes(roleId))).sort((a, b) => `${b.entry_date}${b.created_at}`.localeCompare(`${a.entry_date}${a.created_at}`));
      return send(res, 200, { entries });
    } catch { return send(res, 500, { error: 'Intrările raportului nu sunt disponibile' }); }
  }
  if (url.pathname === '/api/admin/monthly-report/entries' && req.method === 'POST') {
    readRequestJson(req, res, 40_000, body => {
      try { const report = readMonthlyReport(); const entry = normalizeMonthlyReportEntry(body, {}, report.month_key); report.entries.push(entry); writeMonthlyReport(report); send(res, 201, entry); } catch { send(res, 400, { error: 'Intrarea raportului este invalidă' }); }
    });
    return;
  }
  const monthlyEntryMatch = url.pathname.match(/^\/api\/admin\/monthly-report\/entries\/([^/?]+)$/);
  if (monthlyEntryMatch && ['PATCH', 'DELETE'].includes(req.method)) {
    const id = decodeURIComponent(monthlyEntryMatch[1]);
    if (req.method === 'DELETE') {
      try { const report = readMonthlyReport(); const next = report.entries.filter(entry => entry.id !== id); if (next.length === report.entries.length) return send(res, 404, { error: 'Intrarea nu a fost găsită' }); report.entries = next; writeMonthlyReport(report); return send(res, 200, { ok: true }); } catch { return send(res, 500, { error: 'Intrarea nu a putut fi ștearsă' }); }
    }
    readRequestJson(req, res, 40_000, body => {
      try { const report = readMonthlyReport(); const index = report.entries.findIndex(entry => entry.id === id); if (index < 0) return send(res, 404, { error: 'Intrarea nu a fost găsită' }); report.entries[index] = normalizeMonthlyReportEntry({ ...report.entries[index], ...body, id }, report.entries[index], report.month_key); writeMonthlyReport(report); send(res, 200, report.entries[index]); } catch { send(res, 400, { error: 'Intrarea raportului este invalidă' }); }
    });
    return;
  }
  if (url.pathname === '/api/admin/activity-observations' && req.method === 'GET') {
    try { const activityId = String(url.searchParams.get('activity_id') || '').trim(); return send(res, 200, { observations: readActivityObservations().filter(item => !activityId || item.activity_id === activityId).sort((a,b) => `${b.tested_at}${b.created_at}`.localeCompare(`${a.tested_at}${a.created_at}`)) }); } catch { return send(res, 500, { error: 'Observațiile nu sunt disponibile' }); }
  }
  if (url.pathname === '/api/admin/activity-observations' && req.method === 'POST') {
    readRequestJson(req, res, 100_000, body => { try { const items = readActivityObservations(); const item = normalizeActivityObservation(body); items.push(item); writeActivityObservations(items); send(res, 201, item); } catch { send(res, 400, { error: 'Testarea este invalidă' }); } }); return;
  }
  const observationMatch = url.pathname.match(/^\/api\/admin\/activity-observations\/([^/?]+)$/);
  if (observationMatch && ['PATCH', 'DELETE'].includes(req.method)) {
    const id = decodeURIComponent(observationMatch[1]);
    if (req.method === 'DELETE') { try { const items = readActivityObservations(); const next = items.filter(item => item.id !== id); if (next.length === items.length) return send(res, 404, { error: 'Testarea nu a fost găsită' }); writeActivityObservations(next); return send(res, 200, { ok: true }); } catch { return send(res, 500, { error: 'Testarea nu a putut fi ștearsă' }); } }
    readRequestJson(req, res, 100_000, body => { try { const items = readActivityObservations(); const index = items.findIndex(item => item.id === id); if (index < 0) return send(res, 404, { error: 'Testarea nu a fost găsită' }); items[index] = normalizeActivityObservation({ ...items[index], ...body, id }, items[index]); writeActivityObservations(items); send(res, 200, items[index]); } catch { send(res, 400, { error: 'Testarea este invalidă' }); } }); return;
  }
  if (url.pathname === '/api/admin/monthly-report/notes' && req.method === 'PATCH') {
    readRequestJson(req, res, 1_000_000, body => {
      try { const report = readMonthlyReport(); const date = String(body?.date || ''); const text = String(body?.text || '').trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(); report.notes = report.notes && typeof report.notes === 'object' ? report.notes : {}; if (text) report.notes[date] = text; else delete report.notes[date]; writeMonthlyReport(report); send(res, 200, { notes: report.notes }); } catch { send(res, 400, { error: 'Notă invalidă' }); }
    });
    return;
  }
  const monthlyRoleMatch = url.pathname.match(/^\/api\/admin\/monthly-report\/roles\/([^/?]+)$/);
  if (monthlyRoleMatch && req.method === 'PATCH') {
    readRequestJson(req, res, 40_000, body => {
      try {
        const report = readMonthlyReport();
        const role = report.roles.find(item => item.id === decodeURIComponent(monthlyRoleMatch[1]));
        if (!role) return send(res, 404, { error: 'Rolul nu a fost găsit' });
        if (body?.note && typeof body.note === 'object') {
          const date = String(body.note.date || '');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Data invalidă');
          const text = String(body.note.text || '').trim();
          role.notes = role.notes && typeof role.notes === 'object' ? role.notes : {};
          if (text) role.notes[date] = text; else delete role.notes[date];
        }
        const status = body?.status === undefined ? role.status : String(body.status);
        if (!MONTHLY_REPORT_STATUSES.includes(status)) throw new Error('Status invalid');
        const incoming = body?.sections && typeof body.sections === 'object' ? body.sections : {};
        role.status = status;
        for (const key of MONTHLY_REPORT_SECTION_KEYS) if (incoming[key] !== undefined) { const value = String(incoming[key] || '').trim(); if (value.length > 5000) throw new Error('Secțiune prea lungă'); role.sections[key] = value; }
        role.updated_at = new Date().toISOString();
        writeMonthlyReport(report);
        send(res, 200, { role });
      } catch { send(res, 400, { error: 'Raport lunar invalid' }); }
    });
    return;
  }
  if (url.pathname === '/api/admin/crm/children' && req.method === 'POST') {
    readRequestJson(req, res, 20_000, body => {
      try {
        const store = readCrmStore();
        const child = normalizeCrmChild(body);
        store.children.push(child);
        const primaryCompanionId=String(body?.primary_companion_id||'').trim(); if(primaryCompanionId){if(!store.companions.some(item=>item.id===primaryCompanionId))throw new Error('Companion invalid');store.child_companions.push({child_id:child.id,companion_id:primaryCompanionId,is_primary:true,created_at:new Date().toISOString()});}
        writeCrmStore(store);
        send(res, 201, crmChildSummary(child, store.visits));
      } catch { send(res, 400, { error: 'Copil invalid' }); }
    });
    return;
  }
  if (url.pathname === '/api/admin/crm/visits' && req.method === 'POST') {
    readRequestJson(req, res, 20_000, body => {
      try {
        const store = readCrmStore();
        const visit = normalizeCrmVisit(body, {}, new Set(store.children.map(child => child.id)),new Set(store.companions.map(item=>item.id)));
        store.visits.push(visit);
        writeCrmStore(store);
        send(res, 201, visit);
      } catch { send(res, 400, { error: 'Vizită invalidă' }); }
    });
    return;
  }
  if (url.pathname === '/api/admin/crm/companions' && req.method === 'POST') {
    readRequestJson(req,res,20_000,body=>{try{const store=readCrmStore();const companion=normalizeCrmCompanion(body);store.companions.push(companion);writeCrmStore(store);send(res,201,crmCompanionSummary(companion,store));}catch{send(res,400,{error:'Însoțitor invalid'});}});return;
  }
  const companionObservationListMatch=url.pathname.match(/^\/api\/admin\/crm\/companions\/([^/?]+)\/observations$/);
  if(companionObservationListMatch&&req.method==='POST'){readRequestJson(req,res,40_000,body=>{try{const store=readCrmStore();const companionId=decodeURIComponent(companionObservationListMatch[1]);const observation=normalizeCrmCompanionObservation({...body,companion_id:companionId},{},new Set(store.companions.map(item=>item.id)),new Map(store.visits.map(item=>[item.id,item])));store.companion_observations.push(observation);writeCrmStore(store);send(res,201,observation);}catch{send(res,400,{error:'Observația despre însoțitor este invalidă'});}});return;}
  const companionObservationMatch=url.pathname.match(/^\/api\/admin\/crm\/companion-observations\/([^/?]+)$/);
  if(companionObservationMatch&&['PATCH','DELETE'].includes(req.method)){const id=decodeURIComponent(companionObservationMatch[1]);if(req.method==='DELETE'){try{const store=readCrmStore();const values=store.companion_observations.filter(item=>item.id!==id);if(values.length===store.companion_observations.length)return send(res,404,{error:'Observația nu a fost găsită'});store.companion_observations=values;writeCrmStore(store);return send(res,200,{ok:true});}catch{return send(res,500,{error:'Observația nu a putut fi ștearsă'});}}readRequestJson(req,res,40_000,body=>{try{const store=readCrmStore();const index=store.companion_observations.findIndex(item=>item.id===id);if(index<0)return send(res,404,{error:'Observația nu a fost găsită'});store.companion_observations[index]=normalizeCrmCompanionObservation({...store.companion_observations[index],...body,id},store.companion_observations[index],new Set(store.companions.map(item=>item.id)),new Map(store.visits.map(item=>[item.id,item])));writeCrmStore(store);send(res,200,store.companion_observations[index]);}catch{send(res,400,{error:'Observația este invalidă'});}});return;}
  const companionMatch=url.pathname.match(/^\/api\/admin\/crm\/companions\/([^/?]+)$/);
  if(companionMatch&&req.method==='GET'){try{const store=readCrmStore();const companion=store.companions.find(item=>item.id===decodeURIComponent(companionMatch[1]));if(!companion)return send(res,404,{error:'Însoțitorul nu a fost găsit'});const visits=store.visits.filter(item=>item.companion_id===companion.id).sort((a,b)=>`${b.visit_date}${b.created_at}`.localeCompare(`${a.visit_date}${a.created_at}`));const observations=store.companion_observations.filter(item=>item.companion_id===companion.id).sort((a,b)=>`${b.observed_at}${b.created_at}`.localeCompare(`${a.observed_at}${a.created_at}`));return send(res,200,{companion:crmCompanionSummary(companion,store),visits,observations});}catch{return send(res,500,{error:'Însoțitor indisponibil'});}}
  if(companionMatch&&req.method==='PATCH'){readRequestJson(req,res,20_000,body=>{try{const store=readCrmStore();const index=store.companions.findIndex(item=>item.id===decodeURIComponent(companionMatch[1]));if(index<0)return send(res,404,{error:'Însoțitorul nu a fost găsit'});store.companions[index]=normalizeCrmCompanion({...body,id:store.companions[index].id},store.companions[index]);writeCrmStore(store);send(res,200,crmCompanionSummary(store.companions[index],store));}catch{send(res,400,{error:'Însoțitor invalid'});}});return;}
  if(companionMatch&&req.method==='DELETE'){try{const store=readCrmStore();const id=decodeURIComponent(companionMatch[1]);if(!store.companions.some(item=>item.id===id))return send(res,404,{error:'Însoțitorul nu a fost găsit'});store.companions=store.companions.filter(item=>item.id!==id);store.child_companions=store.child_companions.filter(item=>item.companion_id!==id);store.visits=store.visits.map(item=>item.companion_id===id?{...item,companion_id:null}:item);store.companion_observations=store.companion_observations.filter(item=>item.companion_id!==id);writeCrmStore(store);return send(res,200,{ok:true});}catch{return send(res,500,{error:'Însoțitor indisponibil'});}}
  const crmObservationListMatch = url.pathname.match(/^\/api\/admin\/crm\/children\/([^/?]+)\/observations$/);
  if (crmObservationListMatch && req.method === 'GET') {
    try {
      const store = readCrmStore();
      const childId = decodeURIComponent(crmObservationListMatch[1]);
      if (!store.children.some(child => child.id === childId)) return send(res, 404, { error: 'Copilul nu a fost găsit' });
      return send(res, 200, { observations: store.observations.filter(item => item.child_id === childId).sort((a, b) => String(b.observed_at).localeCompare(String(a.observed_at)) || String(b.created_at).localeCompare(String(a.created_at))) });
    } catch { return send(res, 500, { error: 'Observațiile nu sunt disponibile' }); }
  }
  if (crmObservationListMatch && req.method === 'POST') {
    readRequestJson(req, res, 40_000, body => {
      try {
        const store = readCrmStore();
        const childId = decodeURIComponent(crmObservationListMatch[1]);
        const observation = normalizeCrmObservation({ ...body, child_id: childId }, {}, new Set(store.children.map(child => child.id)), new Map(store.visits.map(visit => [visit.id, visit])));
        store.observations.push(observation);
        writeCrmStore(store);
        send(res, 201, observation);
      } catch { send(res, 400, { error: 'Observația este invalidă' }); }
    });
    return;
  }
  const crmObservationMatch = url.pathname.match(/^\/api\/admin\/crm\/observations\/([^/?]+)$/);
  if (crmObservationMatch && ['PATCH', 'DELETE'].includes(req.method)) {
    const id = decodeURIComponent(crmObservationMatch[1]);
    if (req.method === 'DELETE') {
      try {
        const store = readCrmStore();
        const next = store.observations.filter(item => item.id !== id);
        if (next.length === store.observations.length) return send(res, 404, { error: 'Observația nu a fost găsită' });
        store.observations = next;
        writeCrmStore(store);
        return send(res, 200, { ok: true });
      } catch { return send(res, 500, { error: 'Observația nu a putut fi ștearsă' }); }
    }
    readRequestJson(req, res, 40_000, body => {
      try {
        const store = readCrmStore();
        const index = store.observations.findIndex(item => item.id === id);
        if (index < 0) return send(res, 404, { error: 'Observația nu a fost găsită' });
        store.observations[index] = normalizeCrmObservation({ ...store.observations[index], ...body, id }, store.observations[index], new Set(store.children.map(child => child.id)), new Map(store.visits.map(visit => [visit.id, visit])));
        writeCrmStore(store);
        send(res, 200, store.observations[index]);
      } catch { send(res, 400, { error: 'Observația este invalidă' }); }
    });
    return;
  }
  const crmChildMatch = url.pathname.match(/^\/api\/admin\/crm\/children\/([^/?]+)$/);
  if (crmChildMatch && req.method === 'DELETE') {
    try {
      const store = readCrmStore();
      const id = decodeURIComponent(crmChildMatch[1]);
      const nextChildren = store.children.filter(item => item.id !== id);
      if (nextChildren.length === store.children.length) return send(res, 404, { error: 'Copilul nu a fost găsit' });
      store.children = nextChildren;
      const removedVisits=new Set(store.visits.filter(visit => visit.child_id === id).map(visit=>visit.id));
      store.visits = store.visits.filter(visit => visit.child_id !== id);
      store.observations = store.observations.filter(observation => observation.child_id !== id);
      store.child_companions=store.child_companions.filter(link=>link.child_id!==id);
      store.companion_observations=store.companion_observations.map(item=>removedVisits.has(item.visit_id)?{...item,visit_id:null}:item);
      writeCrmStore(store);
      return send(res, 200, { ok: true });
    } catch { return send(res, 500, { error: 'Profil indisponibil' }); }
  }
  if (crmChildMatch && req.method === 'PATCH') {
    readRequestJson(req, res, 20_000, body => {
      try {
        const store = readCrmStore();
        const index = store.children.findIndex(item => item.id === decodeURIComponent(crmChildMatch[1]));
        if (index < 0) return send(res, 404, { error: 'Copilul nu a fost găsit' });
        store.children[index] = normalizeCrmChild({ ...body, id:store.children[index].id }, store.children[index]);
        if(body?.primary_companion_id!==undefined){const companionId=String(body.primary_companion_id||'').trim();if(companionId&&!store.companions.some(item=>item.id===companionId))throw new Error('Companion invalid');store.child_companions=store.child_companions.filter(link=>!(link.child_id===store.children[index].id&&link.is_primary));if(companionId){const existing=store.child_companions.find(link=>link.child_id===store.children[index].id&&link.companion_id===companionId);if(existing)existing.is_primary=true;else store.child_companions.push({child_id:store.children[index].id,companion_id:companionId,is_primary:true,created_at:new Date().toISOString()});}
        }
        writeCrmStore(store);
        send(res, 200, crmChildSummary(store.children[index], store.visits));
      } catch { send(res, 400, { error: 'Profil invalid' }); }
    });
    return;
  }
  if (crmChildMatch && req.method === 'GET') {
    try {
      const store = readCrmStore();
      const child = store.children.find(item => item.id === decodeURIComponent(crmChildMatch[1]));
      if (!child) return send(res, 404, { error: 'Copilul nu a fost găsit' });
      const visits = store.visits.filter(visit => visit.child_id === child.id).sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.created_at.localeCompare(a.created_at));
      const observations = store.observations.filter(item => item.child_id === child.id).sort((a, b) => String(b.observed_at).localeCompare(String(a.observed_at)) || String(b.created_at).localeCompare(String(a.created_at)));
      const primaryLink=store.child_companions.find(link=>link.child_id===child.id&&link.is_primary);const companions=store.child_companions.filter(link=>link.child_id===child.id).map(link=>store.companions.find(item=>item.id===link.companion_id)).filter(Boolean).map(item=>({...item,is_primary:item.id===primaryLink?.companion_id}));
      return send(res, 200, { child: {...crmChildSummary(child, store.visits),primary_companion_id:primaryLink?.companion_id||null}, visits, observations, companions });
    } catch { return send(res, 500, { error: 'CRM unavailable' }); }
  }
  if (url.pathname === '/api/admin/calendar' && req.method === 'GET') {
    try { return send(res, 200, { entries: readCalendarEntries() }); }
    catch { return send(res, 500, { error: 'Calendar unavailable' }); }
  }
  if (url.pathname === '/api/admin/calendar' && req.method === 'POST') {
    readRequestJson(req, res, 40_000, body => {
      try {
        const entries = readCalendarEntries();
        const entry = normalizeCalendarEntry(body);
        entries.push(entry);
        entries.sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`));
        writeCalendarEntries(entries);
        send(res, 201, entry);
      } catch { send(res, 400, { error: 'Calendar entry invalid' }); }
    });
    return;
  }
  if (url.pathname === '/api/admin/calendar/week' && req.method === 'PUT') {
    readRequestJson(req, res, 120_000, body => {
      try {
        const dates = calendarWeekDates(String(body?.week_start || ''));
        if (!Array.isArray(body?.entries) || body.entries.length > 50) throw new Error('Calendar week invalid');
        const existing = readCalendarEntries();
        const weekEntries = body.entries.map(entry => normalizeCalendarEntry({ ...entry, date: String(entry.date || '') }));
        if (weekEntries.some(entry => !dates.includes(entry.date))) throw new Error('Calendar entry outside week');
        const next = [...existing.filter(entry => !dates.includes(entry.date)), ...weekEntries];
        next.sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`));
        writeCalendarEntries(next);
        send(res, 200, { entries: weekEntries });
      } catch { send(res, 400, { error: 'Calendar week invalid' }); }
    });
    return;
  }
  if (url.pathname.startsWith('/api/admin/calendar/') && ['PATCH', 'DELETE'].includes(req.method)) {
    const id = decodeURIComponent(url.pathname.slice('/api/admin/calendar/'.length));
    if (!id) return send(res, 400, { error: 'Calendar entry id missing' });
    if (req.method === 'DELETE') {
      try {
        const entries = readCalendarEntries();
        const next = entries.filter(entry => entry.id !== id);
        if (next.length === entries.length) return send(res, 404, { error: 'Calendar entry not found' });
        writeCalendarEntries(next);
        return send(res, 200, { ok: true });
      } catch { return send(res, 500, { error: 'Calendar unavailable' }); }
    }
    readRequestJson(req, res, 40_000, body => {
      try {
        const entries = readCalendarEntries();
        const index = entries.findIndex(entry => entry.id === id);
        if (index < 0) return send(res, 404, { error: 'Calendar entry not found' });
        entries[index] = normalizeCalendarEntry({ ...entries[index], ...body, id }, entries[index]);
        entries.sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`));
        writeCalendarEntries(entries);
        send(res, 200, entries.find(entry => entry.id === id));
      } catch { send(res, 400, { error: 'Calendar entry invalid' }); }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/event-survey/results') {
    try {
      const stored = fs.existsSync(EVENT_SURVEY_FILE) ? JSON.parse(fs.readFileSync(EVENT_SURVEY_FILE, 'utf8')) : [];
      const responses = (Array.isArray(stored) ? stored : []).map(row => ({
        id: row.id,
        submitted_at: row.submitted_at || row.submittedAt,
        answers: row.answers || {},
        duels: row.duels || [],
        concept_ranking: row.concept_ranking || row.conceptRanking || [],
        schema_version: row.schema_version || row.schemaVersion || 1
      })).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      return send(res, 200, { responses, generatedAt: new Date().toISOString() });
    } catch { return send(res, 500, { error: 'Survey results unavailable' }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/event-survey/funnel') {
    try {
      const events = fs.existsSync(EVENT_FUNNEL_FILE) ? JSON.parse(fs.readFileSync(EVENT_FUNNEL_FILE, 'utf8')) : [];
      return send(res, 200, { events: Array.isArray(events) ? events : [], generatedAt: new Date().toISOString() });
    } catch { return send(res, 500, { error: 'Survey funnel unavailable' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/event-survey/funnel') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 20_000) req.destroy(); });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw);
        if (!body || typeof body.sessionId !== 'string' || !['open', 'step', 'complete'].includes(body.eventType)) throw new Error('Invalid funnel event');
        const step = Number(body.step);
        if (!Number.isInteger(step) || step < 0 || step > 13) throw new Error('Invalid funnel step');
        const events = fs.existsSync(EVENT_FUNNEL_FILE) ? JSON.parse(fs.readFileSync(EVENT_FUNNEL_FILE, 'utf8')) : [];
        if (!Array.isArray(events)) throw new Error('Invalid funnel store');
        events.push({ id: crypto.randomUUID(), session_id: body.sessionId, event_type: body.eventType, step, section: body.section ?? null, milestone: body.milestone ?? null, duel_index: body.duelIndex ?? null, created_at: new Date().toISOString() });
        fs.mkdirSync(path.dirname(EVENT_FUNNEL_FILE), { recursive: true });
        fs.writeFileSync(EVENT_FUNNEL_FILE, JSON.stringify(events, null, 2));
        send(res, 201, { ok: true });
      } catch { send(res, 400, { error: 'Funnel event invalid' }); }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/event-survey') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 500_000) req.destroy(); });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw);
        if (!body || typeof body.answers !== 'object' || !Array.isArray(body.duels) || !Array.isArray(body.conceptRanking)) throw new Error('Invalid survey response');
        const responses = fs.existsSync(EVENT_SURVEY_FILE) ? JSON.parse(fs.readFileSync(EVENT_SURVEY_FILE, 'utf8')) : [];
        if (!Array.isArray(responses)) throw new Error('Invalid survey store');
        const entry = { id: crypto.randomUUID(), submittedAt: new Date().toISOString(), answers: body.answers, duels: body.duels, conceptRanking: body.conceptRanking, schemaVersion: 2 };
        responses.push(entry);
        fs.mkdirSync(path.dirname(EVENT_SURVEY_FILE), { recursive: true });
        fs.writeFileSync(EVENT_SURVEY_FILE, JSON.stringify(responses, null, 2));
        send(res, 201, { id: entry.id, submittedAt: entry.submittedAt });
      } catch { send(res, 400, { error: 'Survey response invalid' }); }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/playground-survey/results') {
    try {
      const responses = readArrayFile(PLAYGROUND_SURVEY_FILE).map(row => ({ id:row.id, submitted_at:row.submitted_at, answers:row.answers || {}, schema_version:row.schema_version || 1 })).sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      return send(res, 200, { responses, generatedAt:new Date().toISOString() });
    } catch { return send(res, 500, { error:'Playground survey results unavailable' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/playground-survey') {
    readRequestJson(req, res, 250_000, body => {
      if (!body?.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) return send(res, 400, { error:'Survey response invalid' });
      const entry = { id:crypto.randomUUID(), submitted_at:new Date().toISOString(), answers:body.answers, schema_version:1 };
      appendArrayFile(PLAYGROUND_SURVEY_FILE, entry);
      send(res, 201, { id:entry.id, submittedAt:entry.submitted_at });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/playground-survey/funnel') {
    try { return send(res, 200, { events:readArrayFile(PLAYGROUND_FUNNEL_FILE), generatedAt:new Date().toISOString() }); }
    catch { return send(res, 500, { error:'Playground funnel unavailable' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/playground-survey/funnel') {
    readRequestJson(req, res, 20_000, body => {
      const step = Number(body?.step);
      if (typeof body?.sessionId !== 'string' || !['open','step','complete'].includes(body.eventType) || !Number.isInteger(step) || step < 0 || step > 10) return send(res, 400, { error:'Funnel event invalid' });
      appendArrayFile(PLAYGROUND_FUNNEL_FILE, { id:crypto.randomUUID(), session_id:body.sessionId, event_type:body.eventType, step, section:body.section ?? null, created_at:new Date().toISOString() });
      send(res, 201, { ok:true });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/playground-survey/raffle') {
    try { return send(res, 200, { entries:readArrayFile(PLAYGROUND_RAFFLE_FILE), generatedAt:new Date().toISOString() }); }
    catch { return send(res, 500, { error:'Raffle entries unavailable' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/playground-survey/raffle') {
    readRequestJson(req, res, 20_000, body => {
      const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
      const phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
      if (!firstName || firstName.length > 60 || phone.length < 9 || phone.length > 15 || body.consent !== true) return send(res, 400, { error:'Raffle entry invalid' });
      const drawMonth = `${new Date().toISOString().slice(0,7)}-01`;
      const entries = readArrayFile(PLAYGROUND_RAFFLE_FILE);
      if (!entries.some(entry => entry.phone === phone && entry.draw_month === drawMonth)) {
        entries.push({ id:crypto.randomUUID(), first_name:firstName, phone, draw_month:drawMonth, created_at:new Date().toISOString() });
        fs.mkdirSync(path.dirname(PLAYGROUND_RAFFLE_FILE), { recursive:true });
        fs.writeFileSync(PLAYGROUND_RAFFLE_FILE, JSON.stringify(entries, null, 2));
      }
      send(res, 201, { ok:true });
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/carousel/image') {
    readRequestJson(req, res, 30_000, async body => {
      try {
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        const quality = ['low', 'medium', 'high'].includes(body?.quality) ? body.quality : 'medium';
        if (!prompt || prompt.length > 8_000) return send(res, 400, { error: 'Descrierea imaginii este invalidă' });
        send(res, 200, await generateCarouselArtwork(localSecret('OPENAI_API_KEY'), prompt, quality, body?.transparent === true));
      } catch (error) {
        send(res, error.status || 500, { error: error.message || 'Generarea imaginii nu a reușit' });
      }
    });
    return;
  }
  if (url.pathname === '/api/admin/content-lab/ideas' && req.method === 'GET') {
    try { const status = String(url.searchParams.get('status') || '').trim(); if (status && !CONTENT_LAB_IDEA_STATUSES.includes(status)) return send(res, 400, { error: 'Filtru invalid' }); return send(res, 200, { ideas: readContentLabIdeas().filter(item => !status || item.status === status).sort((a, b) => `${b.updated_at}${b.created_at}`.localeCompare(`${a.updated_at}${a.created_at}`)) }); } catch { return send(res, 500, { error: 'Ideile Content Lab nu sunt disponibile' }); }
  }
  if (url.pathname === '/api/admin/event-community/findings' && req.method === 'GET') {
    try { const kind = String(url.searchParams.get('kind') || '').trim(); if (kind && !EVENT_FINDING_KINDS.includes(kind)) return send(res, 400, { error: 'Filtru invalid' }); return send(res, 200, { findings: readJsonStore(ADMIN_EVENT_FINDINGS_FILE, 'event findings').filter(item => !kind || item.kind === kind).sort((a, b) => `${b.updated_at}${b.created_at}`.localeCompare(`${a.updated_at}${a.created_at}`)) }); } catch { return send(res, 500, { error: 'Findings nu sunt disponibile' }); }
  }
  if (url.pathname === '/api/admin/event-community/findings' && req.method === 'POST') { readRequestJson(req, res, 50_000, body => { try { const items = readJsonStore(ADMIN_EVENT_FINDINGS_FILE, 'event findings'); const item = normalizeEventFinding(body); items.push(item); writeJsonStore(ADMIN_EVENT_FINDINGS_FILE, items); send(res, 201, item); } catch { send(res, 400, { error: 'Finding invalid' }); } }); return; }
  const eventFindingMatch = url.pathname.match(/^\/api\/admin\/event-community\/findings\/([^/?]+)$/);
  if (eventFindingMatch && ['PATCH', 'DELETE'].includes(req.method)) { const id = decodeURIComponent(eventFindingMatch[1]); if (req.method === 'DELETE') { try { const items = readJsonStore(ADMIN_EVENT_FINDINGS_FILE, 'event findings'); const next = items.filter(item => item.id !== id); if (next.length === items.length) return send(res, 404, { error: 'Finding not found' }); writeJsonStore(ADMIN_EVENT_FINDINGS_FILE, next); return send(res, 200, { ok: true }); } catch { return send(res, 500, { error: 'Finding could not be deleted' }); } } readRequestJson(req, res, 50_000, body => { try { const items = readJsonStore(ADMIN_EVENT_FINDINGS_FILE, 'event findings'); const index = items.findIndex(item => item.id === id); if (index < 0) return send(res, 404, { error: 'Finding not found' }); items[index] = normalizeEventFinding({ ...items[index], ...body, id }, items[index]); writeJsonStore(ADMIN_EVENT_FINDINGS_FILE, items); send(res, 200, items[index]); } catch { send(res, 400, { error: 'Finding invalid' }); } }); return; }
  if (url.pathname === '/api/admin/knowledge-candidates' && req.method === 'GET') { try { const target = String(url.searchParams.get('target') || '').trim(); const status = String(url.searchParams.get('status') || '').trim(); if ((target && !KNOWLEDGE_CANDIDATE_TARGETS.includes(target)) || (status && !KNOWLEDGE_CANDIDATE_STATUSES.includes(status))) return send(res, 400, { error: 'Filtru invalid' }); return send(res, 200, { candidates: readJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE, 'knowledge candidates').filter(item => (!target || item.target === target) && (!status || item.status === status)).sort((a, b) => `${b.updated_at}${b.created_at}`.localeCompare(`${a.updated_at}${a.created_at}`)) }); } catch { return send(res, 500, { error: 'Knowledge candidates nu sunt disponibile' }); } }
  if (url.pathname === '/api/admin/knowledge-candidates' && req.method === 'POST') { readRequestJson(req, res, 50_000, body => { try { const items = readJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE, 'knowledge candidates'); const item = normalizeKnowledgeCandidate(body); items.push(item); writeJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE, items); send(res, 201, item); } catch { send(res, 400, { error: 'Knowledge candidate invalid' }); } }); return; }
  const knowledgeCandidateMatch = url.pathname.match(/^\/api\/admin\/knowledge-candidates\/([^/?]+)$/);
  if (knowledgeCandidateMatch && ['PATCH', 'DELETE'].includes(req.method)) { const id = decodeURIComponent(knowledgeCandidateMatch[1]); if (req.method === 'DELETE') { try { const items = readJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE, 'knowledge candidates'); const next = items.filter(item => item.id !== id); if (next.length === items.length) return send(res, 404, { error: 'Candidate not found' }); writeJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE, next); return send(res, 200, { ok: true }); } catch { return send(res, 500, { error: 'Candidate could not be deleted' }); } } readRequestJson(req, res, 50_000, body => { try { const items = readJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE, 'knowledge candidates'); const index = items.findIndex(item => item.id === id); if (index < 0) return send(res, 404, { error: 'Candidate not found' }); items[index] = normalizeKnowledgeCandidate({ ...items[index], ...body, id }, items[index]); writeJsonStore(ADMIN_KNOWLEDGE_CANDIDATES_FILE, items); send(res, 200, items[index]); } catch { send(res, 400, { error: 'Knowledge candidate invalid' }); } }); return; }
  if (url.pathname === '/api/admin/content-lab/ideas' && req.method === 'POST') {
    readRequestJson(req, res, 40_000, body => { try { const ideas = readContentLabIdeas(); const idea = normalizeContentLabIdea(body); ideas.push(idea); writeContentLabIdeas(ideas); send(res, 201, idea); } catch { send(res, 400, { error: 'Ideea Content Lab este invalidă' }); } }); return;
  }
  const contentLabIdeaMatch = url.pathname.match(/^\/api\/admin\/content-lab\/ideas\/([^/?]+)$/);
  if (contentLabIdeaMatch && ['PATCH', 'DELETE'].includes(req.method)) {
    const id = decodeURIComponent(contentLabIdeaMatch[1]);
    if (req.method === 'DELETE') { try { const ideas = readContentLabIdeas(); const next = ideas.filter(item => item.id !== id); if (next.length === ideas.length) return send(res, 404, { error: 'Ideea nu a fost găsită' }); writeContentLabIdeas(next); return send(res, 200, { ok: true }); } catch { return send(res, 500, { error: 'Ideea nu a putut fi ștearsă' }); } }
    readRequestJson(req, res, 40_000, body => { try { const ideas = readContentLabIdeas(); const index = ideas.findIndex(item => item.id === id); if (index < 0) return send(res, 404, { error: 'Ideea nu a fost găsită' }); ideas[index] = normalizeContentLabIdea({ ...ideas[index], ...body, id }, ideas[index]); writeContentLabIdeas(ideas); send(res, 200, ideas[index]); } catch { send(res, 400, { error: 'Ideea Content Lab este invalidă' }); } }); return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/carousel/plan') {
    readRequestJson(req, res, 40_000, async body => {
      try {
        const context = typeof body?.context === 'string' ? body.context.trim() : '';
        if (!context || context.length > 12_000) return send(res, 400, { error: 'Contextul postării este invalid' });
        const mode = body?.mode === 'story-of-day' ? 'story-of-day' : 'standard';
        send(res, 200, await generateCarouselPlan(localSecret('OPENAI_API_KEY'), context, body?.brand || {}, mode));
      } catch (error) {
        send(res, error.status || 500, { error: error.message || 'Draftul carouselului nu a putut fi construit' });
      }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/story-candidates') {
    readRequestJson(req, res, 40_000, async body => {
      try {
        const noteText = typeof body?.note_text === 'string' ? body.note_text.trim() : '';
        if (!noteText || noteText.length > 12_000) return send(res, 400, { error: 'Nota este invalidă' });
        send(res, 200, await generateStoryCandidates(localSecret('OPENAI_API_KEY'), noteText));
      } catch (error) { send(res, error.status || 500, { error: error.message || 'Poveștile nu au putut fi extrase' }); }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/carousel/edit') {
    readRequestJson(req, res, 30_000, async body => {
      try {
        const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';
        if (!instruction || instruction.length > 2_000 || !body?.slide || typeof body.slide !== 'object') return send(res, 400, { error: 'Instrucțiunea pentru slide este invalidă' });
        send(res, 200, await editCarouselSlide(localSecret('OPENAI_API_KEY'), instruction, body.slide));
      } catch (error) {
        send(res, error.status || 500, { error: error.message || 'Content Assistant nu este disponibil' });
      }
    });
    return;
  }
  if (req.method === 'PUT' && url.pathname === '/api/workspaces') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 12_000_000) req.destroy(); });
    req.on('end', () => {
      try {
        const next = JSON.parse(raw);
        if (!Array.isArray(next.workspaces)) throw new Error('Invalid workspaces');
        next.updatedAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(WORKSPACES_FILE), { recursive: true });
        fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(next, null, 2));
        send(res, 200, next);
      } catch { send(res, 400, { error: 'Workspaces invalid' }); }
    });
    return;
  }
  if (req.method === 'PUT' && url.pathname === '/api/styles') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw);
        if (typeof body.css !== 'string') throw new Error('Invalid CSS');
        fs.mkdirSync(path.dirname(CSS_FILE), { recursive: true });
        fs.writeFileSync(CSS_FILE, body.css);
        send(res, 200, { css: body.css, updatedAt: new Date().toISOString() });
      } catch { send(res, 400, { error: 'CSS invalid' }); }
    });
    return;
  }
  if (req.method === 'PUT' && url.pathname === '/api/manual') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 5_000_000) req.destroy(); });
    req.on('end', () => {
      try {
        const next = JSON.parse(raw);
        if (!Array.isArray(next.blocks)) throw new Error('Invalid document');
        next.updatedAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2));
        send(res, 200, next);
      } catch { send(res, 400, { error: 'Document invalid' }); }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/manual/download') {
    const doc = readDocument();
    const customCss = fs.existsSync(CSS_FILE) ? fs.readFileSync(CSS_FILE, 'utf8') : '';
    const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${doc.title}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mali:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap"><style>body{font:16px 'Nunito',sans-serif;max-width:820px;margin:50px auto;line-height:1.6;color:#243447}h1,h2,h3{font-family:'Mali',sans-serif;font-weight:500;color:#168F9F}.manual-content .chapter-number{font-family:'Nunito',sans-serif;font-weight:700;color:#FB7176}li{margin:.35rem 0}</style><style>${customCss}</style></head><body><main class="manual-content"><h1>${doc.title}</h1>${doc.blocks.map(b => b.html).join('\n')}</main></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': 'attachment; filename="becky-friends-manual.html"' });
    return res.end(html);
  }
  serve(res, url.pathname);
});

server.listen(PORT, () => console.log(`Becky Friends admin running at http://localhost:${PORT}/admin`));
