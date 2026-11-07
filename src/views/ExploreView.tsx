import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, X, Loader2, RotateCw } from 'lucide-react';
import { advancedSearch, ANIME_GENRES, ANIME_FORMATS, ANIME_SEASONS, ANIME_STATUS } from '../lib/anilist';
import type { AnimeItem } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { GridSkeleton, ErrorState, EmptyState } from '../components/states';
import { AnimeCard } from '../components/AnimeCard';

interface ExploreViewProps {
  initialGenre?: string;
}

type SortOption = 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC' | 'START_DATE_DESC';

const SORTS: Array<{ value: SortOption; label: string }> = [
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'POPULARITY_DESC', label: 'Popular' },
  { value: 'SCORE_DESC', label: 'Top Rated' },
  { value: 'START_DATE_DESC', label: 'Newest' },
];

const YEARS: number[] = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

/** Uniform pill chip — fixed height + no-wrap guarantees a perfect pill shape on every screen */
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

export const ExploreView: React.FC<ExploreViewProps> = ({ initialGenre }) => {
  const { navigate } = useRouter();

  const [genre, setGenre] = useState<string | null>(initialGenre || null);
  const [format, setFormat] = useState<string | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('POPULARITY_DESC');

  const [items, setItems] = useState<AnimeItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterKey = useMemo(
    () => JSON.stringify({ genre, format, season, year, status, sort }),
    [genre, format, season, year, status, sort]
  );

  useEffect(() => {
    let isMounted = true;
    async function load(reset: boolean) {
      try {
        if (reset) {
          setLoading(true);
          setError(null);
          setLoadMoreError(null);
        } else {
          setLoadingMore(true);
        }
        const targetPage = reset ? 1 : page + 1;
        const res = await advancedSearch({
          page: targetPage,
          perPage: 24,
          genres: genre ? [genre] : undefined,
          format: format || undefined,
          season: season || undefined,
          year: year || undefined,
          status: status || undefined,
          sort: [sort],
        });
        if (!isMounted) return;
        setHasNextPage(res.hasNextPage);
        if (reset) {
          setItems(res.results);
          setPage(1);
        } else {
          setItems((prev) => [...prev, ...res.results]);
          setPage(targetPage);
        }
      } catch (err: any) {
        if (isMounted && reset) {
          console.error('Explore load failed:', err);
          setError(err.message || 'Failed to load anime.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }
    load(true);
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const activeFilterCount = [genre, format, season, year, status].filter(Boolean).length;

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
        genres: genre ? [genre] : undefined,
        format: format || undefined,
        season: season || undefined,
        year: year || undefined,
        status: status || undefined,
        sort: [sort],
      });
      setItems((prev) => [...prev, ...res.results]);
      setPage(targetPage);
      setHasNextPage(res.hasNextPage);
    } catch (err: any) {
      setLoadMoreError(err?.message || 'Failed to load more anime.');
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [page, genre, format, season, year, status, sort]);

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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Browse {genre ? genre : 'Anime'}
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Discover by genre, format, season and more
        </p>
      </div>

      {/* Quick genre rail — wraps responsively so every chip keeps a perfect pill shape */}
      <div className="px-4 sm:px-6 md:px-12 flex flex-wrap gap-2 pb-4">
        <Chip active={!genre} onClick={() => setGenre(null)}>
          All
        </Chip>
        {ANIME_GENRES.map((g) => (
          <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
            {g}
          </Chip>
        ))}
      </div>

      {/* Filter bar */}
      <div className="px-4 sm:px-6 md:px-12 flex items-center justify-between gap-3 py-3">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={`flex items-center gap-2 h-8 px-3.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
            filtersOpen || activeFilterCount > 0
              ? 'bg-[#a855f7]/15 border-[#a855f7]/40 text-[#d8b4fe]'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/12'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-[#a855f7] text-white text-[9px] font-extrabold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none py-0.5 -mr-1 pr-1">
          {SORTS.map((s) => (
            <Chip key={s.value} active={sort === s.value} onClick={() => setSort(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Advanced filters panel */}
      {filtersOpen && (
        <div className="px-4 sm:px-6 md:px-12 pb-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d0a18] p-4 space-y-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Format</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={!format} onClick={() => setFormat(null)}>Any</Chip>
                {ANIME_FORMATS.map((f) => (
                  <Chip key={f.value} active={format === f.value} onClick={() => setFormat(format === f.value ? null : f.value)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={!status} onClick={() => setStatus(null)}>Any</Chip>
                {ANIME_STATUS.map((s) => (
                  <Chip key={s.value} active={status === s.value} onClick={() => setStatus(status === s.value ? null : s.value)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Season</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={!season} onClick={() => setSeason(null)}>Any</Chip>
                {ANIME_SEASONS.map((s) => (
                  <Chip key={s} active={season === s} onClick={() => setSeason(season === s ? null : s)}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Year</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                <Chip active={!year} onClick={() => setYear(null)}>Any</Chip>
                {YEARS.map((y) => (
                  <Chip key={y} active={year === y} onClick={() => setYear(year === y ? null : y)}>
                    {y}
                  </Chip>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setGenre(null);
                  setFormat(null);
                  setSeason(null);
                  setYear(null);
                  setStatus(null);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results grid */}
      <div className="px-4 sm:px-6 md:px-12 mt-2">
        {loading ? (
          <GridSkeleton count={18} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setFiltersOpen((v) => v)} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No anime found"
            subtitle="Try removing some filters or switching the sort order."
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
                    <span className="text-xs font-bold tracking-wide">Loading more anime…</span>
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
