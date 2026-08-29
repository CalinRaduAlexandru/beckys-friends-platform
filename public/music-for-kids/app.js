import { CATEGORIES } from './data/tracks.js';
import { getCatalog, getFavorites, getRecentIds, getSelectedId, getProviderMode, rememberPlayed } from './lib/store.js';
import { youtubeProvider, officialUrl, youtubeVideoId } from './lib/provider.js';
import { registerPwa } from './lib/pwa.js';

const root = document.getElementById('music-app');
const categoryMap = new Map(CATEGORIES.map(category => [category.id, category]));
let catalog = getCatalog().filter(track => track.enabled);
let favorites = getFavorites();
let recentIds = getRecentIds();
let selected = catalog.find(track => track.id === getSelectedId()) || null;
let view = { name:'home', value:'' };

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[character]);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const distance = (left, right) => { const rows = Array.from({ length:right.length + 1 }, (_, index) => index); for (let i=1;i<=left.length;i+=1) { let previous=rows[0]; rows[0]=i; for (let j=1;j<=right.length;j+=1) { const current=rows[j]; rows[j]=Math.min(rows[j]+1,rows[j-1]+1,previous+(left[i-1]===right[j-1]?0:1)); previous=current; } } return rows[right.length]; };
const fuzzyMatch = (track, query) => {
  const needle = normalize(query); if (!needle) return true;
  const haystack = normalize([track.title,track.artist,track.category,...(track.keywords || [])].join(' '));
  if (haystack.includes(needle)) return true;
  const words = haystack.split(' '); return needle.split(' ').every(token => words.some(word => word.includes(token) || token.includes(word) || distance(token,word) <= Math.max(1,Math.floor(token.length/4))));
};
const categoryClass = track => `theme-${track.category}`;
const artwork = track => track.artwork ? `<img src="${esc(track.artwork)}" alt="">` : `<span aria-hidden="true">${categoryMap.get(track.category)?.icon || '♪'}</span>`;

function trackCard(track) {
  const ready = Boolean(officialUrl(track));
  return `<button class="track-card ${categoryClass(track)}" data-track="${esc(track.id)}"><span class="track-art">${artwork(track)}</span><span class="track-copy"><strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small></span><span class="track-play" aria-hidden="true">${ready ? '▶' : '＋'}</span></button>`;
}

function trackSection(title, tracks, emptyText = 'Nu sunt încă piese aici.') {
  return `<section class="track-section"><header><h2>${esc(title)}</h2><span>${tracks.length}</span></header><div class="track-list">${tracks.map(trackCard).join('') || `<p class="empty-message">${esc(emptyText)}</p>`}</div></section>`;
}

function miniPlayer() {
  if (!selected) return '';
  return `<button class="mini-player ${categoryClass(selected)}" data-open-player><span class="mini-art">${artwork(selected)}</span><span><strong>${esc(selected.title)}</strong><small>${esc(selected.artist)}</small></span><b>▶</b></button>`;
}

function homeView() {
  const favoriteTracks = catalog.filter(track => favorites.has(track.id)).slice(0,4);
  const recentTracks = recentIds.map(id => catalog.find(track => track.id === id)).filter(Boolean).slice(0,4);
  return `<main class="music-shell"><header class="hero"><span class="brand-mark">♪</span><div><small>COLECȚIE APROBATĂ</small><h1>Muzica mea</h1></div></header><label class="search-box"><span>⌕</span><input data-search type="search" inputmode="search" autocomplete="off" placeholder="Caută o melodie" aria-label="Caută o melodie"></label>${favoriteTracks.length ? trackSection('Favorite',favoriteTracks) : ''}<section class="category-section"><h2>Alege o stare</h2><div class="category-grid">${CATEGORIES.map(category => `<button class="category-card category-${category.id}" data-category="${category.id}"><span>${category.icon}</span><strong>${category.label}</strong><small>${category.id === 'favorites' ? catalog.filter(track => favorites.has(track.id)).length : catalog.filter(track => track.category === category.id).length} piese</small></button>`).join('')}</div></section>${recentTracks.length ? trackSection('Ultimele ascultate',recentTracks) : trackSection('Piese aprobate',catalog.slice(0,5),'Catalogul este gol.')}<p class="parent-hint">Catalogul este administrat separat de părinte.</p></main>${miniPlayer()}`;
}

function listView(title, tracks, query = '') {
  return `<main class="music-shell"><header class="sub-header"><button data-home aria-label="Înapoi">←</button><div><small>${query ? 'REZULTATE' : 'COLECȚIE'}</small><h1>${esc(title)}</h1></div></header>${query ? `<label class="search-box"><span>⌕</span><input data-search type="search" value="${esc(query)}" placeholder="Caută o melodie" aria-label="Caută o melodie"></label>` : ''}${trackSection(title,tracks,query ? 'Nicio piesă aprobată nu corespunde căutării.' : 'Nu sunt încă piese în această categorie.')}</main>${miniPlayer()}`;
}

function playerView(track, videoId = '') {
  const related = catalog.filter(item => item.id !== track.id && item.category === track.category).slice(0,4);
  const embed = videoId ? `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&rel=0&controls=0&disablekb=1&fs=0" title="${esc(track.title)} — ${esc(track.artist)}" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>` : `<div class="player-art ${categoryClass(track)}">${artwork(track)}</div>`;
  return `<main class="music-shell player-shell"><header class="sub-header"><button data-home aria-label="Înapoi">←</button><div><small>ACUM ASCULTĂM</small><h1>${esc(track.title)}</h1></div></header><section class="player-card"><div class="video-frame">${embed}</div><div class="player-title"><h2>${esc(track.title)}</h2><p>${esc(track.artist)}</p></div></section>${trackSection('Următoarele',related)}</main>`;
}

function render() {
  catalog = getCatalog().filter(track => track.enabled); favorites = getFavorites(); recentIds = getRecentIds();
  if (view.name === 'category') { const category = categoryMap.get(view.value); const tracks = view.value === 'favorites' ? catalog.filter(track => favorites.has(track.id)) : catalog.filter(track => track.category === view.value); root.innerHTML = listView(category?.label || 'Piese',tracks); }
  else if (view.name === 'search') root.innerHTML = listView('Căutare',catalog.filter(track => fuzzyMatch(track,view.value)),view.value);
  else if (view.name === 'player' && selected) root.innerHTML = playerView(selected,view.videoId || '');
  else { view={name:'home',value:''}; root.innerHTML=homeView(); }
  bind();
}

function unavailable(track) {
  root.querySelector('.music-toast')?.remove(); const toast=document.createElement('div'); toast.className='music-toast'; toast.textContent=`Părintele trebuie să adauge linkul oficial pentru „${track.title}”.`; document.body.appendChild(toast); setTimeout(()=>toast.remove(),3500);
}

function play(track, forcedMode) {
  selected=track; recentIds=rememberPlayed(track.id);
  const result=youtubeProvider.play(track,{ mode:forcedMode || getProviderMode(), onEmbed:(_item,videoId)=>{view={name:'player',videoId};render();}, onUnavailable:unavailable });
  if (result.mode === 'external') render();
}

function bind() {
  root.querySelector('[data-search]')?.addEventListener('input',event=>{view={name:'search',value:event.target.value};render();requestAnimationFrame(()=>{const input=root.querySelector('[data-search]');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}});});
  root.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{view={name:'category',value:button.dataset.category};render();window.scrollTo(0,0);}));
  root.querySelectorAll('[data-track]').forEach(button=>button.addEventListener('click',()=>{const track=catalog.find(item=>item.id===button.dataset.track);if(track)play(track);}));
  root.querySelectorAll('[data-home]').forEach(button=>button.addEventListener('click',()=>{view={name:'home',value:''};render();window.scrollTo(0,0);}));
  root.querySelector('[data-open-player]')?.addEventListener('click',()=>{if(selected){view={name:'player',videoId:getProviderMode()==='embedded'?youtubeVideoId(selected):''};render();window.scrollTo(0,0);}});
}

registerPwa(); render();
