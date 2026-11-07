import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import type { AnimeCharacter } from '../lib/types';
import { useRail } from '../lib/useRail';

const ROLE_LABELS: Record<string, string> = {
  MAIN: 'Main',
  SUPPORTING: 'Supporting',
  BACKGROUND: 'Background',
};

interface CastRailProps {
  characters: AnimeCharacter[];
}

/**
 * "Top Billed Cast" — horizontal scrolling rail of circular cast avatars
 * with sleek left/right navigation arrows (desktop).
 */
export const CastRail: React.FC<CastRailProps> = ({ characters }) => {
  const { ref, edges, update, scroll } = useRail();

  // Re-measure once images have had a chance to load / layout to settle
  useEffect(() => {
    const t = setTimeout(update, 400);
    return () => clearTimeout(t);
  }, [characters, update]);

  return (
    <div className="group/rail">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-4 bg-[#a855f7] rounded-full inline-block shrink-0" />
          Top Billed Cast
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Users className="w-3 h-3" />
            ({characters.length})
          </span>
        </h2>
      </div>

      {/* Rail with floating hover arrows — same interaction as the home rows */}
      <div className="relative">
        {/* Left arrow (appears on rail hover) */}
        {edges.left && (
          <button
            onClick={() => scroll(-1)}
            className="hidden md:flex absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/90 hover:bg-[#a855f7] text-white items-center justify-center backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-all duration-200 border border-white/20 shadow-2xl hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Scroll cast left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Rail (bleeds to the screen edge while cards align with content) */}
        <div className="-mx-4 sm:-mx-6 md:-mx-12">
          <div
            ref={ref}
            onScroll={update}
            className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-none scroll-smooth py-3 px-4 sm:px-6 md:px-12"
          >
          {characters.map((char) => {
            const name = typeof char.name === 'string' ? char.name : 'Unknown';
            const roleLabel = ROLE_LABELS[String(char.role || '').toUpperCase()] || char.role || '';
            const initial = name.charAt(0).toUpperCase();
            return (
              <div key={String(char.id)} className="group/member shrink-0 w-[92px] sm:w-[108px] text-center cursor-default">
                {/* Circular avatar */}
                <div className="relative mx-auto w-full aspect-square rounded-full overflow-hidden bg-[#1a152c] ring-2 ring-white/10 transition-all duration-300 group-hover/member:ring-[#a855f7]/80 group-hover/member:shadow-[0_0_22px_rgba(168,85,247,0.45)]">
                  {char.image ? (
                    <img
                      src={char.image}
                      alt={name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/member:scale-110 pointer-events-none select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a152c] to-[#0d0a18]">
                      <span className="text-xl font-black text-white/25">{initial}</span>
                    </div>
                  )}
                </div>
                {/* Typography */}
                <p className="mt-2.5 text-[11px] sm:text-xs font-bold text-white line-clamp-2 leading-tight transition-colors duration-300 group-hover/member:text-[#d8b4fe]">
                  {name}
                </p>
                {roleLabel && (
                  <p className="mt-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-500 transition-colors duration-300 group-hover/member:text-[#c084fc]">
                    {roleLabel}
                  </p>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {/* Right arrow (appears on rail hover) */}
        {edges.right && (
          <button
            onClick={() => scroll(1)}
            className="hidden md:flex absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/90 hover:bg-[#a855f7] text-white items-center justify-center backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-all duration-200 border border-white/20 shadow-2xl hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Scroll cast right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};
