import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';
import { normTitle } from '../lib/anilist';
import type { AnimeRecommendation } from '../lib/types';
import { useRail } from '../lib/useRail';

interface PosterRailProps {
  items: AnimeRecommendation[];
  onSelect: (id: string) => void;
}

/**
 * "More Like This" — Netflix / Crunchyroll style poster rail with
 * glassmorphism rating badges, hover scale + glow and sleek arrows.
 */
export const PosterRail: React.FC<PosterRailProps> = ({ items, onSelect }) => {
  const { ref, edges, update, scroll } = useRail();

  useEffect(() => {
    const t = setTimeout(update, 400);
    return () => clearTimeout(t);
  }, [items, update]);

  const visible = items.slice(0, 24);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 mb-3.5">
        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-4 bg-[#a855f7] rounded-full inline-block shrink-0" />
          More Like This
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">({items.length})</span>
        </h2>

        {/* Sleek navigation arrows */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={() => scroll(-1)}
            disabled={!edges.left}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-300 transition-all cursor-pointer hover:bg-[#a855f7] hover:border-[#a855f7] hover:text-white hover:shadow-lg hover:shadow-purple-950/50 active:scale-90 disabled:opacity-20 disabled:pointer-events-none"
            aria-label="Scroll recommendations left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!edges.right}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-300 transition-all cursor-pointer hover:bg-[#a855f7] hover:border-[#a855f7] hover:text-white hover:shadow-lg hover:shadow-purple-950/50 active:scale-90 disabled:opacity-20 disabled:pointer-events-none"
            aria-label="Scroll recommendations right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rail */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-12">
        <div
          ref={ref}
          onScroll={update}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none scroll-smooth py-3 px-4 sm:px-6 md:px-12"
        >
          {visible.map((item) => {
            const title = normTitle(item.title);
            const year = String(item.releaseDate || '').slice(0, 4);
            const rating = typeof item.rating === 'number' ? Math.round(item.rating) : null;
            return (
              <button
                key={String(item.id)}
                onClick={() => onSelect(String(item.id))}
                className="group/poster relative shrink-0 w-[136px] sm:w-[160px] text-left rounded-2xl overflow-hidden border border-white/10 bg-[#12101e] transition-all duration-300 ease-out cursor-pointer hover:scale-105 hover:border-[#a855f7]/60 hover:shadow-[0_18px_44px_rgba(0,0,0,0.8),0_0_26px_rgba(168,85,247,0.3)] active:scale-100"
                aria-label={`Open ${title}`}
              >
                {/* Poster */}
                <div className="aspect-[2/3] overflow-hidden bg-gradient-to-br from-[#1a152c] to-[#0d0a18]">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/poster:scale-110 pointer-events-none select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3 text-center">
                      <span className="text-xs font-semibold text-slate-300 line-clamp-3">{title}</span>
                    </div>
                  )}
                </div>

                {/* Gradient overlay so text pops */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                {/* Rating badge */}
                {rating !== null && (
                  <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/55 backdrop-blur-md border border-white/15 text-[9px] font-extrabold text-emerald-400 shadow-md pointer-events-none">
                    <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                    <span className="tabular-nums">{rating}%</span>
                  </span>
                )}

                {/* Hover play orb */}
                <span className="absolute inset-0 z-10 hidden sm:flex items-center justify-center opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="w-11 h-11 rounded-full bg-[#a855f7]/95 flex items-center justify-center shadow-xl scale-75 group-hover/poster:scale-100 transition-transform duration-300">
                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  </span>
                </span>

                {/* Bottom info */}
                <div className="absolute bottom-0 inset-x-0 z-10 p-2.5 pt-8 pointer-events-none">
                  <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug drop-shadow-sm">{title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-slate-300">
                    {item.type ? (
                      <span className="uppercase tracking-wide text-[#c084fc]">{String(item.type)}</span>
                    ) : null}
                    {year ? (
                      <>
                        <span className="text-slate-500">·</span>
                        <span className="tabular-nums">{year}</span>
                      </>
                    ) : null}
                    {item.episodes ? (
                      <>
                        <span className="text-slate-500">·</span>
                        <span className="tabular-nums">{item.episodes} eps</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
