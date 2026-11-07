import React, { useRef, useState } from 'react';
import { Play, Plus, Check, Star, Share2 } from 'lucide-react';
import { normTitle } from '../lib/anilist';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useWatchHistory } from '../context/WatchHistoryContext';
import type { AnimeItem } from '../lib/types';

interface AnimeCardProps {
  anime: AnimeItem;
  /** 'history' cards render episode + progress bar */
  variant?: 'poster' | 'backdrop' | 'history';
  /** pre-computed history entry for progress display */
  historyEntry?: { episode: number; progress?: number };
  /** hide the "on hover" actions (used in dense grids) */
  compact?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
};

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, variant = 'poster', historyEntry, compact }) => {
  const { navigate } = useRouter();
  const { isSaved, toggleWatchlist } = useWatchlist();
  const { showToast } = useToast();

  const [imageError, setImageError] = useState(false);

  const title = normTitle(anime.title);
  const releaseYear = String(anime.releaseDate || '').slice(0, 4);
  const rating = typeof anime.rating === 'number' ? Math.round(anime.rating) : null;
  const saved = isSaved(anime.id);
  const typeLabel = anime.type ? TYPE_LABELS[String(anime.type).toUpperCase()] ?? String(anime.type) : null;

  const isDraggingRef = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = false;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 8 || dy > 8) {
      isDraggingRef.current = true;
    }
  };

  const handleCardClick = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    navigate(`/anime/${anime.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/watch/${anime.id}/${historyEntry?.episode || 1}`);
  };

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowSaved = await toggleWatchlist(anime);
    if (isNowSaved) {
      showToast(`Added "${title}" to My List`, 'bookmark');
    } else if (saved) {
      showToast(`Removed "${title}" from My List`, 'bookmark');
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/anime/${anime.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast(`Link for "${title}" copied to clipboard!`, 'share');
    } else {
      showToast(`Sharing "${title}"`, 'share');
    }
  };

  const imageSrc = anime.image || anime.cover || '';
  const isHistory = variant === 'history';
  const aspectClass = isHistory ? 'aspect-video' : variant === 'backdrop' ? 'aspect-video' : 'aspect-[2/3]';

  return (
    <div
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{ touchAction: 'pan-x pan-y' }}
      className="group relative cursor-pointer select-none rounded-2xl overflow-hidden bg-[#12101e] border border-white/10 transition-transform duration-300 ease-out md:hover:scale-105 md:hover:z-35 md:hover:shadow-[0_20px_50px_rgba(0,0,0,0.9)] md:hover:border-[#a855f7]/50 md:active:scale-[0.98] [touch-action:pan-x_pan-y]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Image Container */}
      <div className={`w-full overflow-hidden bg-[#1a152c] relative ${aspectClass}`}>
        {!imageError && imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            loading="lazy"
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out md:group-hover:scale-110 pointer-events-none select-none"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#1a152c] to-[#0d0a18]">
            <span className="text-xs font-semibold text-slate-300 line-clamp-3">{title}</span>
            <span className="text-[10px] text-slate-500 mt-1">{releaseYear || 'Anime'}</span>
          </div>
        )}

        {/* Rating Badge */}
        {rating !== null && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-bold text-emerald-400 border border-white/10 shadow-lg pointer-events-none">
            <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
            <span className="tabular-nums">{rating}%</span>
          </div>
        )}

        {/* Mobile Bookmark Touch Button */}
        {!compact && (
          <button
            onClick={handleBookmarkToggle}
            onTouchStart={(e) => e.stopPropagation()}
            className="md:hidden absolute top-0.5 right-1 z-20 w-11 h-11 flex items-center justify-center rounded-full text-white active:scale-90"
            aria-label={saved ? 'Remove from My List' : 'Add to My List'}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border ${
                saved
                  ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-md'
                  : 'bg-black/60 border-white/20 text-white'
              }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
          </button>
        )}

        {/* Always-on Info Overlay — title, year & type sit directly on the image.
            On hover the info "comes forward" (lift + scale + glow) while the
            action row rises up beneath it. */}
        {!isHistory && (
          <div className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2 pt-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none transition-all duration-300 ease-out md:group-hover:pb-[54px]">
            <div className="transition-transform duration-300 ease-out origin-bottom-left md:group-hover:scale-105">
              <p className="text-[11px] font-bold text-white line-clamp-1 leading-snug drop-shadow-sm transition-[filter] duration-300 md:group-hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]">
                {title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold text-slate-300 transition-colors duration-300 md:group-hover:text-white">
                <span className="tabular-nums">{releaseYear || 'TBA'}</span>
                {typeLabel && (
                  <>
                    <span className="text-slate-500">·</span>
                    <span className="uppercase tracking-wide text-[#c084fc]">{typeLabel}</span>
                  </>
                )}
                {anime.totalEpisodes ? (
                  <>
                    <span className="text-slate-500">·</span>
                    <span className="tabular-nums hidden sm:inline">{anime.totalEpisodes} eps</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Hover Micro-Actions (Desktop only) — slide up from the bottom edge,
            staggered just after the info comes forward */}
        {!compact && (
          <div className="hidden md:flex absolute inset-x-3 bottom-2 z-20 items-center gap-2 opacity-0 translate-y-5 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 ease-out delay-[70ms]">
            <button
              onClick={handlePlayClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#a855f7] hover:bg-[#c084fc] text-white text-xs font-bold shadow-lg shadow-purple-950/70 transition-colors"
              title="Watch now"
              aria-label={`Play ${title}`}
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Watch</span>
            </button>

            <button
              onClick={handleBookmarkToggle}
              className={`p-2.5 rounded-xl border transition-colors ${
                saved
                  ? 'bg-[#a855f7]/25 border-[#a855f7] text-[#c084fc] hover:bg-[#a855f7]/40'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title={saved ? 'Remove from My List' : 'Add to My List'}
              aria-label={saved ? 'Remove from My List' : 'Add to My List'}
            >
              {saved ? <Check className="w-4 h-4 text-[#c084fc]" /> : <Plus className="w-4 h-4" />}
            </button>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              title="Share"
              aria-label="Share anime"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* History overlay info */}
      {isHistory && historyEntry && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-2.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
          <p className="text-xs font-bold text-white line-clamp-1">{title}</p>
          <div className="flex items-center justify-between mt-1 mb-1.5">
            <span className="text-[10px] font-bold text-[#c084fc] uppercase tracking-wide">
              EP {historyEntry.episode}
            </span>
            {historyEntry.progress !== undefined && historyEntry.progress > 0 && (
              <span className="text-[10px] text-slate-400 tabular-nums">{historyEntry.progress}%</span>
            )}
          </div>
          <div className="h-1 w-full bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#a855f7] rounded-full"
              style={{ width: `${Math.min(100, historyEntry.progress || 0)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
