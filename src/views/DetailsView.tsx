import React, { useEffect, useMemo, useState } from 'react';
import { Play, Plus, Check, Star, ChevronLeft, Share2, ChevronDown, Clock, Calendar, Clapperboard, Tv } from 'lucide-react';
import { motion } from 'motion/react';
import { getAnimeInfo, normTitle, formatAiringCountdown } from '../lib/anilist';
import type { AnimeInfo, AnimeItem } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useWatchHistory } from '../context/WatchHistoryContext';
import { DetailSkeleton, ErrorState } from '../components/states';
import { EpisodeList, type SeasonOption } from '../components/EpisodeList';
import { CastRail } from '../components/CastRail';
import { AnimeRow } from '../components/AnimeRow';

interface DetailsViewProps {
  id: string;
}

export const DetailsView: React.FC<DetailsViewProps> = ({ id }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const { isSaved, toggleWatchlist } = useWatchlist();
  const { getAnimeProgress } = useWatchHistory();

  const [info, setInfo] = useState<AnimeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  /* In-place season switching: picking another season in the dropdown swaps the
     episode list right here on the page — no navigation away. */
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonInfo, setSeasonInfo] = useState<AnimeInfo | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setInfo(null);
        const data = await getAnimeInfo(id);
        if (!isMounted) return;
        setInfo(data);
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load anime info:', err);
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

  // Reset the season selection whenever the route changes to another anime
  useEffect(() => {
    setSelectedSeasonId(null);
    setSeasonInfo(null);
  }, [id]);

  /* Fetch the selected season's full info so its episodes render in place */
  useEffect(() => {
    if (!selectedSeasonId || !info || selectedSeasonId === String(info.id)) {
      setSeasonInfo(null);
      return;
    }
    let isMounted = true;
    setSeasonLoading(true);
    getAnimeInfo(selectedSeasonId)
      .then((data) => {
        if (isMounted) setSeasonInfo(data);
      })
      .catch(() => {
        if (isMounted) {
          setSeasonInfo(null);
          setSelectedSeasonId(null);
        }
      })
      .finally(() => {
        if (isMounted) setSeasonLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId, info]);

  /* ---- Season dropdown: self + prequel/sequel relations sorted chronologically ----
     NOTE: this hook MUST sit above the loading/error early-returns (Rules of Hooks). */
  const seasons: SeasonOption[] = useMemo(() => {
    if (!info) return [];
    const seen = new Set<string>([String(info.id)]);
    const entries: Array<{ id: string; title: AnimeInfo['title']; year: number | null; eps: number | null }> = [
      { id: String(info.id), title: info.title, year: Number(info.releaseDate) || null, eps: info.totalEpisodes ?? null },
    ];
    (info.relations || []).forEach((r) => {
      const rel = String(r.relationType || '').toUpperCase();
      const fmt = String(r.type || '').toUpperCase();
      if (!['PREQUEL', 'SEQUEL', 'PARENT'].includes(rel)) return;
      if (!['TV', 'TV_SHORT', 'ONA'].includes(fmt)) return;
      const rid = String(r.id);
      if (seen.has(rid)) return;
      seen.add(rid);
      entries.push({ id: rid, title: r.title, year: Number(r.releaseDate) || null, eps: r.episodes ?? null });
    });
    entries.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    return entries.map((e, i) => ({
      id: e.id,
      label: `Season ${i + 1}`,
      title: normTitle(e.title),
      year: e.year ? String(e.year) : '',
      eps: e.eps,
    }));
  }, [info]);

  /* Home-page style card list for the "More Like This" rail */
  const recItems: AnimeItem[] = useMemo(
    () =>
      (info?.recommendations || []).map((r) => ({
        ...r,
        id: String(r.id),
        totalEpisodes: r.episodes ?? null,
        media_type: 'anime' as const,
      })),
    [info]
  );

  if (loading) return <DetailSkeleton />;

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
  const resumeEntry = getAnimeProgress(info.id);
  const countdown = formatAiringCountdown(info.nextAiringEpisode?.airingAt);

  /* Active season = the one chosen in the dropdown (falls back to this page's
     own entry). Its episode list / metadata drive the Episodes & Seasons section. */
  const activeInfo = seasonInfo ?? info;
  const activeSeasonId = selectedSeasonId ?? String(info.id);
  const activeSeasonEntry = seasons.find((s) => s.id === activeSeasonId);
  const episodes = activeInfo.episodeList || [];

  const handleWatch = (episode?: number, animeId?: string) => {
    const targetEp = episode || resumeEntry?.episode || 1;
    navigate(`/watch/${animeId || info.id}/${targetEp}`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/anime/${info.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast(`Link for "${title}" copied to clipboard!`, 'share');
    }
  };

  const metaChips: Array<{ icon?: React.ReactNode; label: string }> = [];
  if (typeof info.rating === 'number') {
    metaChips.push({
      icon: <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />,
      label: `${Math.round(info.rating)}%`,
    });
  }
  if (info.status) metaChips.push({ label: info.status });
  if (info.type) metaChips.push({ label: info.type === 'TV' ? 'TV Series' : info.type });
  if (info.releaseDate) metaChips.push({ icon: <Calendar className="w-3.5 h-3.5" />, label: String(info.releaseDate) });
  if (info.totalEpisodes) metaChips.push({ icon: <Tv className="w-3.5 h-3.5" />, label: `${info.totalEpisodes} episodes` });
  if (info.duration) metaChips.push({ icon: <Clock className="w-3.5 h-3.5" />, label: `${info.duration} min` });

  return (
    <div className="w-full flex flex-col pb-24">
      {/* Banner Backdrop */}
      <div className="relative w-full h-[42vh] sm:h-[48vh] overflow-hidden">
        <img
          src={info.cover || info.image || ''}
          alt=""
          className="w-full h-full object-cover object-center scale-110 blur-[2px]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08060d] via-[#08060d]/55 to-[#08060d]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08060d]/70 via-transparent to-transparent" />

        {/* Back — home (the watch page routes users back here first) */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-20 sm:top-24 left-4 sm:left-6 z-20 p-2.5 rounded-full bg-black/60 hover:bg-white/15 backdrop-blur-xl border border-white/15 text-white transition-all active:scale-95 cursor-pointer shadow-lg"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Info Card */}
      <div className="px-4 sm:px-6 md:px-12 -mt-28 sm:-mt-36 relative z-10">
        <div className="flex flex-col md:flex-row gap-5 md:gap-10">
          {/* Poster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-36 sm:w-44 md:w-56 shrink-0"
          >
            <div className="rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/80 bg-[#12101e]">
              <img
                src={info.image || ''}
                alt={title}
                className="w-full aspect-[2/3] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>

          {/* Title & Meta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
            className="flex-1 min-w-0 pt-2 md:pt-24"
          >
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {title}
            </h1>
            {nativeTitle && nativeTitle !== title && (
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">{nativeTitle}</p>
            )}

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              {metaChips.map((chip, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-[11px] font-bold text-slate-200"
                >
                  {chip.icon}
                  {chip.label}
                </span>
              ))}
              {countdown && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/40 text-[11px] font-bold text-[#d8b4fe]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" />
                  {countdown}
                </span>
              )}
            </div>

            {/* Genres */}
            {info.genres && info.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {info.genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => navigate(`/explore/${encodeURIComponent(genre)}`)}
                    className="px-3 py-1 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/25 text-[10px] font-bold text-[#d8b4fe] hover:bg-[#a855f7]/25 hover:text-white transition-colors cursor-pointer"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}

            {/* Studios */}
            {info.studios && info.studios.length > 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold mt-3">
                <Clapperboard className="w-3.5 h-3.5" />
                {info.studios.slice(0, 3).join(' · ')}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <button
                onClick={() => handleWatch()}
                className="px-6 py-3 rounded-2xl bg-[#a855f7] hover:bg-[#c084fc] text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-950/70 active:scale-95 transition-all flex items-center gap-2 cursor-pointer btn-sheen"
              >
                <Play className="w-4 h-4 fill-white ml-0.5" />
                <span>{resumeEntry ? `Resume EP ${resumeEntry.episode}` : 'Watch EP 1'}</span>
              </button>

              <button
                onClick={async () => {
                  const nowSaved = await toggleWatchlist(info);
                  showToast(nowSaved ? `Added "${title}" to My List` : `Removed "${title}" from My List`, 'bookmark');
                }}
                className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm backdrop-blur-xl border active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${
                  saved
                    ? 'bg-[#a855f7]/25 border-[#a855f7] text-[#d8b4fe]'
                    : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                }`}
                aria-label={saved ? 'Remove from My List' : 'Add to My List'}
              >
                {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>My List</span>
              </button>

              <button
                onClick={handleShare}
                className="p-3 rounded-2xl bg-white/10 border border-white/15 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                aria-label="Share"
                title="Copy link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Synopsis */}
        {info.description && (
          <div className="mt-8 max-w-4xl">
            <h2 className="text-sm sm:text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#a855f7] rounded-full inline-block" />
              Synopsis
            </h2>
            <p
              className={`text-xs sm:text-sm text-slate-300 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
            >
              {info.description.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ')}
            </p>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#c084fc] hover:text-white transition-colors cursor-pointer"
            >
              {expanded ? 'Show less' : 'Read more'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}

        {/* Episodes & Seasons — full page width, every season selectable in place */}
        {episodes.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="w-1.5 h-4 bg-[#a855f7] rounded-full inline-block" />
              <h2 className="text-sm sm:text-base font-bold text-white">Episodes &amp; Seasons</h2>
              {activeInfo.id !== info.id && activeSeasonEntry && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30 text-[10px] font-extrabold text-[#d8b4fe] uppercase tracking-wider truncate max-w-full">
                  {activeSeasonEntry.label} · {activeSeasonEntry.title}
                </span>
              )}
            </div>
            <EpisodeList
              animeId={activeInfo.id}
              episodes={episodes}
              episodeMeta={activeInfo.episodeMeta}
              duration={activeInfo.duration ?? null}
              rating={typeof activeInfo.rating === 'number' ? activeInfo.rating : null}
              seasons={seasons}
              activeSeasonId={activeSeasonId}
              seasonLoading={seasonLoading}
              currentEpisode={activeInfo.id === info.id ? resumeEntry?.episode || -1 : -1}
              onSelect={(ep) => handleWatch(ep, activeInfo.id)}
              onSeasonChange={(seasonId) => setSelectedSeasonId(seasonId)}
            />
          </div>
        )}

        {/* Top Billed Cast */}
        {info.characters && info.characters.length > 0 && (
          <div className="mt-10">
            <CastRail characters={info.characters} />
          </div>
        )}

        {/* More Like This — the exact same home-page section with hover < > arrows */}
        {info.recommendations && info.recommendations.length > 0 && (
          <div className="mt-4 -mx-4 sm:-mx-6 md:-mx-12">
            <AnimeRow title="More Like This" items={recItems} />
          </div>
        )}
      </div>
    </div>
  );
};
