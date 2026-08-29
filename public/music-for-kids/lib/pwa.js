export function registerPwa() {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/music-for-kids/sw.js', { scope:'/music-for-kids/' }).catch(() => {}));
}
