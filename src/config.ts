/**
 * AniStream shared configuration.
 * Values can be overridden via Vite env vars (.env), sensible defaults included
 * so the site works out of the box on Cloudflare Workers without extra setup.
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) || ({} as any);

export const CLERK_PUBLISHABLE_KEY: string =
  env.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_test_Zml0LXJhbS00ODYuY2xlcmsuYWNjb3VudHMuZGV2JA';

export const CONSUMET_BASE: string =
  (env.VITE_CONSUMET_BASE || 'https://apiconsumetorg-rho-lemon.vercel.app').replace(/\/+$/, '');

export const PLAYER_BASE: string =
  (env.VITE_PLAYER_BASE || 'https://player.yenime.net').replace(/\/+$/, '');

/** Yenime embed URL for an AniList id + 1-indexed episode number */
export const yenimeEmbedUrl = (anilistId: string | number, episode: number, dub = false): string =>
  `${PLAYER_BASE}/anime/ani/${anilistId}/${episode}${dub ? '?dub=1' : ''}`;

/** AniStream brand palette - single color theme shared with the Flutter app */
export const THEME = {
  bg: '#08060d',
  surface: '#12101e',
  surface2: '#1a152c',
  accent: '#a855f7',
  accentHover: '#c084fc',
  accentGlow: 'rgba(168, 85, 247, 0.45)',
  text: '#f8fafc',
  textMuted: '#a29ec0',
};
