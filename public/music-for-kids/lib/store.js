import { DEFAULT_TRACKS } from '../data/tracks.js';

const KEYS = {
  catalog: 'music-for-kids:v1:catalog',
  favorites: 'music-for-kids:v1:favorites',
  recent: 'music-for-kids:v1:recent',
  selected: 'music-for-kids:v1:selected',
  mode: 'music-for-kids:v1:provider-mode',
};

const cloneDefaults = () => DEFAULT_TRACKS.map(track => ({ ...track, keywords:[...(track.keywords || [])] }));
const read = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };

export function normalizeTrack(track, index = 0) {
  const categories = new Set(['dance','energy','happy','calm','disney','sing']);
  const id = String(track?.id || `track-${Date.now()}-${index}`).trim();
  return {
    id,
    title: String(track?.title || 'Piesă nouă').trim(),
    artist: String(track?.artist || 'Artist necunoscut').trim(),
    category: categories.has(track?.category) ? track.category : 'happy',
    keywords: Array.isArray(track?.keywords) ? track.keywords.map(String).map(value => value.trim()).filter(Boolean) : [],
    artwork: String(track?.artwork || '').trim(),
    url: String(track?.url || '').trim(),
    youtubeVideoId: String(track?.youtubeVideoId || '').trim(),
    enabled: track?.enabled !== false,
  };
}

export function getCatalog() {
  const saved = read(KEYS.catalog, null);
  return Array.isArray(saved) ? saved.map(normalizeTrack) : cloneDefaults();
}

export function saveCatalog(tracks) {
  const normalized = tracks.map(normalizeTrack);
  localStorage.setItem(KEYS.catalog, JSON.stringify(normalized));
  return normalized;
}

export function resetCatalog() { localStorage.removeItem(KEYS.catalog); return cloneDefaults(); }
export function getFavorites() { return new Set(read(KEYS.favorites, [])); }
export function setFavorite(id, favorite) { const values = getFavorites(); favorite ? values.add(id) : values.delete(id); localStorage.setItem(KEYS.favorites, JSON.stringify([...values])); return values; }
export function getRecentIds() { return read(KEYS.recent, []); }
export function rememberPlayed(id) { const next = [id, ...getRecentIds().filter(value => value !== id)].slice(0, 8); localStorage.setItem(KEYS.recent, JSON.stringify(next)); localStorage.setItem(KEYS.selected, JSON.stringify(id)); return next; }
export function getSelectedId() { return read(KEYS.selected, ''); }
export function getProviderMode() { return localStorage.getItem(KEYS.mode) === 'external' ? 'external' : 'embedded'; }
export function setProviderMode(mode) { localStorage.setItem(KEYS.mode, mode === 'embedded' ? 'embedded' : 'external'); }
