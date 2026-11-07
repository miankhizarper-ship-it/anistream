/**
 * Anime domain types shared across the app.
 * Normalized so both the Consumet meta API and the AniList GraphQL
 * fallback produce the same shapes.
 */

export interface AnimeTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
  userPreferred?: string | null;
}

export interface AnimeTrailer {
  id: string;
  site?: string;
  thumbnail?: string;
}

/** List-level anime card item (trending / popular / search / airing) */
export interface AnimeItem {
  id: string;
  malId?: number | null;
  title: AnimeTitle | string;
  image: string | null;
  cover?: string | null;
  trailer?: AnimeTrailer | null;
  description?: string | null;
  status?: string | null;
  rating?: number | null; // 0-100 percentage on AniList
  releaseDate?: string | number | null;
  color?: string | null;
  genres?: string[];
  totalEpisodes?: number | null;
  duration?: number | null;
  type?: string | null; // TV / Movie / OVA / Special / ONA
  season?: string | null;
  studios?: string[] | null;
  // filled by list mappers when available (e.g. airing schedule)
  airingEpisode?: number | null;
  airingAt?: number | null;
  // internal helpers
  media_type?: 'anime';
}

export interface AnimeCharacter {
  id: string | number;
  name: AnimeTitle | string;
  image: string | null;
  role?: string | null;
}

export interface AnimeRecommendation {
  id: string | number;
  malId?: number | null;
  title: AnimeTitle | string;
  image: string | null;
  cover?: string | null;
  rating?: number | null;
  status?: string | null;
  type?: string | null;
  episodes?: number | null;
  releaseDate?: string | number | null;
  /** relation edge type when the item came from `relations` (PREQUEL / SEQUEL / PARENT…) */
  relationType?: string | null;
}

/** Per-episode metadata merged from streaming sources (AniList airingSchedule + streamingEpisodes) */
export interface EpisodeMeta {
  number: number;
  title?: string | null;
  thumbnail?: string | null;
  description?: string | null;
  /** epoch seconds the episode aired (AniList `airingAt`) */
  airAt?: number | null;
}

export interface AnimeInfo extends AnimeItem {
  synonyms?: string[] | null;
  popularity?: number | null;
  favourites?: number | null;
  startDate?: { year?: number; month?: number; day?: number } | null;
  endDate?: { year?: number; month?: number; day?: number } | null;
  countryOfOrigin?: string | null;
  isAdult?: boolean | null;
  nextAiringEpisode?: { episode: number; airingAt: number; timeUntilAiring: number } | null;
  characters?: AnimeCharacter[];
  recommendations?: AnimeRecommendation[];
  relations?: AnimeRecommendation[];
  /** 1-indexed episode numbers known for this anime */
  episodeList?: number[];
  /** per-episode thumbnails / titles / air dates when the source provides them */
  episodeMeta?: Record<string, EpisodeMeta>;
}

export interface PagedList<T> {
  currentPage: number;
  hasNextPage: boolean;
  totalPages?: number | null;
  totalResults?: number | null;
  results: T[];
}
