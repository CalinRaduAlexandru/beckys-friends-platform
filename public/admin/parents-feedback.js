const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data = null, ratings = null, loading = 0;
const label = id => data?.titles?.[id] || id;
const percent = value => value === null ? '—' : `${value}%`;
const empty = (n,text='Nu sunt încă date în această perioadă.') => `<tr><td colspan="${n}">${esc(text)}</td></tr>`;
async function api(path) {
  let session; try { session = JSON.parse(sessionStorage.getItem('becky-admin-session')); } catch {}
  let response = await fetch(path, { headers: session?.access_token ? { Authorization:`Bearer ${session.access_token}` } : {} });
  if (response.status===401 && session?.refresh_token) {
    const refresh = await fetch('/api/auth/refresh', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
    if(refresh.ok) { session=await refresh.json(); sessionStorage.setItem('becky-admin-session',JSON.stringify(session)); response=await fetch(path,{headers:{Authorization:`Bearer ${session.access_token}`}}); }
  }
  if(response.status===401 || response.status===403) { $('login').hidden=false; throw new Error('Autentifică-te pentru a vedea rapoartele.'); }
  if(!response.ok) throw new Error('Rapoartele nu au putut fi citite. Reîncearcă.');
  return response.json();
}
function filtered(rows) { return rows.filter(row=>!$('activity').value || row.activity_id===$('activity').value); }
function questionRows() {
  return filtered(data?.questions || []).sort((a,b)=>$('sort').value==='rate' ? (b.choice_rate ?? -1)-(a.choice_rate ?? -1) : $('sort').value==='skipped' ? b.skipped-a.skipped : b.chosen-a.chosen);
}
function render() {
  if(!data) return;
  const rows=filtered(data.activities), sum=key=>rows.reduce((n,a)=>n+a[key],0);
  $('summary').innerHTML=[['Vizite începute',sum('starts')],['Finalizări observate',sum('completed')],['Seturi prezentate',sum('sets')],['Alegeri făcute',sum('choices')]].map(([text,value])=>`<div class="stat"><strong>${value}</strong><span>${text}</span></div>`).join('');
  $('activities').innerHTML=rows.map(a=>`<tr><td>${esc(label(a.activity_id))}</td><td>${a.info}</td><td>${a.starts}</td><td>${a.resumed}</td><td>${a.completed}<small>${percent(a.completion_rate)} din starturi</small></td><td>${a.exits}</td><td>${a.interrupted}</td><td>${a.open}</td><td>${a.median_visible_ms===null?'—':`${Math.round(a.median_visible_ms/1000)} s`}<small>n=${a.duration_samples}</small></td></tr>`).join('')||empty(9);
  $('questions').innerHTML=questionRows().map(q=>`<tr><td>${esc(q.question_text)}<small>${esc(label(q.activity_id))}</small><details><summary>Poziții în set</summary>${q.positions.map((n,i)=>`<small>Poziția ${i+1}: ${q.position_choices[i]} alegeri / ${n} afișări</small>`).join('')}</details></td><td>${q.shown}</td><td>${q.chosen}</td><td>${percent(q.choice_rate)}<div class="meter"><span style="width:${q.choice_rate||0}%"></span></div></td><td>${q.other}</td><td>${q.skipped}</td><td>${q.unresolved}</td><td><span class="badge ${q.sufficient?'good':''}">${q.sufficient?'Date în acumulare':'Volum redus'}</span><small>${q.sessions} sesiuni</small></td></tr>`).join('')||empty(8);
  $('friction').innerHTML=rows.map(a=>`<tr><td>${esc(label(a.activity_id))}</td><td>${a.sets} / ${a.skips}<small>${percent(a.skip_rate)} dintre seturile cu decizie</small></td><td>${a.help}</td><td>${a.quiz_skips}</td><td>${a.quiz_correct} / ${a.quiz_results}</td><td>${a.errors}</td></tr>`).join('')||empty(6);
  const screenNames={'activity-info-experience':'Instrucțiuni','funny-experience':'Alegerea întrebării','quiz-experience mini-quiz-setup':'Quiz · număr participanți','quiz-experience quiz-play mini-quiz-play':'Quiz · întrebare','sound-game sound-round':'Sunet · rundă','sound-game sound-secret':'Sunet · pregătire','sound-game sound-game-setup':'Sunet · participanți','sound-game sound-next':'Sunet · următorul participant','question-experience':'Întrebarea afișată','expression-game':'Zicala din emoji','music-game-experience dance-options-experience':'Alegerea dansului','music-game-experience dance-video-experience':'Videoul dansului','pass-along-experience is-pass-chain':'Arată mai departe · transmiterea scenei'};
  const screenLabel=screen=>screenNames[screen] || (screen.includes('pass-along')?'Arată mai departe · etapă de joc':screen.includes('sound')?'Sunet · etapă de joc':screen.includes('music')?'Muzică · etapă de joc':'Ecranul activității');
  $('screens').innerHTML=filtered(data.screens).filter(s=>s.exits).map(s=>`<p>${esc(label(s.activity_id))} · ${esc(screenLabel(s.screen))}: <strong>${s.exits}</strong> ieșiri / ${s.visits} vizite cu acest ecran</p>`).join('')||'<p>Nicio ieșire explicită asociată unui ecran.</p>';
  const signals=[];
  for(const a of rows) {
    if(a.errors) signals.push(`${label(a.activity_id)}: ${a.errors} erori JavaScript observate. Verifică întâi funcționarea tehnică.`);
    if(a.skips>=5 && a.skips+a.choices>=20 && a.skip_rate>=40) signals.push(`${label(a.activity_id)}: ${a.skip_rate}% „Pas” din ${a.skips+a.choices} decizii. Verifică diversitatea seturilor și claritatea instrucțiunilor.`);
    if(a.starts>=20 && a.exits/a.starts>=.4) signals.push(`${label(a.activity_id)}: ${a.exits} ieșiri explicite din ${a.starts} starturi. Uită-te la ecranele de ieșire și testează ritmul jocului.`);
  }
  const candidates=questionRows().filter(q=>q.sufficient && q.choice_rate>=50);
  if(candidates.length) signals.push(`${candidates.length} întrebări au fost alese în cel puțin jumătate dintre afișări, cu minimum 30 de afișări și 5 sesiuni fiecare. Sunt candidate pentru seturi de început; verifică distribuția pe poziții.`);
  $('signals').innerHTML=signals.map(s=>`<div class="signal">${esc(s)}</div>`).join('')||'<p>Încă nu apar semnale care ating pragurile orientative. Lasă datele să se acumuleze; nu este un verdict asupra activităților.</p>';
  $('devices').innerHTML='<h3>Formatul sesiunilor · toate activitățile</h3>'+data.devices.filter(d=>d.sessions).map(d=>`<p>${d.viewport==='landscape'?'Landscape':'Portret'} · ${d.display_mode==='installed'?'aplicație instalată':'browser'}: ${d.sessions} sesiuni</p>`).join('');
  renderRatings();
}
function renderRatings() {
  if(!ratings) return;
  const since=Date.now()-Number($('days').value)*86400000, groups=new Map();
  for(const r of filtered(ratings.feedback || []).filter(r=>Date.parse(r.created_at)>=since)) {
    const key=`${r.activity_id}:${r.question_text}`;
    if(!groups.has(key)) groups.set(key,{...r,n:0,sum:0,dist:[0,0,0,0,0]});
    const q=groups.get(key);q.n++;q.sum+=r.rating;q.dist[r.rating-1]++;
  }
  $('rating-status').textContent=`${[...groups.values()].reduce((n,q)=>n+q.n,0)} notări în perioada selectată.${ratings.truncated?' Atenție: istoricul este limitat; totalurile sunt parțiale.':''}`;
  $('ratings').innerHTML=[...groups.values()].sort((a,b)=>b.n-a.n).map(q=>`<tr><td>${esc(q.question_text)}<small>${esc(label(q.activity_id))}</small></td><td class="stars">${(q.sum/q.n).toFixed(2)} / 5</td><td>${q.n}</td><td>${q.dist.join(' · ')}</td></tr>`).join('')||empty(4,'Nu există notări în perioada selectată.');
}
async function load() {
  const run=++loading; $('status').textContent='Se încarcă rapoartele…'; $('status').className=''; $('export').disabled=true;
  const results=await Promise.allSettled([api(`/api/admin/parents-insights?days=${$('days').value}&tests=${$('tests').checked}`),api('/api/admin/parents-feedback')]);
  if(run!==loading) return;
  const [insights,feedback]=results;
  if(feedback.status==='fulfilled') { ratings=feedback.value; renderRatings(); } else { ratings=null;$('rating-status').textContent=feedback.reason.message;$('ratings').innerHTML=empty(4,'Date indisponibile.'); }
  if(insights.status==='rejected') {data=null;$('status').textContent=insights.reason.message;$('status').className='error';for(const id of ['summary','activities','questions','friction','screens','devices']) $(id).replaceChildren();$('signals').textContent='Rapoartele de interacțiuni sunt indisponibile.';return;}
  data=insights.value;
  const selected=$('activity').value;
  $('activity').innerHTML='<option value="">Toate activitățile</option>'+Object.entries(data.titles).map(([id,title])=>`<option value="${esc(id)}">${esc(title)}</option>`).join('');$('activity').value=selected;
  $('status').textContent=`Actualizat ${new Date().toLocaleTimeString('ro-RO')} · ${data.totals.events} evenimente · ${data.totals.sessions} sesiuni · ${data.includes_tests?'cu teste':'fără teste'}.${data.truncated?' LIMITĂ ATINSĂ: rezultate parțiale. Alege o perioadă mai scurtă.':''}${data.totals.unmatched_choices?` ${data.totals.unmatched_choices} alegeri fără afișarea asociată în perioadă; excluse din rate.`:''}`;
  $('export').disabled=false;render();
}
$('login').onsubmit=async event=>{event.preventDefault();try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:event.target.code.value.trim()})});if(!response.ok)throw new Error('Codul nu a fost acceptat.');sessionStorage.setItem('becky-admin-session',JSON.stringify(await response.json()));$('login').hidden=true;event.target.reset();await load();}catch(error){$('login-error').textContent=error.message;}};
for(const id of ['days','tests']) $(id).onchange=load;
for(const id of ['activity','sort']) $(id).onchange=render;
$('refresh').onclick=load;
$('test-device').checked=localStorage.getItem('becky-parents-analytics-test')==='true';
$('test-device').onchange=()=>localStorage.setItem('becky-parents-analytics-test',String($('test-device').checked));
$('export').onclick=()=>{
  const cell=value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
  const rows=[['Activitate','Întrebare','Afișări','Alegeri','Rată %','Pas','Altă întrebare','Fără decizie','Sesiuni'],...questionRows().map(q=>[label(q.activity_id),q.question_text,q.shown,q.chosen,q.choice_rate,q.skipped,q.other,q.unresolved,q.sessions])];
  const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`becky-intrebari-${$('days').value}z.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
load();
