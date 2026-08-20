export const DESTINATIONS = ['activity_observation', 'crm_child_observation', 'monthly_report_entry', 'task', 'content_lab_idea', 'event_community_finding', 'knowledge_candidate'];
export const EXECUTABLE_DESTINATIONS = ['activity_observation', 'crm_child_observation', 'monthly_report_entry'];
export const PROPOSAL_STATUSES = ['pending', 'approved', 'ignored', 'failed', 'reverted'];
export const RESOLUTION_STATUSES = ['resolved', 'ambiguous', 'not_found'];
export const PROVENANCE_SOURCES = ['note', 'system', 'becky', 'missing'];
export const ACTIVITY_AGES = ['1–2 ani', '3–4 ani', '5–6 ani', '7–8 ani', '9+ ani'];
export const ACTIVITY_PARTICIPANTS = ['Individual', '2–3 copii', '4–9 copii', '10+ copii'];
export const ACTIVITY_RESULTS = ['A mers bine', 'Mixt', 'Nu a mers'];
export const MONTHLY_ENTRY_TYPES = ['done', 'evidence', 'learned'];
export const MONTHLY_ROLES = ['experienta-copilului', 'relatia-cu-parintii', 'design-pedagogic', 'cultura-experienta-becky', 'marketing-comunicare', 'sisteme-tehnologie', 'operatiuni-logistica', 'strategie-dezvoltare'];

const clean = value => String(value ?? '').trim();
const normalizedName = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ro').replace(/[^a-z0-9]+/g, ' ').trim();
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const stableStringify = value => JSON.stringify(stable(value));
export async function sha256(value) { const bytes = new TextEncoder().encode(String(value)); const digest = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
export function participantBucket(count) { const number = Number(count); if (!Number.isFinite(number) || number < 1) return null; if (number === 1) return 'Individual'; if (number <= 3) return '2–3 copii'; if (number <= 9) return '4–9 copii'; return '10+ copii'; }
export function ageCategory(age) { const number = Number(age); if (!Number.isFinite(number) || number < 1) return null; if (number <= 2) return '1–2 ani'; if (number <= 4) return '3–4 ani'; if (number <= 6) return '5–6 ani'; if (number <= 8) return '7–8 ani'; return '9+ ani'; }
function exactMatches(name, items, labelKey) { const sought = normalizedName(name); if (!sought) return []; return items.filter(item => normalizedName(item[labelKey]) === sought); }
function provenanceMap(list = []) { return Object.fromEntries((Array.isArray(list) ? list : []).filter(item => item?.field).map(item => [clean(item.field), { source: PROVENANCE_SOURCES.includes(item.source) ? item.source : 'missing', detail: clean(item.detail) }])); }
function sourceFor(map, field, fallback = 'missing') { return map[field]?.source || fallback; }
function provenance(source, detail = '') { return { source: PROVENANCE_SOURCES.includes(source) ? source : 'missing', detail: clean(detail) }; }
function exactExcerpt(excerpt, noteText) { const value = clean(excerpt); return value && clean(noteText).includes(value) ? value : ''; }
function resolutionFor(targetName, matches) { if (matches.length === 1) return 'resolved'; if (matches.length > 1) return 'ambiguous'; return 'not_found'; }
function noteSupportsAge(value, noteText) {
  const note = normalizedName(noteText); const canonical = normalizedName(value);
  if (note.includes(canonical)) return true;
  const numbers = canonical.match(/\d+/g) || [];
  return numbers.length > 0 && numbers.every(number => new RegExp(`(^|\\D)${number}(\\D|$)`).test(note));
}
function participantEvidence(value, excerpt, noteText) {
  const evidence = normalizedName(excerpt || noteText);
  if (normalizedName(value) === 'individual') return /\b(singur|singura|individual)\b/.test(evidence) ? 'note' : 'missing';
  if (evidence.includes(normalizedName(value))) return 'note';
  const words = { unu:1,unul:1,o:1,doi:2,doua:2,trei:3,patru:4,cinci:5,sase:6,sapte:7,opt:8,noua:9,zece:10 };
  const direct = evidence.match(/\b(\d+|unu|unul|o|doi|doua|trei|patru|cinci|sase|sapte|opt|noua|zece)\s+(copil|copii)\b/);
  if (!direct) return 'missing';
  const count = /^\d+$/.test(direct[1]) ? Number(direct[1]) : words[direct[1]];
  const source = participantBucket(count) === value ? 'note' : 'becky';
  return new RegExp(`\\binca\\s+${direct[1]}\\b`).test(evidence) ? 'becky' : source;
}
function validatedSource(stated, field, fallback, supported) {
  const requested = sourceFor(stated, field, fallback);
  if (requested === 'note' && !supported) return 'missing';
  return requested;
}

export function resolveAiProposal(raw, context) {
  const destination = DESTINATIONS.includes(raw?.destination) ? raw.destination : '';
  const operation = clean(raw?.operation);
  const source_excerpt = exactExcerpt(raw?.source_excerpt, context.note_text);
  const suggested = raw?.payload && typeof raw.payload === 'object' ? raw.payload : {};
  const stated = provenanceMap(raw?.field_provenance);
  const targetName = clean(raw?.target_candidate);
  const payload = {}; const field_provenance = {}; let target_entity_type = null; let target_entity_id = null; let target_candidates = []; let resolution_status = 'not_found';
  if (destination === 'activity_observation') {
    target_entity_type = 'activity'; const matches = exactMatches(targetName, context.activities || [], 'title'); target_candidates = matches.map(item => ({ id: item.id, label: item.title })); resolution_status = resolutionFor(targetName, matches); if (matches.length === 1) target_entity_id = matches[0].id;
    payload.activity_id = target_entity_id; payload.tested_at = context.note_date; field_provenance.tested_at = provenance('system', 'Data notei'); field_provenance.activity_id = target_entity_id ? provenance('system', 'Activitate identificată fără ambiguitate') : provenance('missing', targetName ? 'Activitatea este ambiguă sau nu există' : 'Selectează activitatea');
    const explicitAges = Array.isArray(suggested.age_categories) ? suggested.age_categories.filter(value => ACTIVITY_AGES.includes(value) && noteSupportsAge(value, context.note_text)) : [];
    const namedChildren = (Array.isArray(raw?.child_candidates) ? raw.child_candidates : []).flatMap(name => exactMatches(name, context.children || [], 'first_name'));
    const derivedAges = [...new Set(namedChildren.map(child => ageCategory(child.age)).filter(Boolean))];
    payload.age_categories = explicitAges.length ? explicitAges : derivedAges; field_provenance.age_categories = provenance(explicitAges.length ? 'note' : derivedAges.length ? 'system' : 'missing', explicitAges.length ? 'Categoria de vârstă apare explicit în notă' : derivedAges.length ? 'Derivat din vârstele copiilor identificați' : 'Selectează vârsta');
    const suggestedParticipants = ACTIVITY_PARTICIPANTS.includes(suggested.participants) ? suggested.participants : participantBucket(suggested.participant_count); const participantSource = suggestedParticipants ? participantEvidence(suggestedParticipants, source_excerpt, context.note_text) : 'missing';
    payload.participants = participantSource !== 'missing' ? suggestedParticipants : null; field_provenance.participants = provenance(participantSource, participantSource === 'note' ? 'Numărul este explicit în fragmentul sursă' : participantSource === 'becky' ? 'Categoria este dedusă din numerele menționate în notă' : 'Selectează numărul participanților');
    payload.result = ACTIVITY_RESULTS.includes(suggested.result) ? suggested.result : null; field_provenance.result = provenance(payload.result ? sourceFor(stated, 'result', 'becky') : 'missing');
    payload.observed = clean(suggested.observed); payload.interpreted = clean(suggested.interpreted); payload.hypothesized = clean(suggested.hypothesized); payload.action = clean(suggested.action); payload.capacity = clean(suggested.capacity); payload.behaviors = [];
    for (const field of ['observed','interpreted','hypothesized','action','capacity']) field_provenance[field] = provenance(payload[field] ? validatedSource(stated, field, field === 'observed' ? 'note' : 'becky', Boolean(source_excerpt)) : 'missing', payload[field] && sourceFor(stated, field) === 'note' && !source_excerpt ? 'Fragmentul nu a putut fi verificat în nota sursă' : '');
  } else if (destination === 'crm_child_observation') {
    target_entity_type = 'crm_child'; const matches = exactMatches(targetName, context.children || [], 'first_name'); target_candidates = matches.map(item => ({ id: item.id, label: item.first_name })); resolution_status = resolutionFor(targetName, matches); if (matches.length === 1) target_entity_id = matches[0].id;
    payload.child_id = target_entity_id; payload.visit_id = null; payload.observed_at = `${context.note_date}T12:00:00.000Z`; payload.observation = clean(suggested.observation || suggested.observed); field_provenance.child_id = target_entity_id ? provenance('system', 'Copil identificat fără ambiguitate') : provenance('missing', targetName ? 'Numele este ambiguu sau nu există' : 'Selectează copilul'); field_provenance.observed_at = provenance('system', 'Data notei'); field_provenance.observation = provenance(payload.observation && source_excerpt ? 'note' : 'missing', source_excerpt ? 'Susținut de fragmentul exact al notei' : 'Fragmentul nu a putut fi verificat în nota sursă');
  } else if (destination === 'monthly_report_entry') {
    target_entity_type = 'monthly_report'; resolution_status = 'resolved'; payload.month_key = context.note_date.slice(0, 7); payload.entry_date = context.note_date; payload.type = MONTHLY_ENTRY_TYPES.includes(suggested.type) ? suggested.type : null; payload.text = clean(suggested.text); payload.role_ids = Array.isArray(suggested.role_ids) ? [...new Set(suggested.role_ids.filter(id => MONTHLY_ROLES.includes(id)))] : []; payload.source_type = 'daily_note'; payload.source_id = context.note_date;
    field_provenance.entry_date = provenance('system', 'Data notei'); field_provenance.type = provenance(payload.type ? sourceFor(stated, 'type', 'becky') : 'missing'); field_provenance.text = provenance(payload.text ? sourceFor(stated, 'text', 'becky') : 'missing'); field_provenance.role_ids = provenance(payload.role_ids.length ? sourceFor(stated, 'role_ids', 'becky') : 'missing');
  }
  return { destination, operation, source_excerpt, target_entity_type, target_entity_id, target_candidates, resolution_status, resolution_query:targetName || null, payload, field_provenance };
}

export function validateProposedChange(change) {
  const errors = []; const payload = change?.payload || {};
  if (!EXECUTABLE_DESTINATIONS.includes(change?.destination)) errors.push('Destinația nu este executabilă în V1.');
  if (change?.destination === 'activity_observation') { if (!payload.activity_id) errors.push('Selectează activitatea.'); if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.tested_at || '')) errors.push('Completează data testării.'); if (!Array.isArray(payload.age_categories) || !payload.age_categories.length || payload.age_categories.some(value => !ACTIVITY_AGES.includes(value))) errors.push('Selectează cel puțin o categorie de vârstă.'); if (!ACTIVITY_PARTICIPANTS.includes(payload.participants)) errors.push('Completează numărul participanților.'); if (!ACTIVITY_RESULTS.includes(payload.result)) errors.push('Completează rezultatul testării.'); if (!clean(payload.observed)) errors.push('Completează observația factuală.'); }
  if (change?.destination === 'crm_child_observation') { if (!payload.child_id) errors.push('Selectează copilul.'); if (!payload.observed_at || Number.isNaN(new Date(payload.observed_at).getTime())) errors.push('Completează data observației.'); if (!clean(payload.observation)) errors.push('Completează observația factuală.'); }
  if (change?.destination === 'monthly_report_entry') { if (!/^\d{4}-\d{2}$/.test(payload.month_key || '')) errors.push('Luna raportului lipsește.'); if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.entry_date || '')) errors.push('Data intrării lipsește.'); if (!MONTHLY_ENTRY_TYPES.includes(payload.type)) errors.push('Alege tipul intrării.'); if (!clean(payload.text)) errors.push('Completează textul intrării.'); if (!Array.isArray(payload.role_ids) || !payload.role_ids.length || payload.role_ids.some(id => !MONTHLY_ROLES.includes(id))) errors.push('Alege cel puțin un rol valid.'); }
  return errors;
}
export async function proposalDedupeKey(change) {
  const payload = { ...(change.payload || {}) };
  for (const key of ['age_categories', 'role_ids']) {
    if (Array.isArray(payload[key])) payload[key] = [...new Set(payload[key].map(String))].sort();
  }
  return sha256(stableStringify({
    source_type: change.source_type,
    source_id: change.source_id,
    source_hash: change.source_hash,
    destination: change.destination,
    operation: change.operation,
    target_entity_id: change.target_entity_id || null,
    payload
  }));
}
export function canonicalExecutionPayload(change) { const payload = structuredClone(change.payload || {}); if (change.destination === 'activity_observation') return payload; if (change.destination === 'crm_child_observation') return payload; if (change.destination === 'monthly_report_entry') return { ...payload, source_type: 'daily_note', source_id: change.source_id }; throw new Error('Executor indisponibil în V1'); }
