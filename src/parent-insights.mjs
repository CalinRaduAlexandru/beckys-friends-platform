const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const names = new Set(['info_view','activity_start','activity_complete','activity_exit','visibility_hidden','visibility_visible','page_leave','choice_view','choice_selected','choice_skip','help_used','technical_error','screen_view',
  'session_start','session_end','activity_info_viewed','activity_started_from_info','question_view_manual','question_exit_manual','question_rating_selected','activity_questions_completed',
  'mini_quiz_question_viewed','mini_quiz_question_skipped','mini_quiz_answer_revealed','mini_quiz_result','mini_quiz_exit','music_game_round_started','music_game_round_completed','music_game_stopped','music_game_exit',
  'activity_changed_in_game','activity_dock_opened','activity_dock_closed','activity_view_manual','activity_engaged_manual','group_size_changed','music_game_viewed','dramatic_entry_viewed',
  'animal_sound_view_manual','animal_sound_exit','animal_sound_play','animal_answer_correct','animal_answer_wrong','animal_sound_round_complete']);
const text = (value, max = 120) => typeof value === 'string' ? value.slice(0, max) : '';
export function normalizeEvents(body, now = Date.now()) {
  if (!Array.isArray(body?.events) || !body.events.length || body.events.length > 25) throw new Error('Lot invalid');
  return body.events.map(event => {
    const time = Date.parse(event.occurred_at);
    if (!UUID.test(event.id) || !UUID.test(event.session_id) || (event.visit_id && !UUID.test(event.visit_id)) || !names.has(event.event_name) || !Number.isFinite(time) || time > now + 300000 || time < now - 90 * 86400000) throw new Error('Eveniment invalid');
    const details = {};
    for (const key of ['set_id','question_id','reason','action','screen','result','group_size','app_version']) if (typeof event[key] === 'string') details[key] = text(event[key]);
    for (const key of ['question_index','rating','player_count','line']) if (Number.isFinite(event[key])) details[key] = Math.max(0, Math.min(100000, event[key]));
    if (Number.isFinite(event.visible_ms)) details.visible_ms = Math.max(0, Math.min(86400000, Math.round(event.visible_ms)));
    if (typeof event.resumed === 'boolean') details.resumed = event.resumed;
    if (event.event_name === 'choice_view') {
      if (!event.set_id || !Array.isArray(event.options) || event.options.length < 1 || event.options.length > 3 || new Set(event.options.map(q => q.id)).size !== event.options.length) throw new Error('Set invalid');
      details.options = event.options.map(q => ({ id: text(q.id), text: text(q.text, 1000), role: text(q.role, 30) }));
      if (details.options.some(q => !q.id || !q.text)) throw new Error('Întrebare invalidă');
    }
    if (['choice_selected','choice_skip'].includes(event.event_name) && !details.set_id) throw new Error('Set lipsă');
    return { id: event.id, event_name: event.event_name, session_id: event.session_id, visit_id: event.visit_id || null,
      activity_id: text(event.activity_id) || null, occurred_at: new Date(time).toISOString(), is_test: event.is_test === true,
      viewport: event.viewport === 'landscape' ? 'landscape' : 'portrait', display_mode: event.display_mode === 'installed' ? 'installed' : 'browser', details };
  });
}
const median = values => { const sorted = values.filter(Number.isFinite).sort((a,b) => a-b); const i = Math.floor(sorted.length/2); return sorted.length ? Math.round(sorted.length % 2 ? sorted[i] : (sorted[i-1]+sorted[i])/2) : null; };
const rate = (a,b) => b ? Math.round(a/b*1000)/10 : null;
export function buildInsights(input) {
  const events = [...new Map(input.map(event => [event.id, event])).values()].sort((a,b) => a.occurred_at.localeCompare(b.occurred_at));
  const activities = new Map(), visits = new Map(), sets = new Map(), questions = new Map(), screens = new Map();
  const activity = id => { if (!activities.has(id)) activities.set(id, { activity_id:id, info:0, starts:0, resumed:0, completed:0, exits:0, interrupted:0, open:0, help:0, errors:0, quiz_skips:0, quiz_correct:0, quiz_results:0, sets:0, skips:0, choices:0, durations:[], screens:[] }); return activities.get(id); };
  for (const event of events) {
    if (!event.activity_id) continue;
    const a = activity(event.activity_id), d = event.details || {};
    if (event.visit_id) {
      if (!visits.has(event.visit_id)) visits.set(event.visit_id, { activity_id:event.activity_id, start:null, info:false, completed:false, exit:false, interrupted:false, ms:0, screen:null });
      const v = visits.get(event.visit_id);
      if (event.event_name === 'info_view') v.info = true;
      if (event.event_name === 'activity_start') v.start ||= event;
      if (event.event_name === 'activity_complete') { v.completed = true; v.completedMs = d.visible_ms; }
      if (event.event_name === 'activity_exit') v.exit = true;
      if (['page_leave','visibility_hidden'].includes(event.event_name)) v.interrupted = true;
      if (['screen_view','activity_start','choice_view','visibility_visible'].includes(event.event_name)) v.interrupted = false;
      if (event.event_name === 'screen_view') {
        v.screen = d.screen;
        const key = `${event.activity_id}:${d.screen}`;
        if (!screens.has(key)) screens.set(key, { activity_id:event.activity_id, screen:d.screen, visits:new Set(), exits:0 });
        screens.get(key).visits.add(event.visit_id);
      }
      if (Number.isFinite(d.visible_ms)) v.ms = Math.max(v.ms,d.visible_ms);
    }
    if (event.event_name === 'help_used') a.help++;
    if (event.event_name === 'technical_error') a.errors++;
    if (event.event_name === 'mini_quiz_question_skipped') a.quiz_skips++;
    if (event.event_name === 'mini_quiz_result') { a.quiz_results++; if(d.result === 'you') a.quiz_correct++; }
    if (event.event_name === 'choice_view') {
      const key = `${event.visit_id}:${d.set_id}`;
      if (!sets.has(key)) sets.set(key, { activity_id:event.activity_id, session_id:event.session_id, options:d.options || [], decision:null });
    }
  }
  // Match independently of delivery order: offline retries can arrive later.
  let unmatchedChoices = 0;
  for (const event of events) {
    if (!['choice_selected','choice_skip'].includes(event.event_name)) continue;
    const d = event.details || {}, set = sets.get(`${event.visit_id}:${d.set_id}`);
    if (!set) { unmatchedChoices++; continue; }
    if (set.decision || (event.event_name === 'choice_selected' && !set.options.some(q => q.id === d.question_id))) continue;
    set.decision = event.event_name === 'choice_skip' ? 'skip' : d.question_id;
  }
  for (const v of visits.values()) {
    const a = activity(v.activity_id);
    if (v.info) a.info++;
    if (!v.start) continue;
    a.starts++;
    if (v.start.details?.resumed) a.resumed++;
    if (v.completed) { a.completed++; if(Number.isFinite(v.completedMs)) a.durations.push(Math.max(0, v.completedMs-(v.start.details?.visible_ms || 0))); }
    else if (v.exit) a.exits++;
    else if (v.interrupted) a.interrupted++;
    else a.open++;
    if (!v.completed && v.exit && v.screen) { const screen = screens.get(`${v.activity_id}:${v.screen}`); if(screen) screen.exits++; }
  }
  for (const set of sets.values()) {
    const a = activity(set.activity_id); a.sets++;
    if (set.decision === 'skip') a.skips++;
    else if (set.decision) a.choices++;
    set.options.forEach((option, position) => {
      const key = `${set.activity_id}:${option.id}`;
      if (!questions.has(key)) questions.set(key, { activity_id:set.activity_id, question_id:option.id, question_text:option.text, shown:0, chosen:0, skipped:0, other:0, unresolved:0, sessions:new Set(), positions:[0,0,0], position_choices:[0,0,0] });
      const q = questions.get(key); q.shown++; q.sessions.add(set.session_id); q.positions[position]++;
      if (set.decision === option.id) { q.chosen++; q.position_choices[position]++; }
      else if (set.decision === 'skip') q.skipped++;
      else if (set.decision) q.other++;
      else q.unresolved++;
    });
  }
  return {
    totals: { events:events.length, sessions:new Set(events.map(e => e.session_id)).size, starts:[...activities.values()].reduce((n,a)=>n+a.starts,0), completed:[...activities.values()].reduce((n,a)=>n+a.completed,0), unmatched_choices:unmatchedChoices },
    activities:[...activities.values()].map(({durations,...a}) => ({...a, completion_rate:rate(a.completed,a.starts), skip_rate:rate(a.skips,a.skips+a.choices), median_visible_ms:median(durations), duration_samples:durations.length})),
    questions:[...questions.values()].map(q => ({...q, sessions:q.sessions.size, choice_rate:rate(q.chosen,q.shown), resolved_rate:rate(q.chosen,q.chosen+q.other+q.skipped), sufficient:q.shown>=30 && q.sessions.size>=5})).sort((a,b)=>b.chosen-a.chosen || b.shown-a.shown),
    screens:[...screens.values()].map(s=>({...s,visits:s.visits.size})).sort((a,b)=>b.exits-a.exits),
    devices:['landscape','portrait'].flatMap(viewport=>['installed','browser'].map(display_mode=>({viewport,display_mode,sessions:new Set(events.filter(e=>e.viewport===viewport && e.display_mode===display_mode).map(e=>e.session_id)).size})))
  };
}
