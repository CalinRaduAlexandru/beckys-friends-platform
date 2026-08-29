# Music for Kids — experiment MVP

Feature static, fără backend și fără dependențe de build.

## Rute

- copil: `/music-for-kids/`
- părinte: `/music-for-kids/parent`

## Date locale

Catalogul demo este în `data/tracks.js`. Modificările făcute în zona părintelui, favoritele, istoricul și modul providerului sunt păstrate numai în `localStorage`, sub prefixul `music-for-kids:v1:`.

Niciun fișier audio nu este descărcat sau găzduit. Redarea folosește linkul oficial introdus de părinte, prin `YouTubeLinkProvider`.

Modul implicit este `Embedded protejat`: playerul nu afișează controale, fullscreen sau buton extern oferit de aplicație și nu face fallback automat către YouTube dacă lipsește un video ID. Elementele native ale playerului YouTube nu pot fi eliminate sau blocate complet fără a încălca regulile providerului.

## Eliminarea experimentului

1. Șterge directorul `public/music-for-kids/`.
2. Elimină cele trei rute `music-for-kids` din `server.js`.
3. Elimină aceleași trei rute din `src/worker.mjs`.

Extensiile MIME adăugate în server pentru `.json` și `.webmanifest` pot rămâne; nu depind de experiment.
