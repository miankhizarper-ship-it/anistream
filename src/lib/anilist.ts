/**
 * AniStream data layer.
 *
 * Primary source: Consumet meta/anilist endpoints (trending, popular,
 * airing-schedule, search, advanced-search, info) hosted at CONSUMET_BASE.
 *
 * Resilience: some self-hosted Consumet instances fail or hang on the
 * `/info/:id` route because it scrapes third-party providers. When that
 * happens (or it is slow), we transparently fall back to the official
 * AniList GraphQL API (free, no key, CORS enabled) and map the response
 * into the exact same AnimeInfo shape. The UI never notices.
 */

import { CONSUMET_BASE } from '../config';
import { getCachedData, setCachedData } from './cache';
import type {
  AnimeCharacter,
  AnimeInfo,
  AnimeItem,
  AnimeRecommendation,
  AnimeTitle,
  EpisodeMeta,
  PagedList,
} from './types';

/* ----------------------------- fetch helpers ----------------------------- */

async function fetchJson(url: string, timeoutMs = 20000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const GRAPHQL_URL = 'https://graphql.anilist.co';

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors && !json.data) throw new Error(json.errors[0]?.message || 'GraphQL error');
    return json.data as T;
  } finally {
    clearTimeout(timer);
  }
}

async function withCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const cached = getCachedData<T>(key);
  if (cached) return cached;
  const data = await loader();
  setCachedData(key, data, ttlMs);
  return data;
}

/* ------------------------------ normalizers ------------------------------ */

export function normTitle(title: AnimeTitle | string | null | undefined): string {
  if (!title) return 'Untitled';
  if (typeof title === 'string') return title;
  return (
    title.english ||
    title.userPreferred ||
    title.romaji ||
    title.native ||
    'Untitled'
  );
}

function normList(res: any): PagedList<AnimeItem> {
  return {
    currentPage: res?.currentPage ?? 1,
    hasNextPage: Boolean(res?.hasNextPage),
    totalPages: res?.totalPages ?? null,
    totalResults: res?.totalResults ?? null,
    results: Array.isArray(res?.results)
      ? res.results
          .filter((r: any) => r && (r.id !== undefined || r.media?.id !== undefined))
          .map((r: any) => (r && r.media ? normalizeAiringItem(r) : normalizeItem(r)))
      : [],
  };
}

function normalizeItem(r: any): AnimeItem {
  return {
    ...r,
    id: String(r.id),
    media_type: 'anime',
    // airing-schedule (notYetAired) rows carry episode/airingAt at the top level
    airingEpisode: r.episode ?? r.airingEpisode ?? null,
    airingAt: r.airingAt ?? null,
  };
}

/** airing-schedule items wrap the media with episode/airingAt info */
function normalizeAiringItem(r: any): AnimeItem {
  const media = r.media || r;
  return {
    ...media,
    id: String(media.id),
    media_type: 'anime',
    airingEpisode: r.episode ?? null,
    airingAt: r.airingAt ?? null,
  };
}

/* ------------------------------- list APIs ------------------------------- */

export async function getTrending(page = 1, perPage = 20): Promise<PagedList<AnimeItem>> {
  return withCache(`trending_${page}_${perPage}`, 10 * 60 * 1000, async () =>
    normList(await fetchJson(`${CONSUMET_BASE}/meta/anilist/trending?page=${page}&perPage=${perPage}`))
  );
}

export async function getPopular(page = 1, perPage = 20): Promise<PagedList<AnimeItem>> {
  return withCache(`popular_${page}_${perPage}`, 10 * 60 * 1000, async () =>
    normList(await fetchJson(`${CONSUMET_BASE}/meta/anilist/popular?page=${page}&perPage=${perPage}`))
  );
}

/** Upcoming episodes (uses notYetAired=true which is reliable on this instance) */
export async function getAiringSchedule(page = 1, perPage = 20): Promise<PagedList<AnimeItem>> {
  return withCache(`airing_${page}_${perPage}`, 5 * 60 * 1000, async () =>
    normList(
      await fetchJson(
        `${CONSUMET_BASE}/meta/anilist/airing-schedule?page=${page}&perPage=${perPage}&notYetAired=true`
      )
    )
  );
}

export async function searchAnime(query: string, page = 1): Promise<PagedList<AnimeItem>> {
  const q = encodeURIComponent(query);
  return withCache(`search_${q}_${page}`, 5 * 60 * 1000, async () =>
    normList(await fetchJson(`${CONSUMET_BASE}/meta/anilist/${q}?page=${page}`))
  );
}

export interface AdvancedSearchParams {
  page?: number;
  perPage?: number;
  query?: string;
  genres?: string[];
  year?: number;
  season?: string;
  format?: string;
  status?: string;
  sort?: string[];
}

export async function advancedSearch(params: AdvancedSearchParams = {}): Promise<PagedList<AnimeItem>> {
  const usp = new URLSearchParams();
  if (params.page) usp.set('page', String(params.page));
  usp.set('perPage', String(params.perPage ?? 24));
  if (params.query) usp.set('query', params.query);
  if (params.genres && params.genres.length) usp.set('genres', JSON.stringify(params.genres));
  if (params.year) usp.set('year', String(params.year));
  if (params.season) usp.set('season', params.season);
  if (params.format) usp.set('format', params.format);
  if (params.status) usp.set('status', params.status);
  if (params.sort && params.sort.length) usp.set('sort', JSON.stringify(params.sort));
  return withCache(`adv_${usp.toString()}`, 10 * 60 * 1000, async () =>
    normList(await fetchJson(`${CONSUMET_BASE}/meta/anilist/advanced-search?${usp.toString()}`))
  );
}

/* ------------------------------ info (detail) ----------------------------- */

const INFO_QUERY = `
query Media($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title { romaji english native userPreferred }
    synonyms
    image: coverImage { extraLarge large }
    bannerImage
    trailer { id site thumbnail }
    description(asHtml: false)
    status
    season
    seasonYear
    startDate { year month day }
    endDate { year month day }
    averageScore
    meanScore
    popularity
    favourites
    genres
    studios(isMain: true) { nodes { name } }
    format
    duration
    episodes
    nextAiringEpisode { episode airingAt timeUntilAiring }
    airingSchedule(perPage: 500) {
      edges { node { episode airingAt } }
    }
    streamingEpisodes {
      title
      thumbnail
      url
      site
    }
    characters(sort: [ROLE, RELEVANCE], perPage: 20) {
      edges { role node { id name { full } image { large } } }
    }
    recommendations(sort: [RATING_DESC], perPage: 14) {
      edges { node { mediaRecommendation {
        id idMal
        title { romaji english native userPreferred }
        image: coverImage { extraLarge large }
        bannerImage
        averageScore
        status
        format
        episodes
        seasonYear
      } } }
    }
    relations {
      edges { relationType node {
        id idMal type
        title { romaji english native userPreferred }
        image: coverImage { extraLarge large }
        averageScore status format episodes seasonYear
      } }
    }
  }
}`;

function mapGqlMedia(m: any): AnimeItem {
  return {
    id: String(m.id),
    malId: m.idMal ?? null,
    title: m.title || {},
    image: m.image?.extraLarge || m.image?.large || m.coverImage?.extraLarge || m.coverImage?.large || null,
    cover: m.bannerImage || null,
    description: m.description || null,
    status: m.status || null,
    rating: m.averageScore ?? m.meanScore ?? null,
    releaseDate: m.seasonYear ?? m.startDate?.year ?? null,
    color: null,
    genres: m.genres || [],
    totalEpisodes: m.episodes ?? null,
    duration: m.duration ?? null,
    type: m.format || null,
    season: m.season || null,
    studios: m.studios?.nodes?.map((s: any) => s.name) || [],
    media_type: 'anime',
  };
}

function mapGqlInfo(m: any): AnimeInfo {
  const characters: AnimeCharacter[] = (m.characters?.edges || [])
    .filter((e: any) => e.node)
    .map((e: any) => ({
      id: e.node.id,
      name: e.node.name?.full || 'Unknown',
      image: e.node.image?.large || null,
      role: e.role || null,
    }));

  /* Per-episode metadata: air dates from the airing schedule + thumbnails &
     titles from the streaming episode list ("Episode 3 - Title" format). */
  const episodeMeta: Record<string, EpisodeMeta> = {};
  (m.airingSchedule?.edges || []).forEach((e: any) => {
    const n = Number(e?.node?.episode);
    if (Number.isFinite(n) && n > 0) {
      episodeMeta[String(n)] = { number: n, airAt: e.node.airingAt ?? null };
    }
  });
  (m.streamingEpisodes || []).forEach((se: any) => {
    if (!se?.title) return;
    const match = /episode\s*\.?\s*(\d+)/i.exec(String(se.title));
    if (!match) return;
    const n = Number(match[1]);
    if (!Number.isFinite(n) || n <= 0) return;
    const label = String(se.title)
      .replace(/^episode\s*\.?\s*\d+\s*[-–—~:]\s*/i, '')
      .trim();
    const existing = episodeMeta[String(n)] || { number: n };
    episodeMeta[String(n)] = {
      ...existing,
      number: n,
      title: label || existing.title || null,
      thumbnail: se.thumbnail || existing.thumbnail || null,
    };
  });

  const recommendations: AnimeRecommendation[] = (m.recommendations?.edges || [])
    .filter((e: any) => e.node?.mediaRecommendation)
    .map((e: any) => mapGqlMedia(e.node.mediaRecommendation));

  const relations: AnimeRecommendation[] = (m.relations?.edges || [])
    .filter((e: any) => e.node && e.node.type !== 'MANGA')
    .map((e: any) => ({ ...mapGqlMedia(e.node), relationType: e.relationType || null }));

  const total = m.episodes ?? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null) ?? null;
  const episodeList: number[] = total && total > 0 ? Array.from({ length: Math.min(total, 2000) }, (_, i) => i + 1) : [];

  return {
    ...mapGqlMedia(m),
    cover: m.bannerImage || null,
    synonyms: m.synonyms || [],
    popularity: m.popularity ?? null,
    favourites: m.favourites ?? null,
    startDate: m.startDate || null,
    endDate: m.endDate || null,
    nextAiringEpisode: m.nextAiringEpisode || null,
    characters,
    recommendations,
    relations,
    episodeList,
    episodeMeta,
  };
}

/** Fetch consumet info; returns null instead of throwing (broken/slow scrape) */
async function tryConsumetInfo(id: string, timeoutMs = 12000): Promise<AnimeInfo | null> {
  try {
    const raw = await fetchJson(`${CONSUMET_BASE}/meta/anilist/info/${id}`, timeoutMs);
    if (!raw || raw.message || raw.id === undefined) return null;
    const total =
      raw.totalEpisodes ??
      (Array.isArray(raw.episodes) && raw.episodes.length > 0
        ? raw.episodes.length
        : raw.nextAiringEpisode
        ? raw.nextAiringEpisode.episode - 1
        : null);
    const episodeList: number[] =
      Array.isArray(raw.episodes) && raw.episodes.length > 0
        ? raw.episodes.map((e: any) => Number(e.episode ?? e.number ?? e)).filter((n: number) => Number.isFinite(n) && n > 0)
        : total && total > 0
        ? Array.from({ length: Math.min(total, 2000) }, (_, i) => i + 1)
        : [];
    const episodeMeta: Record<string, EpisodeMeta> = {};
    if (Array.isArray(raw.episodes)) {
      raw.episodes.forEach((e: any) => {
        const n = Number(e?.episode ?? e?.number ?? e);
        if (!Number.isFinite(n) || n <= 0) return;
        const title =
          typeof e?.title === 'string'
            ? e.title
            : e?.title?.english || e?.title?.romaji || e?.title?.userPreferred || null;
        episodeMeta[String(n)] = {
          number: n,
          title: title || null,
          thumbnail: e?.image || null,
          description: e?.description ? String(e.description).replace(/<[^>]*>/g, '') : null,
          airAt: typeof e?.airingAt === 'number' ? e.airingAt : null,
        };
      });
    }
    return {
      ...normalizeItem(raw),
      popularity: raw.popularity ?? null,
      favourites: raw.favourites ?? null,
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
      nextAiringEpisode: raw.nextAiringEpisode || null,
      characters: Array.isArray(raw.characters)
        ? raw.characters.map((c: any) => ({
            id: c.id,
            name: typeof c.name === 'object' ? c.name?.full || c.name?.userPreferred || 'Unknown' : c.name || 'Unknown',
            image: c.image || null,
            role: c.role || null,
          }))
        : [],
      recommendations: Array.isArray(raw.recommendations)
        ? raw.recommendations.map((r: any) => {
            const rec = r.mediaRecommendation || r;
            return { ...normalizeItem(rec) };
          })
        : [],
      relations: Array.isArray(raw.relations)
        ? raw.relations.map((r: any) => {
            const m = r.media || r;
            // Consumet may nest the relationType on the edge instead of the media
            return { ...normalizeItem(m), relationType: r.relationType ?? m.relationType ?? null };
          })
        : [],
      episodeList,
      episodeMeta,
    } as AnimeInfo;
  } catch {
    return null;
  }
}

/**
 * Full anime info with automatic fallback:
 * 1. Official AniList GraphQL API (fast + reliable, mapped to AnimeInfo)
 * 2. Consumet `/meta/anilist/info/:id` (secondary - its provider scraping
 *    can hang or fail on self-hosted instances)
 * Results are cached for 30 minutes.
 */
export async function getAnimeInfo(id: string | number): Promise<AnimeInfo> {
  return withCache(`info_${id}`, 30 * 60 * 1000, async () => {
    try {
      const data = await graphql<{ Media: any }>(INFO_QUERY, { id: Number(id) });
      if (data?.Media) return mapGqlInfo(data.Media);
    } catch (err) {
      console.warn('AniList GraphQL info failed, trying Consumet info:', err);
    }
    const consumet = await tryConsumetInfo(String(id));
    if (consumet) return consumet;
    throw new Error('Anime not found - both metadata sources failed');
  });
}

/* --------------------------------- misc ---------------------------------- */

export function formatRating(rating?: number | null): string {
  if (rating === null || rating === undefined || Number.isNaN(rating)) return 'NR';
  // AniList scores are 0-100 percentages; display as x/10 style "73%"
  return `${Math.round(rating)}%`;
}

export function formatAiringCountdown(airingAt?: number | null): string | null {
  if (!airingAt) return null;
  const diff = airingAt * 1000 - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `EP in ${days}d ${hours}h`;
  if (hours > 0) return `EP in ${hours}h ${mins}m`;
  return `EP in ${mins}m`;
}

export const ANIME_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

export const ANIME_FORMATS = [
  { value: 'TV', label: 'TV Series' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Special' },
];

export const ANIME_SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

export const ANIME_STATUS = [
  { value: 'RELEASING', label: 'Airing' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'UPCOMING', label: 'Upcoming' },
];
