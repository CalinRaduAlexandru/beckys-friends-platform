const EVENT_SURVEY_CONFIG={
  motivation:{title:'Ce caută familiile',short:'motivație'},
  worth:{title:'Ce declanșează decizia „mergem”',short:'criteriu'},
  blockers:{title:'Ce poate opri înscrierea',short:'barieră'},
  weekdays:{title:'Zile realiste după-amiaza',short:'zi'},
  startTime:{title:'Ore realiste de începere',short:'oră'},
  eventDuration:{title:'Durata potrivită',short:'durată'},
  desiredOutcomes:{title:'Ce trebuie să rămână după eveniment',short:'rezultat'}
};
const EVENT_CONCEPT_ICONS={
  'Board Games':'🎲',
  'Quiz Night':'🧠',
  'Science Day':'🔬',
  'Family Olympics':'🏅',
  'Treasure Hunt':'🗺️',
  'Talent Show':'🎤',
  'Lemonade Fair':'🍋',
  'Movie Night':'🎬',
  'Jocuri de masă':'🎲',
  'Seară de quiz':'🧠',
  'Laborator de știință':'🔬',
  'Olimpiada familiilor':'🏅',
  'Vânătoare de comori':'🗺️',
  'Scena talentelor':'🎤',
  'Târg de limonadă':'🍋',
  'Seară de film':'🎬'
};
const EVENT_CONCEPT_LABELS={
  'Board Games':'Jocuri de masă',
  'Quiz Night':'Seară de quiz',
  'Science Day':'Laborator de știință',
  'Family Olympics':'Olimpiada familiilor',
  'Treasure Hunt':'Vânătoare de comori',
  'Talent Show':'Scena talentelor',
  'Lemonade Fair':'Târg de limonadă',
  'Movie Night':'Seară de film',
  'LEGO Day':'',
  'Campfire Stories':''
};

let eventSurveyAllResponses=[];
let eventSurveyFunnelEvents=[];
let eventSurveyRange='all';
let eventSurveyChildCount='all';
let eventSurveyAge='all';

const eventSafe=value=>escapeHtml(String(value??''));
const eventDate=value=>new Intl.DateTimeFormat('ro-RO',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));
const eventPct=(part,total)=>total?Math.round(part/total*100):0;
const eventArray=value=>Array.isArray(value)?value.filter(Boolean):[];
const eventConceptIcon=label=>EVENT_CONCEPT_ICONS[label]||'✨';

function eventDateFilteredResponses(){
  if(eventSurveyRange==='all')return eventSurveyAllResponses;
  const days=Number(eventSurveyRange),threshold=Date.now()-days*86400000;
  return eventSurveyAllResponses.filter(row=>new Date(row.submitted_at).getTime()>=threshold);
}

function eventDateFilteredFunnel(){
  if(eventSurveyRange==='all')return eventSurveyFunnelEvents;
  const days=Number(eventSurveyRange),threshold=Date.now()-days*86400000;
  return eventSurveyFunnelEvents.filter(row=>new Date(row.created_at).getTime()>=threshold);
}

function eventFunnelStats(){
  const sessions=new Map();
  eventDateFilteredFunnel().forEach(event=>{
    if(!event.session_id)return;
    const session=sessions.get(event.session_id)||{reached:new Set(),completed:false,latest:null,opened:false};
    if(event.event_type==='open')session.opened=true;
    if(event.event_type==='complete')session.completed=true;
    if(event.event_type==='step')session.reached.add(Number(event.step));
    if(!session.latest||new Date(event.created_at)>new Date(session.latest.created_at))session.latest=event;
    sessions.set(event.session_id,session);
  });
  const started=[...sessions.values()].filter(session=>session.opened||session.reached.size).length;
  const completed=[...sessions.values()].filter(session=>session.completed).length;
  const reached=Array.from({length:14},(_,step)=>({step,count:[...sessions.values()].filter(session=>session.reached.has(step)||session.completed&&step===13).length}));
  const abandoned=new Map();
  [...sessions.values()].filter(session=>!session.completed&&session.latest).forEach(session=>{
    const step=Number(session.latest.step);
    const current=abandoned.get(step)||{step,count:0,duels:new Map()};
    current.count+=1;
    if(step===10&&Number.isInteger(session.latest.duel_index))current.duels.set(session.latest.duel_index,(current.duels.get(session.latest.duel_index)||0)+1);
    abandoned.set(step,current);
  });
  return {started,completed,reached,abandoned:[...abandoned.values()].sort((a,b)=>b.count-a.count)};
}

const EVENT_FUNNEL_LABELS=['Coperta chestionarului','Copiii','Vârstele','Motivația','Ce convinge','Ce poate opri','Zilele','Orele și durata','Rezultatele dorite','Introducerea duelului','Duelurile','Verificarea clasamentului','Răspunsul deschis','Trimiterea formularului'];

function eventFunnelPanel(submittedCount){
  const stats=eventFunnelStats();
  if(!stats.started)return `<article class="event-panel event-panel-wide event-funnel"><div class="event-panel-head"><div><span>FLUXUL CHESTIONARULUI</span><h3>Unde se opresc părinții?</h3></div></div><p class="event-no-data">Metricile de parcurs vor apărea după primele deschideri ale versiunii cu tracking.</p></article>`;
  const max=Math.max(stats.started,1);
  const abandonText=stats.abandoned.length?stats.abandoned.slice(0,3).map(item=>`${EVENT_FUNNEL_LABELS[item.step]} · ${item.count}`).join(' · '):'Niciun abandon înregistrat încă';
  return `<article class="event-panel event-panel-wide event-funnel"><div class="event-panel-head"><div><span>FLUXUL CHESTIONARULUI</span><h3>De la deschidere la completare</h3></div><small>Numărăm sesiuni anonime, nu persoane identificate. O sesiune este urmărită de la deschidere până la completare sau abandon.</small></div><div class="event-funnel-kpis"><div><strong>${stats.started}</strong><span>au deschis</span></div><div><strong>${submittedCount}</strong><span>au trimis formularul</span></div><div><strong>${eventPct(stats.completed,stats.started)}%</strong><span>conversie urmărită</span></div></div><div class="event-funnel-flow">${stats.reached.map(item=>`<div class="event-funnel-step"><div><span>${eventSafe(EVENT_FUNNEL_LABELS[item.step])}</span><strong>${item.count}</strong></div><i><b style="width:${Math.max(item.count?3:0,item.count/max*100)}%"></b></i></div>`).join('')}</div><div class="event-funnel-abandon"><span>ABANDONURI OBSERVATE</span><strong>${eventSafe(abandonText)}</strong><small>Ultimul pas vizitat al sesiunilor care nu au trimis formularul.</small></div></article>`;
}

function eventMatchesChildCount(row,segment){
  if(segment==='all')return true;
  const value=eventArray(row.answers?.childCount)[0]||'';
  if(segment==='3+')return value.startsWith('3 ')||value.startsWith('4 ');
  return value.startsWith(`${segment} `);
}

function eventFilteredResponses(){
  return eventDateFilteredResponses().filter(row=>
    eventMatchesChildCount(row,eventSurveyChildCount)&&
    (eventSurveyAge==='all'||eventArray(row.answers?.childAges).includes(eventSurveyAge))
  );
}

function eventRankStats(rows,key,source='answers'){
  const stats=new Map();
  rows.forEach(row=>{
    const rawValues=source==='concept'?eventArray(row.concept_ranking):eventArray(row.answers?.[key]);
    const values=source==='concept'?rawValues.map(label=>EVENT_CONCEPT_LABELS[label]??label).filter(Boolean):rawValues;
    const interpreted=source==='concept'?values.slice(0,3):values;
    interpreted.forEach((label,index)=>{
      const current=stats.get(label)||{label,selected:0,first:0,score:0};
      current.selected+=1;
      if(index===0)current.first+=1;
      current.score+=source==='concept'?3-index:1/(index+1);
      stats.set(label,current);
    });
  });
  return [...stats.values()].sort((a,b)=>b.score-a.score||b.first-a.first||b.selected-a.selected||a.label.localeCompare(b.label,'ro'));
}

function eventMultiStats(rows,key,fallbackKeys=[]){
  const stats=new Map();
  rows.forEach(row=>{
    let values=eventArray(row.answers?.[key]);
    if(!values.length)values=fallbackKeys.flatMap(fallback=>eventArray(row.answers?.[fallback]));
    values.forEach(label=>stats.set(label,(stats.get(label)||0)+1));
  });
  return [...stats].map(([label,selected])=>({label,selected})).sort((a,b)=>b.selected-a.selected||a.label.localeCompare(b.label,'ro'));
}

function eventConfidence(count){
  if(count<5)return {label:'Semnale timpurii',detail:'Prea puține răspunsuri pentru concluzii; urmărim doar indicii.',tone:'early'};
  if(count<20)return {label:'Direcții emergente',detail:'Tiparele încep să se contureze, dar merită validate cu mai multe familii.',tone:'growing'};
  return {label:'Semnale consistente',detail:'Eșantionul permite prioritizarea direcțiilor, păstrând filtrele de segment.',tone:'strong'};
}

function eventTop(stats){return stats[0]?.label||'Încă fără semnal'}

function eventSegmentControls(rows){
  const childLabel=eventSurveyChildCount==='all'?'Orice număr de copii':eventSurveyChildCount==='3+'?'3 sau mai mulți copii':`${eventSurveyChildCount} ${eventSurveyChildCount==='1'?'copil':'copii'}`;
  const ageLabel=eventSurveyAge==='all'?'Orice vârstă':eventSurveyAge;
  const filtered=eventSurveyChildCount!=='all'||eventSurveyAge!=='all';
  return `<section class="event-segment-filter"><div><span>SEGMENT ACTIV</span><strong>${eventSafe(childLabel)} · ${eventSafe(ageLabel)}</strong><small>${rows.length} ${rows.length===1?'răspuns analizat':'răspunsuri analizate'}</small></div><label>Numărul copiilor<select id="event-child-segment"><option value="all" ${eventSurveyChildCount==='all'?'selected':''}>Toate familiile</option><option value="1" ${eventSurveyChildCount==='1'?'selected':''}>1 copil</option><option value="2" ${eventSurveyChildCount==='2'?'selected':''}>2 copii</option><option value="3+" ${eventSurveyChildCount==='3+'?'selected':''}>3+ copii</option></select></label><label>Vârsta copiilor<select id="event-age-segment"><option value="all" ${eventSurveyAge==='all'?'selected':''}>Toate vârstele</option>${['0–2 ani','3–5 ani','6–8 ani','9–12 ani','13+ ani'].map(age=>`<option value="${age}" ${eventSurveyAge===age?'selected':''}>${age}</option>`).join('')}</select></label>${filtered?'<button class="event-secondary" id="event-clear-segment">Resetează segmentul</button>':''}</section>`;
}

function eventSegmentComparison(rows){
  const groups=[
    ['1 copil',row=>eventMatchesChildCount(row,'1')],
    ['2 copii',row=>eventMatchesChildCount(row,'2')],
    ['3+ copii',row=>eventMatchesChildCount(row,'3+')],
    ...['0–2 ani','3–5 ani','6–8 ani','9–12 ani','13+ ani'].map(age=>[age,row=>eventArray(row.answers?.childAges).includes(age)])
  ];
  const cards=groups.map(([label,matcher])=>{
    const segment=rows.filter(matcher);
    if(!segment.length)return '';
    return `<article class="event-segment-card"><div><strong>${eventSafe(label)}</strong><span>${segment.length} ${segment.length===1?'familie':'familii'}</span></div><dl><dt>Motivație frecventă</dt><dd>${eventSafe(eventTop(eventMultiStats(segment,'motivation')))}</dd><dt>Barieră principală</dt><dd>${eventSafe(eventTop(eventRankStats(segment,'blockers')))}</dd><dt>Concept favorit</dt><dd>${eventSafe(eventTop(eventRankStats(segment,'conceptRanking','concept')))}</dd></dl></article>`;
  }).filter(Boolean).join('');
  return `<article class="event-panel event-panel-wide event-segment-comparison"><div class="event-panel-head"><div><span>NUANȚE ÎNTRE FAMILII</span><h3>Unde apar direcții diferite?</h3></div><small>Copiii din mai multe intervale pot apărea în mai multe segmente. Numărul de răspunsuri rămâne vizibil ca să nu confundăm un indiciu timpuriu cu un tipar.</small></div><div class="event-segment-cards">${cards||'<p class="event-no-data">Nu sunt suficiente răspunsuri pentru comparație.</p>'}</div></article>`;
}

function eventInsightCards(rows){
  const confidence=eventConfidence(rows.length);
  const motivation=eventMultiStats(rows,'motivation');
  const blockers=eventRankStats(rows,'blockers');
  const concepts=eventRankStats(rows,'conceptRanking','concept');
  const days=eventMultiStats(rows,'weekdays');
  const hours=eventMultiStats(rows,'startTime',['timeWindow']);
  return `<section class="event-kpis">
    <article class="event-kpi event-kpi-count"><span>Răspunsuri analizate</span><strong>${rows.length}</strong><small>${rows.length?`Ultimul: ${eventDate(rows[0].submitted_at)}`:'Chestionarul este conectat și așteaptă răspunsuri'}</small></article>
    <article class="event-kpi"><span>Semnal principal</span><strong>${eventSafe(eventTop(motivation))}</strong><small>Motivația selectată de cele mai multe familii</small></article>
    <article class="event-kpi"><span>Fricțiunea principală</span><strong>${eventSafe(eventTop(blockers))}</strong><small>Bariera cu cea mai mare prioritate</small></article>
    <article class="event-kpi"><span>Concept favorit</span><strong>${eventSafe(eventTop(concepts))}</strong><small>După clasamentul final al participanților</small></article>
  </section>
  <section class="event-executive">
    <div><span class="event-confidence ${confidence.tone}">${confidence.label}</span><h2>Ce ne spun datele acum</h2><p>${confidence.detail}</p></div>
    <div class="event-decision"><span>Fereastră promițătoare</span><strong>${eventSafe(eventTop(days))} · ${eventSafe(eventTop(hours))}</strong><small>Ziua și ora sunt întrebări separate; combinația trebuie validată înainte de programare.</small></div>
  </section>`;
}

function eventRankPanel(rows,key,options={}){
  const stats=options.source==='multi'?eventMultiStats(rows,key,options.fallbackKeys):eventRankStats(rows,key,options.source);
  const max=Math.max(...stats.map(item=>options.source==='multi'?item.selected:item.score),1);
  const title=options.title||EVENT_SURVEY_CONFIG[key]?.title||key;
  if(!stats.length)return `<article class="event-panel"><div class="event-panel-head"><div><span>${eventSafe(options.eyebrow||'INSIGHT')}</span><h3>${eventSafe(title)}</h3></div></div><p class="event-no-data">Nu există încă răspunsuri pentru această întrebare.</p></article>`;
  return `<article class="event-panel ${options.wide?'event-panel-wide':''}">
    <div class="event-panel-head"><div><span>${eventSafe(options.eyebrow||'PRIORITĂȚI')}</span><h3>${eventSafe(title)}</h3></div>${options.note?`<small>${eventSafe(options.note)}</small>`:''}</div>
    <ol class="event-bars">${stats.map((item,index)=>{
      const value=options.source==='multi'?item.selected:item.score;
      const coverage=eventPct(item.selected,rows.length);
      const icon=options.source==='concept'?`<span class="event-concept-icon" role="img" aria-label="Activitate">${eventConceptIcon(item.label)}</span>`:'';
      return `<li><span class="event-rank">${index+1}</span><div class="event-bar-copy"><div><strong class="event-result-label">${icon}${eventSafe(item.label)}</strong><span>${coverage}% dintre respondenți${options.source==='multi'?'':` · ${item.first} prima alegere`}</span></div><div class="event-bar"><i style="width:${Math.max(4,value/max*100)}%"></i></div></div></li>`;
    }).join('')}</ol>
  </article>`;
}

function eventOpenAnswers(rows){
  const entries=[];
  rows.forEach(row=>{
    [['mainOpen','Ce ar face evenimentul să merite'],['extraOpen','Observație din versiunea anterioară']].forEach(([key,label])=>{
      const text=String(row.answers?.[key]||'').trim();
      if(text)entries.push({text,label,date:row.submitted_at,ages:eventArray(row.answers?.childAges)});
    });
  });
  return `<article class="event-panel event-panel-wide event-voices">
    <div class="event-panel-head"><div><span>VOCEA PĂRINȚILOR</span><h3>Răspunsuri deschise</h3></div><label class="event-search"><span>⌕</span><input id="event-voice-search" type="search" placeholder="Caută în răspunsuri"></label></div>
    ${entries.length?`<div id="event-voice-list" class="event-voice-list">${entries.map(entry=>`<blockquote data-event-voice="${eventSafe(entry.text.toLocaleLowerCase('ro'))}"><p>„${eventSafe(entry.text)}”</p><footer><span>${eventSafe(entry.label)}</span><span>${entry.ages.length?eventSafe(entry.ages.join(', ')):'Vârste nespecificate'}</span><time>${eventDate(entry.date)}</time></footer></blockquote>`).join('')}</div>`:'<p class="event-no-data">Niciun răspuns deschis în intervalul selectat.</p>'}
  </article>`;
}

function eventEmptyState(){
  return `<section class="event-empty"><span>📊</span><h2>Dashboardul este pregătit.</h2><p>Primul răspuns trimis prin chestionar va apărea automat aici și în Supabase. Nu trebuie importat nimic manual.</p><div><a class="primary" href="/chestionar-evenimente.html" target="_blank" rel="noopener">Deschide chestionarul ↗</a><a class="event-secondary" href="https://supabase.com/dashboard/project/qsyetunppcepupfufrou/editor" target="_blank" rel="noopener">Vezi baza de date ↗</a></div></section>`;
}

function eventDashboardTemplate(rows,comparisonRows){
  if(!eventSurveyAllResponses.length&&!eventSurveyFunnelEvents.length&&eventSurveyRange==='all')return eventEmptyState();
  return `${eventSegmentControls(rows)}${eventInsightCards(rows)}${eventFunnelPanel(eventDateFilteredResponses().length)}
    <section class="event-grid">
      ${eventRankPanel(rows,'conceptRanking',{source:'concept',title:'Conceptele de eveniment',eyebrow:'CE MERITĂ TESTAT',wide:true,note:'Doar primele trei poziții sunt punctate; restul rămân context'})}
      ${eventRankPanel(rows,'motivation',{source:'multi'})}
      ${eventRankPanel(rows,'blockers')}
      ${eventRankPanel(rows,'worth')}
      ${eventRankPanel(rows,'weekdays',{source:'multi'})}
      ${eventRankPanel(rows,'startTime',{source:'multi',fallbackKeys:['timeWindow']})}
      ${eventRankPanel(rows,'eventDuration',{source:'multi'})}
      ${eventRankPanel(rows,'desiredOutcomes',{source:'multi',fallbackKeys:['childFeeling','parentFeeling']})}
      ${eventRankPanel(rows,'childCount',{source:'multi',title:'Câți copii ar participa',eyebrow:'PROFILUL FAMILIILOR'})}
      ${eventRankPanel(rows,'childAges',{source:'multi',title:'Vârstele copiilor',eyebrow:'PROFILUL FAMILIILOR'})}
      ${eventSegmentComparison(comparisonRows)}
      ${eventOpenAnswers(rows)}
    </section>
    <details class="event-method"><summary>Cum sunt calculate prioritățile?</summary><p>Criteriile de decizie și barierele folosesc doar primele trei alegeri: prima primește 1 punct, a doua ½, iar a treia ⅓. Zilele, orele, motivațiile și rezultatele sunt analizate ca selecții multiple, fără prioritate inventată. Pentru concepte punctăm exclusiv topul 3 ajustat de participant; pozițiile inferioare nu influențează concluziile.</p></details>`;
}

function eventExportCsv(){
  const rows=eventFilteredResponses();
  const keys=['childCount','childAges','motivation','worth','blockers','weekdays','startTime','eventDuration','desiredOutcomes','mainOpen'];
  const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
  const lines=[['id','submitted_at',...keys,'conceptRanking'].map(quote).join(',')];
  rows.forEach(row=>lines.push([row.id,row.submitted_at,...keys.map(key=>Array.isArray(row.answers?.[key])?row.answers[key].join(' > '):row.answers?.[key]||''),eventArray(row.concept_ranking).join(' > ')].map(quote).join(',')));
  const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'}));link.download=`rezultate-chestionar-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
}

function bindEventDashboard(){
  document.querySelectorAll('[data-event-range]').forEach(button=>button.addEventListener('click',()=>{eventSurveyRange=button.dataset.eventRange;paintEventDashboard()}));
  document.getElementById('event-refresh')?.addEventListener('click',()=>renderEventsDashboard(true));
  document.getElementById('event-export')?.addEventListener('click',eventExportCsv);
  document.getElementById('event-child-segment')?.addEventListener('change',event=>{eventSurveyChildCount=event.target.value;paintEventDashboard()});
  document.getElementById('event-age-segment')?.addEventListener('change',event=>{eventSurveyAge=event.target.value;paintEventDashboard()});
  document.getElementById('event-clear-segment')?.addEventListener('click',()=>{eventSurveyChildCount='all';eventSurveyAge='all';paintEventDashboard()});
  document.getElementById('event-voice-search')?.addEventListener('input',event=>{
    const query=event.target.value.trim().toLocaleLowerCase('ro');
    document.querySelectorAll('[data-event-voice]').forEach(card=>card.hidden=!card.dataset.eventVoice.includes(query));
  });
}

function paintEventDashboard(){
  const content=document.getElementById('event-dashboard-content');if(!content)return;
  content.innerHTML=eventDashboardTemplate(eventFilteredResponses(),eventDateFilteredResponses());
  document.querySelectorAll('[data-event-range]').forEach(button=>button.classList.toggle('active',button.dataset.eventRange===eventSurveyRange));
  bindEventDashboard();
}

async function renderEventsDashboard(force=false){
  const demo=document.getElementById('workspace-demo');if(!demo)return;
  document.body.dataset.workspace='events';
  document.querySelector('.workspace')?.classList.add('hidden');
  document.getElementById('css-workspace')?.classList.add('hidden');
  document.getElementById('empty')?.classList.add('hidden');
  document.getElementById('editor')?.classList.add('hidden');
  document.querySelector('.top-actions')?.classList.add('overview-actions-hidden');
  document.querySelector('.topbar h1').textContent='Dashboard Evenimente';
  document.querySelector('.topbar .subtitle').textContent='Insighturi din nevoile reale ale familiilor, actualizate automat.';
  document.querySelectorAll('.sidebar .side-link').forEach(link=>link.classList.toggle('active',link.href.includes('view=events')));
  demo.className='workspace-demo events-workspace';
  demo.innerHTML=`<header class="event-dashboard-head"><div><span>CHESTIONAR · LIVE</span><h2>Ce merită să construim mai departe?</h2><p>Priorități, fricțiuni și oportunități — fără să cauți sensul într-un tabel brut.</p></div><div class="event-actions"><div class="event-range" aria-label="Interval analizat"><button data-event-range="all">Tot</button><button data-event-range="30">30 zile</button><button data-event-range="7">7 zile</button></div><button id="event-refresh" class="event-secondary">↻ Actualizează</button><button id="event-export" class="event-secondary">↓ CSV</button><a class="event-secondary" href="https://supabase.com/dashboard/project/qsyetunppcepupfufrou/editor" target="_blank" rel="noopener">Baza de date ↗</a></div></header><main id="event-dashboard-content"><div class="event-loading">Se citesc rezultatele…</div></main>`;
  try{
    if(force||!eventSurveyAllResponses.length){const [response,funnelResponse]=await Promise.all([apiFetch('/api/event-survey/results'),apiFetch('/api/event-survey/funnel')]);const payload=await response.json();eventSurveyAllResponses=eventArray(payload.responses);if(funnelResponse.ok){const funnelPayload=await funnelResponse.json();eventSurveyFunnelEvents=eventArray(funnelPayload.events);}}
    paintEventDashboard();
  }catch(error){document.getElementById('event-dashboard-content').innerHTML=`<section class="event-empty"><span>⚠️</span><h2>Nu am putut citi rezultatele.</h2><p>${eventSafe(error.message||'Încearcă din nou.')}</p><button id="event-refresh" class="primary">Încearcă din nou</button></section>`;bindEventDashboard();}
}
