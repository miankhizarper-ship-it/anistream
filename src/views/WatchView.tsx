import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, Bookmark, List, ExternalLink, PanelRightClose, PanelRightOpen, Star } from 'lucide-react';
import { getAnimeInfo, normTitle } from '../lib/anilist';
import { yenimeEmbedUrl } from '../config';
import type { AnimeInfo } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useWatchHistory } from '../context/WatchHistoryContext';
import { Spinner, ErrorState } from '../components/states';
import { EpisodeGrid } from '../components/EpisodeGrid';

interface WatchViewProps {
  id: string;
  episode: string;
}

/**
 * Immersive player page.
 * - Streams via the Yenime embed player in an iframe (sub / ?dub=1)
 * - Listens to PLAYER_EVENT postMessages (play|pause|seeked|ended|timeupdate)
 * - Persists progress to watch history (localStorage + Clerk unsafeMetadata)
 */
export const WatchView: React.FC<WatchViewProps> = ({ id, episode }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const { isSaved, toggleWatchlist } = useWatchlist();
  const { addOrUpdateHistory, updateProgress, getAnimeProgress } = useWatchHistory();

  const [info, setInfo] = useState<AnimeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reloadEpKey, setReloadEpKey] = useState(0);

  const currentEpisode = Math.max(1, Number(episode) || 1);
  const [dub] = useState<boolean>(() => new URLSearchParams(window.location.search).get('dub') === '1');
  /* Episodes sidebar: expanded by default, slides to/from the right on toggle */
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const lastSavedTimeRef = useRef<number>(0);
  const metaSavedRef = useRef<number>(0);

  /* Load anime info (for title, episode count, recommendations) */
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAnimeInfo(id);
        if (!isMounted) return;
        setInfo(data);
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load anime info for player:', err);
          setError(err.message || 'Failed to load this anime.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [id, reloadKey]);

  /* Register history entry when the episode page opens */
  useEffect(() => {
    if (!info) return;
    const existing = getAnimeProgress(info.id);
    if (!existing || existing.episode !== currentEpisode) {
      addOrUpdateHistory({
        id: info.id,
        media_type: 'anime',
        title: normTitle(info.title),
        poster: info.image || null,
        cover: info.cover || info.image || null,
        episode: currentEpisode,
        currentTime: existing?.currentTime ?? 0,
        duration: existing?.duration ?? 0,
        progress: 0,
      });
    }
    metaSavedRef.current = currentEpisode;
  }, [info, currentEpisode, addOrUpdateHistory, getAnimeProgress]);

  /* Persist player progress via PLAYER_EVENT messages */
  const handlePlayerEvent = useCallback(
    (eventData: { event: string; currentTime?: number; duration?: number }) => {
      if (!info) return;
      const { event, currentTime, duration } = eventData;

      if (typeof currentTime !== 'number' || Number.isNaN(currentTime)) return;

      // Throttle heavy work to at most once per 4 seconds
      const now = Date.now();
      if (event !== 'ended' && now - lastSavedTimeRef.current < 4000) return;
      lastSavedTimeRef.current = now;

      if (event === 'ended') {
        updateProgress(info.id, currentEpisode, currentTime, duration || 0);
        // progress becomes 100 via updateProgress math (currentTime ~ duration)
        return;
      }

      if (event === 'play' || event === 'timeupdate' || event === 'seeked' || event === 'pause') {
        // First tick of this episode: ensure entry exists with meta, then update progress
        updateProgress(info.id, currentEpisode, currentTime, duration);
      }
    },
    [info, currentEpisode, updateProgress]
  );

  /* Listen to postMessages from the Yenime player */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'PLAYER_EVENT') return;
      const { event, currentTime, duration } = e.data.data || {};
      handlePlayerEvent({ event, currentTime, duration });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handlePlayerEvent]);

  /* Keyboard shortcuts: left/right arrows for episode navigation */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' && info) {
        goToEpisode(currentEpisode + 1);
      } else if (e.key === 'ArrowLeft' && currentEpisode > 1) {
        goToEpisode(currentEpisode - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentEpisode, info]);

  const goToEpisode = (ep: number) => {
    if (ep < 1) return;
    if (info && info.episodeList && info.episodeList.length > 0 && ep > info.episodeList[info.episodeList.length - 1]) return;
    navigate(`/watch/${id}/${ep}${dub ? '?dub=1' : ''}`);
    setReloadEpKey((k) => k + 1);
  };

  if (loading) return <Spinner label="Preparing your episode" />;

  if (error || !info) {
    return (
      <ErrorState
        message={error || 'This anime could not be found.'}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const title = normTitle(info.title);
  const nativeTitle = typeof info.title === 'object' ? info.title?.native || info.title?.romaji : '';
  const saved = isSaved(info.id);
  const episodes = info.episodeList || [];
  const hasPrev = currentEpisode > 1;
  const hasNext = episodes.length === 0 || currentEpisode < episodes[episodes.length - 1];

  return (
    <div className="w-full min-h-[100dvh] bg-[#08060d] flex flex-col pb-24">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/95 via-black/70 to-transparent pt-safe">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
          {/* Back — always to the details page (home is handled by the details page) */}
          <button
            onClick={() => navigate(`/anime/${id}`)}
            className="p-2.5 rounded-full bg-white/8 hover:bg-white/15 backdrop-blur-xl border border-white/15 text-white transition-all active:scale-95 cursor-pointer shrink-0"
            aria-label="Back to details"
            title="Back to details"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-extrabold text-white line-clamp-1 leading-tight">{title}</p>
            <p className="text-[11px] font-bold text-[#c084fc] uppercase tracking-wider mt-0.5">
              Episode {currentEpisode}
              {info.totalEpisodes ? ` of ${info.totalEpisodes}` : ''}
              {dub && ' · DUB'}
            </p>
          </div>

          {/* Expand / collapse the episodes sidebar (slides to & from the right) */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`p-2.5 rounded-full backdrop-blur-xl border transition-all active:scale-95 cursor-pointer shrink-0 ${
              sidebarOpen
                ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-lg'
                : 'bg-white/8 border-white/15 text-slate-200 hover:bg-white/15'
            }`}
            title={sidebarOpen ? 'Hide episodes panel' : 'Show episodes panel'}
            aria-label="Toggle episodes panel"
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>

          <button
            onClick={async () => {
              const nowSaved = await toggleWatchlist(info);
              showToast(nowSaved ? `Added "${title}" to My List` : `Removed from My List`, 'bookmark');
            }}
            className={`p-2.5 rounded-full backdrop-blur-xl border transition-all active:scale-95 cursor-pointer shrink-0 ${
              saved
                ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-lg'
                : 'bg-white/8 border-white/15 text-slate-200 hover:bg-white/15'
            }`}
            title={saved ? 'Remove from My List' : 'Add to My List'}
            aria-label={saved ? 'Remove from My List' : 'Add to My List'}
          >
            {saved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Player + Episodes Sidebar.
          When the sidebar is hidden the container stretches beyond its normal
          1400px cap to the full screen width so the player grows with it
          (theater-style); height follows automatically via the 16:9 ratio. */}
      <div
        className="w-full mx-auto px-4 sm:px-6 mt-[76px] transition-[max-width] duration-300 ease-out"
        style={{ maxWidth: sidebarOpen ? '1400px' : '100%' }}
      >
        <div className={`flex flex-col lg:flex-row lg:items-start ${sidebarOpen ? 'gap-4 lg:gap-5' : 'gap-0'}`}>
          {/* Left column — player & episode navigation */}
          <div className="flex-1 min-w-0">
            {/* 16:9 player. Its max-width is derived from the viewport height so
                the whole player (plus controls) always fits the screen without
                scrolling — it grows when the sidebar is hidden, shrinks on
                short/wide screens, and stays centered. */}
            <div className="relative w-full aspect-video max-w-[calc((100dvh_-_160px)*16/9)] mx-auto rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl shadow-black/80">
              <iframe
                key={`${id}-${currentEpisode}-${dub}-${reloadEpKey}`}
                src={yenimeEmbedUrl(id, currentEpisode, dub)}
                title={`${title} - Episode ${currentEpisode}`}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="origin"
                /* Lightweight embed adblocker: without allow-popups the
                   embed's popunder ads can't open background tabs, and
                   without allow-top-navigation they can't hijack the page.
                   Playback (scripts/same-origin/forms/presentation) stays
                   fully enabled. */
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock"
              />
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between gap-3 py-4">
              <button
                onClick={() => goToEpisode(currentEpisode - 1)}
                disabled={!hasPrev}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  hasPrev
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer'
                    : 'bg-white/5 text-slate-600 border border-white/8 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#d8b4fe] text-xs font-bold tabular-nums select-none">
                EP {currentEpisode}
                {episodes.length > 0 ? ` / ${episodes.length}` : ''}
              </span>

              <button
                onClick={() => goToEpisode(currentEpisode + 1)}
                disabled={!hasNext}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  hasNext
                    ? 'bg-[#a855f7] hover:bg-[#c084fc] text-white shadow-lg shadow-purple-950/60 border border-transparent cursor-pointer'
                    : 'bg-white/5 text-slate-600 border border-white/8 cursor-not-allowed'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Anime details below the player (responsive) */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0a18] p-4 sm:p-5 shadow-xl shadow-black/40 mb-2">
              <div className="flex items-start gap-3.5 sm:gap-4">
                <img
                  src={info.image || ''}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-xl border border-white/10 shadow-lg shrink-0 bg-[#12101e]"
                />

                <div className="flex-1 min-w-0">
                  <h2 className="text-sm sm:text-base font-extrabold text-white leading-snug">{title}</h2>
                  {nativeTitle && nativeTitle !== title && (
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{nativeTitle}</p>
                  )}

                  {/* Meta chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] font-bold">
                    {typeof info.rating === 'number' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-400/25 text-emerald-400 tabular-nums">
                        <Star className="w-2.5 h-2.5 fill-emerald-400" />
                        {Math.round(info.rating)}%
                      </span>
                    )}
                    {info.releaseDate && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 tabular-nums">
                        {String(info.releaseDate).slice(0, 4)}
                      </span>
                    )}
                    {info.type && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                        {info.type === 'TV' ? 'TV Series' : info.type}
                      </span>
                    )}
                    {info.totalEpisodes ? (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 tabular-nums">
                        {info.totalEpisodes} eps
                      </span>
                    ) : null}
                    {info.duration ? (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 tabular-nums">
                        {info.duration} min
                      </span>
                    ) : null}
                    {info.status && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                        {info.status}
                      </span>
                    )}
                  </div>

                  {/* Genres */}
                  {info.genres && info.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {info.genres.slice(0, 5).map((genre) => (
                        <span
                          key={genre}
                          className="px-2 py-0.5 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/25 text-[9px] sm:text-[10px] font-bold text-[#d8b4fe]"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Synopsis */}
                  {info.description && (
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed mt-2.5 line-clamp-3">
                      {info.description.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ')}
                    </p>
                  )}

                  <button
                    onClick={() => navigate(`/anime/${info.id}`)}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#c084fc] hover:text-white transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View full details &amp; synopsis
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right column — Episodes Sidebar (collapsible; slides to/from the right
              on desktop, hides below the player on mobile) */}
          <aside
            className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
              sidebarOpen
                ? 'w-full lg:w-[330px] xl:w-[350px] opacity-100'
                : 'lg:w-0 lg:opacity-0 lg:pointer-events-none max-lg:hidden'
            }`}
            aria-hidden={!sidebarOpen}
          >
            <div className="rounded-2xl border border-white/10 bg-[#0d0a18] overflow-hidden shadow-xl shadow-black/40">
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.03]">
                <div className="flex items-center gap-2 text-white">
                  <List className="w-4 h-4 text-[#a855f7]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-widest">Episodes</h3>
                </div>
                {(episodes.length > 0 || info.totalEpisodes) && (
                  <span className="text-[10px] font-extrabold tabular-nums text-[#c084fc] bg-[#a855f7]/12 border border-[#a855f7]/25 px-2 py-0.5 rounded-full">
                    {episodes.length > 0 ? episodes.length : info.totalEpisodes} EP
                  </span>
                )}
              </div>

              {/* Scrollable episode list */}
              <div className="p-3">
                {episodes.length > 0 ? (
                  <EpisodeGrid
                    animeId={info.id}
                    episodes={episodes}
                    currentEpisode={currentEpisode}
                    onSelect={goToEpisode}
                    scrollClassName="max-h-[300px] sm:max-h-[420px] lg:max-h-[500px]"
                  />
                ) : (
                  <p className="text-xs text-slate-500 font-medium py-6 text-center">
                    Episode list unavailable for this title — use Previous / Next to navigate.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
