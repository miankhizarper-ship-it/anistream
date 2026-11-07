import React from 'react';
import { Check, Play } from 'lucide-react';
import { useWatchHistory } from '../context/WatchHistoryContext';

interface EpisodeGridProps {
  animeId: string;
  episodes: number[];
  currentEpisode: number;
  onSelect: (episode: number) => void;
  /** capped rendering for very long lists */
  showTitle?: boolean;
  /** max-height classes for the internal scroll viewport (page stays short) */
  scrollClassName?: string;
}

/**
 * Responsive grid of episode number buttons with watched/current markers.
 * For very long lists (500+ episodes like One Piece) renders a windowed
 * list around the current episode to keep the DOM fast.
 */
export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  animeId,
  episodes,
  currentEpisode,
  onSelect,
  showTitle = false,
  scrollClassName = 'max-h-[420px]',
}) => {
  const { history } = useWatchHistory();

  const watchedSet = new Set<number>();
  history.forEach((h) => {
    if (String(h.id) === String(animeId)) watchedSet.add(h.episode);
  });

  // Windowed rendering for huge episode lists
  const WINDOW = 150;
  let visibleEpisodes = episodes;
  let windowStartHint: string | null = null;
  if (episodes.length > WINDOW) {
    const currentIdx = episodes.indexOf(currentEpisode);
    const start = Math.max(0, (currentIdx < 0 ? 0 : currentIdx) - 40);
    visibleEpisodes = episodes.slice(start, start + WINDOW);
    windowStartHint =
      start > 0 ? `Showing episodes ${visibleEpisodes[0]}-${visibleEpisodes[visibleEpisodes.length - 1]} of ${episodes.length}` : `Showing first ${WINDOW} of ${episodes.length} episodes`;
  }

  return (
    <div>
      {windowStartHint && (
        <p className="text-[11px] text-slate-500 font-semibold mb-2.5">{windowStartHint}</p>
      )}
      <div
        className={`grid gap-1.5 overflow-y-auto scrollbar-slim pr-1 ${scrollClassName}`}
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}
      >
        {visibleEpisodes.map((ep) => {
          const isCurrent = ep === currentEpisode;
          const isWatched = watchedSet.has(ep) && !isCurrent;
          return (
            <button
              key={ep}
              onClick={() => onSelect(ep)}
              className={`h-10 rounded-xl text-xs font-bold tabular-nums flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                isCurrent
                  ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-lg accent-glow-sm'
                  : isWatched
                  ? 'bg-[#a855f7]/15 border-[#a855f7]/30 text-[#c084fc]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/12 hover:text-white hover:border-white/25'
              }`}
              title={`Episode ${ep}${isWatched ? ' (watched)' : ''}`}
              aria-label={`Episode ${ep}`}
              aria-current={isCurrent ? 'true' : undefined}
            >
              {isWatched && !isCurrent ? <Check className="w-3 h-3 shrink-0" /> : null}
              {ep}
            </button>
          );
        })}
      </div>
      {showTitle && (
        <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Play className="w-3 h-3" />
          Tap an episode to start streaming
        </p>
      )}
    </div>
  );
};
