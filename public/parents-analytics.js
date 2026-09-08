// Anonymous interaction telemetry. Never receives names, answers or profile data.
const KEY = 'becky-parents-analytics:v1';
let memory = [];
try { memory = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}
if (!Array.isArray(memory)) memory = [];
memory = memory.filter(event => event && Date.parse(event.occurred_at) > Date.now() - 89 * 86400000);
let sending = false;
let visit = null;
let visibleSince = document.hidden ? null : performance.now();
let visibleMs = 0;
const id = () => crypto.randomUUID();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch {} };
const elapsed = () => Math.round(visibleMs + (visibleSince === null ? 0 : performance.now() - visibleSince));
export function emit(event_name, details = {}) {
  try {
    memory.push({ id: id(), event_name, occurred_at: new Date().toISOString(), session_id: pageSession, app_version: 'parents-188',
      visit_id: visit?.id || null, activity_id: visit?.activity || null,
      viewport: innerWidth > innerHeight ? 'landscape' : 'portrait',
      display_mode: matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'installed' : 'browser',
      is_test: ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || localStorage.getItem('becky-parents-analytics-test') === 'true',
      ...details });
    // Bounded offline storage: telemetry must never exhaust storage used by progress.
    memory = memory.slice(-1000);
    persist();
  } catch { /* Analytics must never stop an activity. */ }
}
const pageSession = id();
export function openVisit(activity) {
  closeVisit('switch');
  visit = { id: id(), activity, started: false, completed: false };
  visibleMs = 0; visibleSince = document.hidden ? null : performance.now();
  emit('info_view');
}
export function startVisit(activity, resumed) {
  if (!visit || visit.activity !== activity) openVisit(activity);
  if (visit.started) return;
  visit.started = true;
  emit('activity_start', { resumed: Boolean(resumed), visible_ms: elapsed() });
}
export function completeVisit(activity) {
  if (visit?.activity !== activity || visit.completed) return;
  visit.completed = true;
  emit('activity_complete', { visible_ms: elapsed() });
}
export function closeVisit(reason = 'back') {
  if (!visit) return;
  emit('activity_exit', { reason, visible_ms: elapsed() });
  visit = null;
}
export async function flush() {
  if (sending || !memory.length || !navigator.onLine) return;
  sending = true;
  const batch = memory.slice(0, 10);
  try {
    const response = await fetch('/api/parents/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: batch }), keepalive: true });
    if (!response.ok) return;
    const sent = new Set(batch.map(event => event.id));
    memory = memory.filter(event => !sent.has(event.id)); persist();
  } catch { /* Retry with the same IDs, including after a reload. */ }
  finally { sending = false; }
}
setInterval(flush, 5000);
window.addEventListener('online', flush);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    visibleMs = elapsed(); visibleSince = null;
    if (visit) emit('visibility_hidden', { visible_ms: elapsed() });
    flush();
  } else { visibleSince = performance.now(); if (visit) emit('visibility_visible'); }
});
window.addEventListener('pagehide', () => { if (visit) emit('page_leave', { visible_ms: elapsed() }); flush(); });
// Only fixed action names are collected, never labels or DOM text.
document.addEventListener('click', event => {
  const button = event.target.closest?.('button');
  if (!button || !visit) return;
  const help = ['data-pass-forgot', 'data-sound-forgot', 'data-sound-hint1', 'data-sound-hint2', 'data-expression-reveal'];
  const action = help.find(attribute => button.hasAttribute(attribute));
  if (action) emit('help_used', { action });
}, true);
window.addEventListener('error', event => {
  if (event.filename && !event.filename.startsWith(location.origin)) return;
  emit('technical_error', { action: 'javascript', line: Number(event.lineno) || 0 });
});
flush();
