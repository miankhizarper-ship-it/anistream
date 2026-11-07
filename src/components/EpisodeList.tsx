import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, Clock, LayoutGrid, List, Play, Star, Tv } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWatchHistory } from '../context/WatchHistoryContext';
import type { EpisodeMeta } from '../lib/types';

export interface SeasonOption {
  id: string;
  label: string;
  title: string;
  year: string;
  /** episode count when the source provides it (shown in the dropdown) */
  eps?: number | null;
}

interface EpisodeListProps {
  animeId: string;
  episodes: number[];
  episodeMeta?: Record<string, EpisodeMeta>;
  /** show-level duration in minutes */
  duration?: number | null;
  /** show-level rating (0-100) */
  rating?: number | null;
  seasons: SeasonOption[];
  /** id of the season whose episodes are currently displayed */
  activeSeasonId: string;
  /** true while another season's episodes are being fetched */
  seasonLoading?: boolean;
  currentEpisode: number;
  onSelect: (episode: number) => void;
  /** pick a season from the dropdown — parent swaps the episode list in place */
  onSeasonChange: (seasonId: string) => void;
}

type ViewMode = 'grid' | 'list';

const VIEW_STORAGE_KEY = 'anistream_episode_view_mode';

const fmtAirDate = (secs?: number | null): string => {
  if (!secs) return '';
  const d = new Date(secs * 1000);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const padEp = (n: number): string => String(n).padStart(2, '0');

/* ----------------------------- Episode card (grid) ----------------------------- */

const EpisodeCard: React.FC<{
  ep: number;
  meta?: EpisodeMeta;
  duration?: number | null;
  isCurrent: boolean;
  isWatched: boolean;
  onSelect: (ep: number) => void;
}> = ({ ep, meta, duration, isCurrent, isWatched, onSelect }) => {
  const epTitle = meta?.title || null;
  const airDate = fmtAirDate(meta?.airAt);
  const thumb = meta?.thumbnail || null;

  return (
    <button
      onClick={() => onSelect(ep)}
      className={`group/ep relative w-full text-left rounded-2xl overflow-hidden bg-[#12101e] border transition-all duration-300 cursor-pointer flex flex-col shadow-lg hover:border-[#a855f7]/60 hover:bg-[#151222] hover:shadow-[0_14px_36px_rgba(0,0,0,0.7),0_0_22px_rgba(168,85,247,0.22)] active:scale-[0.98] ${
        isCurrent ? 'border-[#a855f7] ring-1 ring-[#a855f7]/60' : 'border-white/[0.08]'
      }`}
      title={`Episode ${ep}`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-[#1a152c] to-[#0d0a18]">
        {thumb ? (
          <img
            src={thumb}
            alt={epTitle || `Episode ${ep}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            draggable={false}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover/ep:scale-105 pointer-events-none select-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-black text-white/10 tabular-nums select-none">{padEp(ep)}</span>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ep:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#a855f7] text-white flex items-center justify-center shadow-lg group-hover/ep:scale-105 transition-transform">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        {/* EP number badge (glassmorphism) */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-extrabold tracking-widest text-white border border-white/10 pointer-events-none">
          EP {padEp(ep)}
        </span>

        {/* Current / watched markers */}
        {isCurrent ? (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-[#a855f7] text-white text-[9px] font-extrabold uppercase tracking-wide shadow-lg accent-glow-sm pointer-events-none">
            Now watching
          </span>
        ) : isWatched ? (
          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-md pointer-events-none">
            <Check className="w-3 h-3 text-white" />
          </span>
        ) : null}

        {/* Duration badge (glassmorphism) */}
        {duration ? (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-bold text-slate-200 tabular-nums pointer-events-none">
            <Clock className="w-2.5 h-2.5" />
            {duration}m
          </span>
        ) : null}
      </div>

      {/* Text block */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 leading-snug group-hover/ep:text-[#c084fc] transition-colors">
              {epTitle || `Episode ${ep}`}
            </h4>
            {isWatched && !isCurrent && (
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 shrink-0">Watched</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {meta?.description || 'No description available for this episode.'}
          </p>
        </div>

        {airDate && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-white/5">
            <Calendar className="w-3 h-3" />
            <span className="tabular-nums">{airDate}</span>
          </div>
        )}
      </div>
    </button>
  );
};

/* ----------------------------- Episode row (list) ----------------------------- */

const EpisodeRow: React.FC<{
  ep: number;
  meta?: EpisodeMeta;
  duration?: number | null;
  isCurrent: boolean;
  isWatched: boolean;
  onSelect: (ep: number) => void;
}> = ({ ep, meta, duration, isCurrent, isWatched, onSelect }) => {
  const epTitle = meta?.title || null;
  const airDate = fmtAirDate(meta?.airAt);
  const thumb = meta?.thumbnail || null;

  return (
    <button
      onClick={() => onSelect(ep)}
      className={`group/row relative w-full text-left rounded-2xl overflow-hidden bg-[#12101e] border transition-all duration-300 cursor-pointer p-3 sm:p-4 flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-start sm:items-center shadow-lg hover:border-[#a855f7]/50 hover:bg-[#161325] active:scale-[0.99] ${
        isCurrent ? 'border-[#a855f7]/70 bg-[#a855f7]/[0.06]' : 'border-white/[0.08]'
      }`}
      title={`Episode ${ep}`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      {/* Thumbnail */}
      <div className="w-full sm:w-52 md:w-64 aspect-video shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#1a152c] to-[#0d0a18] relative">
        {thumb ? (
          <img
            src={thumb}
            alt={epTitle || `Episode ${ep}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            draggable={false}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover/row:scale-105 pointer-events-none select-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-black text-white/10 tabular-nums select-none">{padEp(ep)}</span>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#a855f7] text-white flex items-center justify-center shadow-lg group-hover/row:scale-105 transition-transform">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-extrabold tracking-widest text-white border border-white/10 pointer-events-none">
          EP {padEp(ep)}
        </span>
        {duration ? (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-bold text-slate-200 tabular-nums pointer-events-none">
            <Clock className="w-2.5 h-2.5" />
            {duration}m
          </span>
        ) : null}
      </div>

      {/* Metadata and synopsis */}
      <div className="flex-1 min-w-0 w-full flex flex-col justify-between self-stretch">
        <div>
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[11px] font-bold text-[#c084fc] bg-[#a855f7]/15 px-2 py-0.5 rounded-md border border-[#a855f7]/25 shrink-0 tabular-nums">
                Episode {ep}
              </span>
              {isCurrent && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#d8b4fe] bg-[#a855f7]/20 border border-[#a855f7]/40 rounded px-1.5 py-px shrink-0">
                  Resume
                </span>
              )}
              <h4 className="text-sm sm:text-base font-bold text-white group-hover/row:text-[#c084fc] transition-colors line-clamp-1">
                {epTitle || `Episode ${ep}`}
              </h4>
            </div>
            {isWatched && !isCurrent && (
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20 shrink-0">
                <Check className="w-3 h-3" />
                Watched
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 sm:line-clamp-3 leading-relaxed mt-1">
            {meta?.description || 'No synopsis available for this episode.'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/5 text-[11px]">
          <div className="flex items-center gap-3 text-slate-500">
            {airDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span className="tabular-nums">{airDate}</span>
              </div>
            )}
            {duration ? <span className="hidden sm:inline tabular-nums">· {duration} mins</span> : null}
          </div>

          <div className="flex items-center gap-1.5 text-[#c084fc] font-semibold group-hover/row:translate-x-1 transition-transform">
            <Play className="w-3 h-3 fill-[#c084fc]" />
            <span className="text-xs">Play Episode</span>
          </div>
        </div>
      </div>
    </button>
  );
};

/* --------------------------------- Section --------------------------------- */

export const EpisodeList: React.FC<EpisodeListProps> = ({
  animeId,
  episodes,
  episodeMeta,
  duration = null,
  rating = null,
  seasons,
  activeSeasonId,
  seasonLoading = false,
  currentEpisode,
  onSelect,
  onSeasonChange,
}) => {
  const { history } = useWatchHistory();
  const [seasonOpen, setSeasonOpen] = useState(false);
  const seasonRef = useRef<HTMLDivElement>(null);

  // View mode toggle: 'grid' or 'list' with local persistence
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setView(mode);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      // ignore storage failure
    }
  };

  const watchedSet = useMemo(() => {
    const s = new Set<number>();
    history.forEach((h) => {
      if (String(h.id) === String(animeId)) s.add(h.episode);
    });
    return s;
  }, [history, animeId]);

  // Close the season dropdown on outside click / Escape
  useEffect(() => {
    if (!seasonOpen) return;
    const onDown = (e: MouseEvent) => {
      if (seasonRef.current && !seasonRef.current.contains(e.target as Node)) setSeasonOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSeasonOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [seasonOpen]);

  /* Complete list rendering — every episode of the selected season is shown.
     For very long shows (One Piece & friends) cards are appended automatically
     in chunks via an IntersectionObserver sentinel, so even 1000+ episode
     lists stay smooth with no "Load more" button. */
  const CHUNK_SIZE = 120;
  const [renderCount, setRenderCount] = useState(CHUNK_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Restart from the first chunk whenever the episode set or layout changes
  useEffect(() => {
    setRenderCount(CHUNK_SIZE);
  }, [animeId, episodes, view]);

  const hasMoreChunks = renderCount < episodes.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMoreChunks) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRenderCount((c) => Math.min(c + CHUNK_SIZE, episodes.length));
        }
      },
      { rootMargin: '900px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreChunks, episodes.length]);

  const visibleEpisodes = useMemo(() => episodes.slice(0, renderCount), [episodes, renderCount]);
  // Stagger animation only for short lists — keeps huge lists instant
  const richAnimation = episodes.length <= 60;

  /* ---- Internal-scroll viewport ----
     Long seasons scroll INSIDE this panel (fixed max-height) instead of
     stretching the whole details page. When the inner scroll reaches the end,
     chaining continues the normal page scroll. */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [innerScrollable, setInnerScrollable] = useState(false);
  const [innerAtBottom, setInnerAtBottom] = useState(false);

  const handleInnerScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setInnerAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 56);
  };

  // Measure whether the viewport actually clips content (drives the fade hint)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      setInnerScrollable(false);
      return;
    }
    const measure = () => setInnerScrollable(el.scrollHeight > el.clientHeight + 8);
    measure();
    // re-measure once chunked cards / thumbnails have settled in
    const t = window.setTimeout(measure, 450);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [episodes, renderCount, view, seasonLoading, visibleEpisodes.length]);

  // Jump back to the top of the panel whenever the season or layout changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setInnerAtBottom(false);
  }, [animeId, activeSeasonId, view]);

  const activeSeason = seasons.find((s) => s.id === activeSeasonId);

  return (
    <div>
      {/* Controls row — meta chips + season dropdown + view mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-[10px] font-extrabold tabular-nums tracking-wide text-slate-300">
            {episodes.length} EPISODES
          </span>
          {rating !== null && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-[10px] font-extrabold text-emerald-400">
              <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
              <span className="tabular-nums">{Math.round(rating)}%</span>
            </span>
          )}
          {duration ? (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-[10px] font-extrabold text-slate-300 tabular-nums">
              <Clock className="w-3 h-3" />
              {duration}m / ep
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Season selector dropdown */}
          <div ref={seasonRef} className="relative">
            <button
              type="button"
              onClick={() => (seasons.length > 1 ? setSeasonOpen((v) => !v) : undefined)}
              aria-haspopup="listbox"
              aria-expanded={seasonOpen}
              className={`flex items-center justify-between gap-2.5 h-10 px-3 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all cursor-pointer select-none ${
                seasonOpen
                  ? 'bg-[#1a152c] border-[#a855f7]/60 text-white shadow-lg shadow-purple-950/30'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/8 hover:border-white/20 active:scale-[0.99]'
              } ${seasons.length > 1 ? '' : 'cursor-default'}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/30 flex items-center justify-center text-[#c084fc] shrink-0">
                  <Tv className="w-3.5 h-3.5" />
                </span>
                <span className="flex items-baseline gap-1.5 truncate">
                  <span className="truncate font-bold text-white">{activeSeason?.label ?? 'Season 1'}</span>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
                    ({episodes.length} eps)
                  </span>
                </span>
              </span>
              {seasons.length > 1 && (
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    seasonOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              )}
            </button>

            {/* Animated popover menu */}
            <AnimatePresence>
              {seasonOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  role="listbox"
                  aria-label="Season selection"
                  className="absolute left-0 top-full mt-2 w-64 sm:left-auto sm:right-0 sm:w-72 bg-[#0d0a18]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 py-1.5 z-40 overflow-hidden"
                >
                  {/* Header info */}
                  <div className="px-3.5 py-2 border-b border-white/[0.08] flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Select Season</span>
                    <span className="text-slate-500 font-semibold normal-case tabular-nums">
                      {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}
                    </span>
                  </div>

                  {/* Season list */}
                  <div className="max-h-72 overflow-y-auto overscroll-contain scrollbar-slim p-1.5 space-y-1">
                    {seasons.map((s) => {
                      const isSelected = s.id === activeSeasonId;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSeasonOpen(false);
                            onSeasonChange(s.id);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#a855f7] text-white shadow-md shadow-purple-950/50'
                              : 'text-slate-300 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12]'
                          }`}
                        >
                          <span className="min-w-0 pr-2">
                            <span className="flex items-center gap-2 text-xs font-bold">
                              {s.label}
                              {s.year && (
                                <span
                                  className={`text-[10px] font-semibold tabular-nums ${
                                    isSelected ? 'text-purple-100/80' : 'text-slate-500'
                                  }`}
                                >
                                  {s.year}
                                </span>
                              )}
                            </span>
                            <span
                              className={`block text-[10px] truncate mt-0.5 ${
                                isSelected ? 'text-purple-100/70' : 'text-slate-500'
                              }`}
                            >
                              {s.title}
                            </span>
                          </span>

                          <span className="flex items-center gap-2 shrink-0">
                            {s.id === activeSeasonId ? (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold tabular-nums ${
                                  isSelected ? 'bg-black/30 text-purple-100' : 'bg-white/5 text-slate-400'
                                }`}
                              >
                                {episodes.length} eps
                              </span>
                            ) : s.eps ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold tabular-nums bg-white/5 text-slate-400">
                                {s.eps} eps
                              </span>
                            ) : null}
                            {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View mode toggle (Grid / List) with sliding pill */}
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner shrink-0">
            {(['grid', 'list'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleViewModeChange(m)}
                aria-label={m === 'grid' ? 'Grid layout' : 'List layout'}
                aria-pressed={view === m}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer select-none ${
                  view === m ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {view === m && (
                  <motion.div
                    layoutId="episodes-view-mode-pill"
                    className="absolute inset-0 bg-[#a855f7] rounded-lg shadow-md shadow-purple-950/60"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                {m === 'grid' ? (
                  <LayoutGrid className="w-3.5 h-3.5 relative z-10" />
                ) : (
                  <List className="w-3.5 h-3.5 relative z-10" />
                )}
                <span className="hidden sm:inline relative z-10">{m === 'grid' ? 'Grid' : 'List'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {seasonLoading ? (
        /* Loading another season's episodes in place */
        <div className="flex items-center justify-center gap-3 py-16 text-xs font-semibold text-slate-400">
          <span className="w-5 h-5 border-2 border-[#a855f7]/30 border-t-[#a855f7] rounded-full animate-spin" />
          Loading season episodes…
        </div>
      ) : visibleEpisodes.length === 0 ? (
        <div className="text-center py-12 bg-[#12101e] rounded-2xl border border-white/[0.08]">
          <p className="text-xs text-slate-400">No episodes found for this season.</p>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleInnerScroll}
            className="max-h-[78vh] sm:max-h-[640px] overflow-y-auto scrollbar-slim -mx-1 px-1 pt-1"
          >
            <AnimatePresence mode="wait">
          {view === 'grid' ? (
            /* ================= GRID VIEW ================= */
            <motion.div
              key={`grid-season-${animeId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5"
            >
              {visibleEpisodes.map((ep, idx) => (
                <div key={ep} className="[content-visibility:auto] [contain-intrinsic-size:auto_340px]">
                  {richAnimation ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.18,
                        delay: idx < CHUNK_SIZE ? Math.min(idx * 0.015, 0.25) : 0,
                      }}
                    >
                      <EpisodeCard
                        ep={ep}
                        meta={episodeMeta?.[String(ep)]}
                        duration={duration}
                        isCurrent={ep === currentEpisode}
                        isWatched={watchedSet.has(ep)}
                        onSelect={onSelect}
                      />
                    </motion.div>
                  ) : (
                    <EpisodeCard
                      ep={ep}
                      meta={episodeMeta?.[String(ep)]}
                      duration={duration}
                      isCurrent={ep === currentEpisode}
                      isWatched={watchedSet.has(ep)}
                      onSelect={onSelect}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          ) : (
            /* ================= LIST VIEW ================= */
            <motion.div
              key={`list-season-${animeId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="flex flex-col gap-3"
            >
              {visibleEpisodes.map((ep, idx) => (
                <div key={ep} className="[content-visibility:auto] [contain-intrinsic-size:auto_180px]">
                  {richAnimation ? (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.18,
                        delay: idx < CHUNK_SIZE ? Math.min(idx * 0.015, 0.25) : 0,
                      }}
                    >
                      <EpisodeRow
                        ep={ep}
                        meta={episodeMeta?.[String(ep)]}
                        duration={duration}
                        isCurrent={ep === currentEpisode}
                        isWatched={watchedSet.has(ep)}
                        onSelect={onSelect}
                      />
                    </motion.div>
                  ) : (
                    <EpisodeRow
                      ep={ep}
                      meta={episodeMeta?.[String(ep)]}
                      duration={duration}
                      isCurrent={ep === currentEpisode}
                      isWatched={watchedSet.has(ep)}
                      onSelect={onSelect}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

            {/* Auto-append sentinel — keeps loading the remaining episodes as
                the user scrolls the panel, until the complete list is rendered */}
            {hasMoreChunks && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center gap-2 py-6 text-[11px] font-semibold text-slate-500"
              >
                <span className="w-4 h-4 border-2 border-[#a855f7]/30 border-t-[#a855f7] rounded-full animate-spin" />
                Loading more episodes…
              </div>
            )}
          </div>

          {/* Bottom fade — hints there is more to scroll inside the panel */}
          {innerScrollable && !innerAtBottom && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#08060d] via-[#08060d]/85 to-transparent" />
          )}
        </div>
      )}
    </div>
  );
};
