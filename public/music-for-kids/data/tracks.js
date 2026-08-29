/**
 * @typedef {'dance'|'energy'|'happy'|'calm'|'disney'|'sing'} TrackCategory
 * @typedef {{id:string,title:string,artist:string,category:TrackCategory,keywords?:string[],artwork?:string,url:string,youtubeVideoId?:string,enabled:boolean}} Track
 */

export const CATEGORIES = [
  { id: 'favorites', label: 'Favorite', icon: '★' },
  { id: 'dance', label: 'Dans', icon: '♪' },
  { id: 'energy', label: 'Energie', icon: '⚡' },
  { id: 'happy', label: 'Happy', icon: '☀' },
  { id: 'calm', label: 'Liniște', icon: '☾' },
  { id: 'disney', label: 'Disney', icon: '✦' },
  { id: 'sing', label: 'Cântăm', icon: '♫' },
];
/** @type {Track[]} */
export const DEFAULT_TRACKS = [
  { id:'waka-waka', title:'Waka Waka', artist:'Shakira', category:'dance', keywords:['fotbal','dans'], url:'', youtubeVideoId:'', enabled:true },
  { id:'try-everything', title:'Try Everything', artist:'Shakira', category:'disney', keywords:['zootopia','curaj'], url:'', youtubeVideoId:'', enabled:true },
  { id:'happy', title:'Happy', artist:'Pharrell Williams', category:'happy', keywords:['veselie','dans'], url:'', youtubeVideoId:'', enabled:true },
  { id:'cant-stop-the-feeling', title:"Can't Stop the Feeling!", artist:'Justin Timberlake', category:'dance', keywords:['trolls','dans'], url:'', youtubeVideoId:'', enabled:true },
  { id:'roar', title:'Roar', artist:'Katy Perry', category:'energy', keywords:['putere','energie'], url:'', youtubeVideoId:'', enabled:true },
  { id:'shake-it-off', title:'Shake It Off', artist:'Taylor Swift', category:'dance', keywords:['dans','ritm'], url:'', youtubeVideoId:'', enabled:true },
  { id:'a-whole-new-world', title:'A Whole New World', artist:'Aladdin', category:'disney', keywords:['aladdin','duet'], url:'', youtubeVideoId:'', enabled:true },
  { id:'under-the-sea', title:'Under the Sea', artist:'The Little Mermaid', category:'disney', keywords:['sirena','mare'], url:'', youtubeVideoId:'', enabled:true },
  { id:'hakuna-matata', title:'Hakuna Matata', artist:'The Lion King', category:'disney', keywords:['regele leu','cantam'], url:'', youtubeVideoId:'', enabled:true },
  { id:'let-it-go', title:'Let It Go', artist:'Frozen', category:'sing', keywords:['elsa','disney','cantam'], url:'', youtubeVideoId:'', enabled:true },
  { id:'youre-welcome', title:"You're Welcome", artist:'Moana', category:'sing', keywords:['maui','disney','cantam'], url:'', youtubeVideoId:'', enabled:true },
  { id:'we-dont-talk-about-bruno', title:"We Don't Talk About Bruno", artist:'Encanto', category:'sing', keywords:['bruno','disney','cantam'], url:'', youtubeVideoId:'', enabled:true },
  { id:'count-on-me', title:'Count on Me', artist:'Bruno Mars', category:'calm', keywords:['prietenie','liniste'], url:'', youtubeVideoId:'', enabled:true },
  { id:'firework', title:'Firework', artist:'Katy Perry', category:'energy', keywords:['energie','curaj'], url:'', youtubeVideoId:'', enabled:true },
  { id:'walking-on-sunshine', title:'Walking on Sunshine', artist:'Katrina & The Waves', category:'happy', keywords:['soare','veselie'], url:'', youtubeVideoId:'', enabled:true },
  { id:'i-like-to-move-it', title:'I Like to Move It', artist:'Madagascar', category:'energy', keywords:['miscare','dans'], url:'', youtubeVideoId:'', enabled:true },
  { id:'bare-necessities', title:'The Bare Necessities', artist:'The Jungle Book', category:'calm', keywords:['baloo','disney','liniste'], url:'', youtubeVideoId:'', enabled:true },
  { id:'better-when-im-dancin', title:"Better When I'm Dancin'", artist:'Meghan Trainor', category:'happy', keywords:['dans','veselie'], url:'', youtubeVideoId:'', enabled:true },
];
