import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Film, Loader2, RotateCw } from 'lucide-react';
import { advancedSearch } from '../lib/anilist';
import type { AnimeItem } from '../lib/types';
import { GridSkeleton, ErrorState, EmptyState } from '../components/states';
import { AnimeCard } from '../components/AnimeCard';

type SortOption = 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC' | 'START_DATE_DESC';

const SORTS: Array<{ value: SortOption; label: string }> = [
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'POPULARITY_DESC', label: 'Popular' },
  { value: 'SCORE_DESC', label: 'Top Rated' },
  { value: 'START_DATE_DESC', label: 'Newest' },
];

/** Uniform pill chip — same styling as the Explore filters */
const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`h-8 px-3.5 inline-flex items-center justify-center whitespace-nowrap shrink-0 select-none rounded-full text-[11px] font-bold leading-none transition-all cursor-pointer border active:scale-95 ${
      active
        ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-md shadow-purple-950/50'
        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/12 hover:text-white'
    }`}
  >
    {children}
  </button>
);

/**
 * Movies — a focused browse page that only lists anime movies
 * (advanced-search with format=MOVIE). New pages auto-load while
 * scrolling down; a floating go-to-top button handles the way back.
 */
export const MoviesView: React.FC = () => {
  const [sort, setSort] = useState<SortOption>('POPULARITY_DESC');
  const [reloadKey, setReloadKey] = useState(0);

  const [items, setItems] = useState<AnimeItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Initial load — refetched whenever the sort order (or retry key) changes */
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setLoadMoreError(null);
        const res = await advancedSearch({
          page: 1,
          perPage: 24,
          format: 'MOVIE',
          sort: [sort],
        });
        if (!isMounted) return;
        setItems(res.results);
        setPage(1);
        setHasNextPage(res.hasNextPage);
      } catch (err: any) {
        if (isMounted) {
          console.error('Movies load failed:', err);
          setError(err.message || 'Failed to load movies.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [sort, reloadKey]);

  /* ---- Infinite scroll: auto-attach the next page when the sentinel nears the viewport ---- */
  const busyRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const targetPage = page + 1;
      const res = await advancedSearch({
        page: targetPage,
        perPage: 24,
        format: 'MOVIE',
        sort: [sort],
      });
      setItems((prev) => [...prev, ...res.results]);
      setPage(targetPage);
      setHasNextPage(res.hasNextPage);
    } catch (err: any) {
      setLoadMoreError(err?.message || 'Failed to load more movies.');
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [page, sort]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || loading || loadingMore || loadMoreError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '700px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, loading, loadingMore, loadMoreError, loadMore]);

  return (
    <div className="w-full min-h-[70dvh] pb-24">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-12 pt-28 sm:pt-32 pb-4">
        <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          <span className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#a855f7]/15 border border-[#a855f7]/30 shrink-0">
            <Film className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#c084fc]" />
          </span>
          Anime Movies
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1.5">
          Feature films only — keep scrolling and more load automatically
        </p>
      </div>

      {/* Sort rail */}
      <div className="px-4 sm:px-6 md:px-12 flex items-center gap-2 overflow-x-auto scrollbar-none py-3 pb-4">
        {SORTS.map((s) => (
          <Chip key={s.value} active={sort === s.value} onClick={() => setSort(s.value)}>
            {s.label}
          </Chip>
        ))}
      </div>

      {/* Results grid */}
      <div className="px-4 sm:px-6 md:px-12 mt-2">
        {loading ? (
          <GridSkeleton count={18} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No movies found"
            subtitle="Try a different sort order or check back later."
          />
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {items.map((item, idx) => (
                <AnimeCard key={`${item.id}-${idx}`} anime={item} />
              ))}
            </div>

            {/* Infinite scroll — auto-loads the next page as the sentinel comes into view */}
            {hasNextPage && (
              <div ref={sentinelRef} className="flex items-center justify-center py-8">
                {loadingMore ? (
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-[#a855f7]" />
                    <span className="text-xs font-bold tracking-wide">Loading more movies…</span>
                  </div>
                ) : loadMoreError ? (
                  <button
                    onClick={loadMore}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-rose-400/50 hover:text-white text-xs font-bold text-rose-300 transition-all cursor-pointer active:scale-95"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Couldn't load more — retry
                  </button>
                ) : (
                  <div
                    className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#a855f7]/70 animate-spin opacity-50"
                    aria-hidden="true"
                  />
                )}
              </div>
            )}
            {!hasNextPage && !loading && items.length > 0 && (
              <p className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-600 py-8">
                You've reached the end
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
