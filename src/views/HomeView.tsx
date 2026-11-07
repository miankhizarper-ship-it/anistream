import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Info, Plus, Check, Star, ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTrending, getPopular, getAiringSchedule, normTitle, formatAiringCountdown } from '../lib/anilist';
import type { AnimeItem } from '../lib/types';
import { AnimeRow } from '../components/AnimeRow';
import { RowSkeleton, Spinner, ErrorState } from '../components/states';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useWatchHistory } from '../context/WatchHistoryContext';

export const HomeView: React.FC = () => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const { isSaved, toggleWatchlist } = useWatchlist();
  const { history } = useWatchHistory();

  const [heroList, setHeroList] = useState<AnimeItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [trending, setTrending] = useState<AnimeItem[]>([]);
  const [popular, setPopular] = useState<AnimeItem[]>([]);
  const [airing, setAiring] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Each row is resilient: if one feed fails the others still render
        const [trendRes, popRes, airRes] = await Promise.allSettled([
          getTrending(1, 20),
          getPopular(1, 20),
          getAiringSchedule(1, 24),
        ]);

        if (!isMounted) return;

        if (trendRes.status === 'rejected') {
          throw trendRes.reason instanceof Error ? trendRes.reason : new Error('Failed to load anime feed');
        }

        const trendList = trendRes.value.results || [];
        setTrending(trendList);
        setPopular(popRes.status === 'fulfilled' ? popRes.value.results : []);
        setAiring(airRes.status === 'fulfilled' ? airRes.value.results : []);

        const heroes = trendList.filter((item) => item.description && item.image).slice(0, 5);
        setHeroList(heroes.length > 0 ? heroes : trendList.slice(0, 5));
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load home data:', err);
          setError(err.message || 'Unable to connect to the anime service.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto rotate hero slides every 8 seconds
  useEffect(() => {
    if (heroList.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroList.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [heroList.length]);

  const heroMedia = heroList[heroIndex] || null;

  /* ---- Airing Soon rail: scroll position state for the arrow buttons ---- */
  const airingRailRef = useRef<HTMLDivElement>(null);
  const [airingEdges, setAiringEdges] = useState({ left: false, right: true });

  const updateAiringEdges = useCallback(() => {
    const el = airingRailRef.current;
    if (!el) return;
    setAiringEdges({
      left: el.scrollLeft > 10,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 10,
    });
  }, []);

  useEffect(() => {
    updateAiringEdges();
    window.addEventListener('resize', updateAiringEdges);
    return () => window.removeEventListener('resize', updateAiringEdges);
  }, [airing, updateAiringEdges]);

  const scrollAiring = (dir: -1 | 1) => {
    const el = airingRailRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  // Continue watching history mapped to card items
  const historyItems: AnimeItem[] = useMemo(
    () =>
      history.slice(0, 20).map((h) => ({
        id: h.id,
        media_type: 'anime',
        title: h.title,
        image: h.poster,
        cover: h.cover,
      })),
    [history]
  );

  const historyMap = useMemo(() => {
    const map = new Map<string, { episode: number; progress?: number }>();
    history.forEach((h) => {
      const key = String(h.id);
      const existing = map.get(key);
      if (!existing || (h.lastWatched || 0) > 0) map.set(key, { episode: h.episode, progress: h.progress });
    });
    return map;
  }, [history]);

  if (loading) {
    return (
      <div className="w-full flex flex-col pb-24">
        {/* Hero skeleton */}
        <div className="w-full h-[65vh] sm:h-[75vh] md:h-[85vh] max-h-[900px] skeleton-shimmer" />
        <RowSkeleton title="Trending Now" />
        <RowSkeleton title="Popular Anime" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="w-full flex flex-col pb-24">
      {/* Hero Showcase Spotlight */}
      {heroMedia && (
        <div className="relative w-full h-[72vh] sm:h-[78vh] md:h-[85vh] max-h-[900px] overflow-hidden select-none">
          <div className="absolute inset-0 bg-[#08060d]">
            <AnimatePresence mode="wait">
              <motion.img
                key={heroMedia.id}
                src={heroMedia.cover || heroMedia.image || ''}
                alt={normTitle(heroMedia.title)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, scale: 1.08 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="w-full h-full object-cover object-center animate-kenburns"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-[#08060d] via-[#08060d]/40 to-black/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#08060d] via-transparent to-[#08060d]/80" />
          </div>

          {/* Hero Content Details */}
          <div className="absolute inset-0 z-10 flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-12 sm:pb-16 md:pb-20">
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              {/* Featured badge + title */}
              <div className="min-h-[48px] sm:min-h-[64px]">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#d8b4fe] text-[10px] font-extrabold uppercase tracking-widest mb-2.5">
                  <Sparkles className="w-3 h-3" />
                  Trending #{heroIndex + 1}
                </div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg line-clamp-2">
                  {normTitle(heroMedia.title)}
                </h1>
              </div>

              {/* Meta Info Bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-slate-300">
                {typeof heroMedia.rating === 'number' && (
                  <div className="flex items-center gap-1 text-emerald-400 font-bold bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10">
                    <Star className="w-4 h-4 fill-emerald-400" />
                    <span>{Math.round(heroMedia.rating)}%</span>
                  </div>
                )}
                {heroMedia.type && (
                  <span className="bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10 uppercase text-[11px] font-bold">
                    {heroMedia.type}
                  </span>
                )}
                <span>{String(heroMedia.releaseDate || '').slice(0, 4)}</span>
                {heroMedia.totalEpisodes ? (
                  <span className="px-2 py-0.5 rounded border border-white/20 text-[10px] uppercase text-slate-300">
                    {heroMedia.totalEpisodes} EPS
                  </span>
                ) : heroMedia.status && (
                  <span className="px-2 py-0.5 rounded border border-white/20 text-[10px] uppercase text-slate-300">
                    {heroMedia.status}
                  </span>
                )}
              </div>

              {/* Overview Paragraph */}
              {heroMedia.description && (
                <p className="text-xs sm:text-sm md:text-base text-slate-300 line-clamp-3 leading-relaxed drop-shadow-md">
                  {heroMedia.description.replace(/<[^>]*>/g, '')}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => navigate(`/watch/${heroMedia.id}/1`)}
                  className="px-6 sm:px-8 py-3 rounded-2xl bg-[#a855f7] hover:bg-[#c084fc] text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-950/70 active:scale-95 transition-all flex items-center gap-2 cursor-pointer btn-sheen"
                >
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  <span>Watch Now</span>
                </button>

                <button
                  onClick={() => navigate(`/anime/${heroMedia.id}`)}
                  className="px-5 sm:px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-xl border border-white/15 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Info className="w-4 h-4" />
                  <span>Details</span>
                </button>

                <button
                  onClick={async () => {
                    const saved = await toggleWatchlist(heroMedia);
                    showToast(
                      saved ? `Added "${normTitle(heroMedia.title)}" to My List` : `Removed from My List`,
                      'bookmark'
                    );
                  }}
                  className={`p-3 rounded-2xl backdrop-blur-xl border transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                    isSaved(heroMedia.id)
                      ? 'bg-[#a855f7]/90 border-[#a855f7] text-white shadow-lg'
                      : 'bg-black/50 border-white/15 text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                  title={isSaved(heroMedia.id) ? 'Remove from My List' : 'Add to My List'}
                  aria-label={isSaved(heroMedia.id) ? 'Remove from My List' : 'Add to My List'}
                >
                  {isSaved(heroMedia.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              {/* Carousel Indicators */}
              {heroList.length > 1 && (
                <div className="flex items-center gap-2 pt-4">
                  {heroList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setHeroIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === heroIndex ? 'w-8 bg-[#a855f7]' : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching Row */}
      {historyItems.length > 0 && (
        <AnimeRow
          title="Continue Watching"
          items={historyItems}
          historyMode
          historyMap={historyMap as any}
          exploreLink="/mylist"
          onExploreClick={() => navigate('/mylist')}
        />
      )}

      {/* Horizontal Carousels */}
      <AnimeRow
        title="Trending Now"
        items={trending}
        exploreLink="/explore"
        onExploreClick={() => navigate('/explore')}
      />

      <AnimeRow
        title="All-Time Popular"
        items={popular}
        exploreLink="/explore"
        onExploreClick={() => navigate('/explore')}
      />

      {/* Airing Soon — premium cinematic rail */}
      {airing.length > 0 && (
        <section className="relative my-6 sm:my-8 md:my-10 group/rail">
          {/* Section header */}
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 md:px-12 mb-3 sm:mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-1 h-6 sm:h-7 rounded-full bg-gradient-to-b from-[#c084fc] to-[#a855f7] shadow-[0_0_14px_rgba(168,85,247,0.55)] shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Airing Soon
                  <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a855f7] opacity-70" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#a855f7]" />
                  </span>
                </h2>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">
                  New episodes dropping
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/explore')}
              className="group/btn flex items-center gap-2 h-9 pl-4 pr-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#a855f7]/60 hover:bg-[#a855f7]/15 text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 active:scale-95"
            >
              Browse all
              <span className="w-6 h-6 rounded-full bg-[#a855f7] flex items-center justify-center transition-transform duration-300 group-hover/btn:translate-x-0.5">
                <ChevronRight className="w-3.5 h-3.5 text-white" />
              </span>
            </button>
          </div>

          {/* Rail */}
          <div className="relative">
            <div
              ref={airingRailRef}
              onScroll={updateAiringEdges}
              className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none scroll-smooth sm:snap-x sm:snap-proximity py-3 px-4 sm:px-6 md:px-12"
            >
              {airing.slice(0, 20).map((item) => {
                const countdown = formatAiringCountdown(item.airingAt);
                const countdownShort = countdown ? countdown.replace(/^EP in /, '') : null;
                const year = String(item.releaseDate || '').slice(0, 4);
                return (
                  <div
                    key={`airing-${item.id}-${item.airingEpisode ?? 0}`}
                    onClick={() => navigate(`/anime/${item.id}`)}
                    className="sm:snap-start shrink-0 w-[230px] sm:w-[270px] group cursor-pointer"
                  >
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#12101e] transition-all duration-300 ease-out group-hover:scale-105 group-hover:border-[#a855f7]/60 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.75),0_0_28px_rgba(168,85,247,0.28)]">
                      <div className="aspect-video overflow-hidden bg-[#1a152c]">
                        <img
                          src={item.cover || item.image || ''}
                          alt={normTitle(item.title)}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          draggable={false}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 pointer-events-none select-none"
                        />
                      </div>
                      {/* Gradient overlay so the text pops against the poster */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
                      {/* Next episode badge */}
                      {item.airingEpisode ? (
                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-[#a855f7] text-white text-[10px] font-extrabold tracking-wide shadow-lg shadow-purple-950/60">
                          EP {item.airingEpisode}
                        </span>
                      ) : null}
                      {/* Glassmorphism countdown badge */}
                      {countdownShort && (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md border border-[#c084fc]/45 shadow-[0_0_16px_rgba(168,85,247,0.4)]">
                          <Clock className="w-3 h-3 text-[#c084fc]" />
                          <span className="text-[10px] font-extrabold text-white tabular-nums tracking-wide">
                            {countdownShort}
                          </span>
                        </div>
                      )}
                      {/* Title block */}
                      <div className="absolute bottom-0 inset-x-0 z-10 p-3 pt-8">
                        <p className="text-[13px] font-bold text-white line-clamp-1 leading-snug drop-shadow-sm">
                          {normTitle(item.title)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold text-slate-300">
                          {item.type ? (
                            <span className="uppercase tracking-wide text-[#c084fc]">{String(item.type)}</span>
                          ) : null}
                          {year ? (
                            <>
                              <span className="text-slate-500">·</span>
                              <span className="tabular-nums">{year}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scroll buttons (desktop, fade in on rail hover) */}
            {airingEdges.left && (
              <button
                onClick={() => scrollAiring(-1)}
                className="hidden md:flex absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-[#0d0a18]/85 backdrop-blur-xl border border-white/15 text-white shadow-2xl transition-all duration-200 hover:bg-[#a855f7] hover:border-[#a855f7] hover:scale-110 active:scale-95 cursor-pointer opacity-0 group-hover/rail:opacity-100"
                aria-label="Scroll Airing Soon left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {airingEdges.right && (
              <button
                onClick={() => scrollAiring(1)}
                className="hidden md:flex absolute right-3 lg:right-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-[#0d0a18]/85 backdrop-blur-xl border border-white/15 text-white shadow-2xl transition-all duration-200 hover:bg-[#a855f7] hover:border-[#a855f7] hover:scale-110 active:scale-95 cursor-pointer opacity-0 group-hover/rail:opacity-100"
                aria-label="Scroll Airing Soon right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* AniStream Android App Teaser (Desktop only) */}
      <section className="my-10 px-4 sm:px-6 md:px-12 hidden lg:block">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#12101e] via-[#150f28] to-[#a855f7]/10 border border-[#a855f7]/20 p-6 sm:p-8 md:p-10 shadow-2xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a855f7]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#c084fc] text-xs font-bold uppercase tracking-wider">
                <span>Android App · Coming Soon</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-ping" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                AniStream is coming to <span className="bg-gradient-to-r from-[#c084fc] to-[#a855f7] bg-clip-text text-transparent">Android</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Offline episode downloads, synced watch history, and a beautiful anime-first
                player — the same account works across web and mobile.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <button
                  onClick={() => navigate('/explore')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#7c3aed] hover:from-[#c084fc] hover:to-[#a855f7] text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-950/80 active:scale-95 transition-all"
                >
                  Start Watching Now
                </button>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-3xl bg-[#08060d] border border-[#a855f7]/30 shadow-2xl accent-glow flex items-center justify-center rotate-3">
                <svg viewBox="0 0 512 512" className="w-24 h-24">
                  <defs>
                    <linearGradient id="home-cta-acc" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
                      <stop offset="0" stopColor="#c98bff" />
                      <stop offset="0.5" stopColor="#a855f7" />
                      <stop offset="1" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M198 168 L348 250 Q364 259 364 268 Q364 277 348 286 L198 368 Q180 378 168 367 Q156 356 156 334 L156 202 Q156 180 168 169 Q180 158 198 168 Z"
                    fill="url(#home-cta-acc)"
                  />
                  <path
                    d="M382 96 C389 127 403 141 434 148 C403 155 389 169 382 200 C375 169 361 155 330 148 C361 141 375 127 382 96 Z"
                    fill="#f3e8ff"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Genre quick chips */}
      <section className="px-4 sm:px-6 md:px-12 mt-2 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 bg-[#a855f7] rounded-full inline-block" />
          <h3 className="text-base sm:text-lg font-bold text-white">Browse by Genre</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Mystery', 'Psychological'].map((genre) => (
            <button
              key={genre}
              onClick={() => navigate(`/explore/${encodeURIComponent(genre)}`)}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-[#a855f7]/15 hover:border-[#a855f7]/40 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              {genre}
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
