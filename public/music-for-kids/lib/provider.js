export class MusicProvider {
  play(_track, _options = {}) { throw new Error('MusicProvider.play must be implemented'); }
}

export function youtubeVideoId(track) {
  if (/^[\w-]{11}$/.test(track?.youtubeVideoId || '')) return track.youtubeVideoId;
  try {
    const url = new URL(track?.url || '');
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
    if (url.hostname.endsWith('youtube.com')) {
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const match = url.pathname.match(/\/(?:embed|shorts)\/([\w-]{11})/);
      if (match) return match[1];
    }
  } catch {}
  return '';
}

export function officialUrl(track) {
  if (track?.url) return track.url;
  const id = youtubeVideoId(track);
  return id ? `https://www.youtube.com/watch?v=${id}` : '';
}

export class YouTubeLinkProvider extends MusicProvider {
  play(track, { mode = 'external', onEmbed, onUnavailable } = {}) {
    const videoId = youtubeVideoId(track);
    const url = officialUrl(track);
    if (!url && !videoId) { onUnavailable?.(track); return { ok:false, reason:'missing-url' }; }
    if (mode === 'embedded') {
      if (!videoId) { onUnavailable?.(track); return { ok:false, reason:'missing-video-id' }; }
      onEmbed?.(track, videoId);
      return { ok:true, mode:'embedded' };
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return { ok:true, mode:'external' };
  }
}

export const youtubeProvider = new YouTubeLinkProvider();
