import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimeCard } from './AnimeCard';
import type { AnimeItem } from '../lib/types';
import type { WatchHistoryItem } from '../context/WatchHistoryContext';

interface AnimeRowProps {
  title: React.ReactNode;
  items: AnimeItem[];
  aspect?: 'poster' | 'backdrop';
  exploreLink?: string;
  onExploreClick?: () => void;
  /** render as Continue Watching style cards with progress */
  historyMode?: boolean;
  historyMap?: Map<string, WatchHistoryItem>;
}

export const AnimeRow: React.FC<AnimeRowProps> = ({
  title,
  items,
  aspect = 'poster',
  exploreLink,
  onExploreClick,
  historyMode,
  historyMap,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const clientWidth = rowRef.current.clientWidth;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative my-5 sm:my-7 md:my-8 px-4 sm:px-6 md:px-12 group/row">
      {/* Row Header */}
      {title && (
        <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
          <div className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {typeof title === 'string' ? (
              <>
                <span className="w-1.5 h-4 sm:h-5 bg-[#a855f7] rounded-full inline-block shrink-0" />
                <span>{title}</span>
              </>
            ) : (
              title
            )}
          </div>
          {exploreLink && onExploreClick && (
            <button
              onClick={onExploreClick}
              className="text-xs sm:text-sm font-semibold text-[#c084fc] hover:text-white transition-colors whitespace-nowrap active:scale-95 shrink-0 cursor-pointer"
            >
              See all →
            </button>
          )}
        </div>
      )}

      <div className="relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="hidden md:flex absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/90 hover:bg-[#a855f7] text-white items-center justify-center backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-200 border border-white/20 shadow-2xl hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Touch-Optimized Horizontal Carousel */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
          className="flex gap-2.5 sm:gap-4 overflow-x-auto overflow-y-hidden overscroll-y-auto overscroll-x-contain scrollbar-none sm:snap-x sm:snap-proximity py-2 px-1 relative z-10 [touch-action:pan-x_pan-y]"
        >
          {items.map((item, idx) => {
            const historyEntry = historyMode && historyMap ? historyMap.get(String(item.id)) : undefined;
            return (
              <div
                key={`${item.id}-${idx}`}
                className={`sm:snap-start shrink-0 relative transition-all duration-300 hover:z-30 ${
                  aspect === 'backdrop' || historyMode
                    ? 'w-[200px] sm:w-[260px] md:w-[300px]'
                    : 'w-[125px] sm:w-[165px] md:w-[200px]'
                }`}
              >
                <AnimeCard
                  anime={item}
                  variant={historyMode ? 'history' : aspect}
                  historyEntry={
                    historyEntry
                      ? { episode: historyEntry.episode, progress: historyEntry.progress }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="hidden md:flex absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/90 hover:bg-[#a855f7] text-white items-center justify-center backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-200 border border-white/20 shadow-2xl hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </section>
  );
};
