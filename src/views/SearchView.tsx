import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Loader2, SearchX, Sparkles } from 'lucide-react';
import { searchAnime, normTitle } from '../lib/anilist';
import type { AnimeItem } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { GridSkeleton, ErrorState } from '../components/states';
import { AnimeCard } from '../components/AnimeCard';

interface SearchViewProps {
  query: Record<string, string>;
}

/* -------------------------- Category filter tabs ------------------------- */

const TABS = ['All', 'TV', 'Movie', 'OVA', 'ONA', 'Special'] as const;
type Tab = (typeof TABS)[number];

function categoryOf(item: AnimeItem): Tab | 'Other' {
  const t = String(item.type || '').toUpperCase();
  if (t.startsWith('TV')) return 'TV';
  if (t.includes('MOVIE')) return 'Movie';
  if (t === 'OVA') return 'OVA';
  if (t === 'ONA') return 'ONA';
  if (t === 'SPECIAL') return 'Special';
  return 'Other';
}

const SUGGESTIONS = [
  'Frieren',
  'One Piece',
  'Jujutsu Kaisen',
  'Solo Leveling',
  'Attack on Titan',
  'Demon Slayer',
  'Spy x Family',
];

export const SearchView: React.FC<SearchViewProps> = ({ query }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const urlQuery = query.q || '';
  const [inputValue, setInputValue] = useState(urlQuery);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('All');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  // Perform search when urlQuery changes
  useEffect(() => {
    setInputValue(urlQuery);
    if (!urlQuery) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    let isMounted = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        setSearched(true);
        const res = await searchAnime(urlQuery, 1);
        if (!isMounted) return;
        setResults(res.results);
        setHasNextPage(res.hasNextPage);
        setPage(1);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Search failed. Please try again.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    run();
    return () => {
      isMounted = false;
    };
  }, [urlQuery]);

  const handleInput = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim() === urlQuery) return;
      navigate(value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : '/search');
    }, 500);
  };

  const submitNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const value = inputValue.trim();
    if (value === urlQuery) return;
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };

  const loadMore = async () => {
    if (!urlQuery || loadingMore) return;
    try {
      setLoadingMore(true);
      const targetPage = page + 1;
      const res = await searchAnime(urlQuery, targetPage);
      setResults((prev) => [...prev, ...res.results]);
      setPage(targetPage);
      setHasNextPage(res.hasNextPage);
    } catch {
      showToast('Failed to load more results', 'info');
    } finally {
      setLoadingMore(false);
    }
  };

  // Dedupe by id so every card in the grid is unique & uniform
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    return results.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [results]);

  // Live per-category counts
  const counts = useMemo(() => {
    const map: Record<string, number> = { All: deduped.length };
    for (const tab of TABS) {
      if (tab === 'All') continue;
      map[tab] = deduped.filter((r) => categoryOf(r) === tab).length;
    }
    return map;
  }, [deduped]);

  const filtered = useMemo(
    () => (activeTab === 'All' ? deduped : deduped.filter((r) => categoryOf(r) === activeTab)),
    [deduped, activeTab]
  );

  const runSuggestion = (s: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate(`/search?q=${encodeURIComponent(s)}`);
  };

  const hasAnyResults = deduped.length > 0;

  return (
    <div className="w-full min-h-[70dvh] pb-24">
      {/* ── Page Title (scrolls away) ─────────────────────────────────── */}
      <div className="px-4 sm:px-6 md:px-12 pt-24 sm:pt-28 pb-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          Search
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Find any anime by title — results update as you type
        </p>
      </div>

      {/* ── Sticky Search Bar + Category Tabs ─────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#08060d]/95 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="px-4 sm:px-6 md:px-12 py-3.5">
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNow();
                if (e.key === 'Escape') {
                  setInputValue('');
                  navigate('/search');
                  inputRef.current?.focus();
                }
              }}
              placeholder="Search anime: One Piece, Frieren..."
              className="w-full h-12 pl-11 pr-24 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 focus:border-[#a855f7]/70 focus:bg-white/[0.08] focus:ring-4 focus:ring-[#a855f7]/15 outline-none text-sm font-semibold text-white placeholder:text-slate-500 placeholder:font-medium transition-all"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search anime"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {loading && (
                <Loader2 className="w-4 h-4 text-[#c084fc] animate-spin" aria-label="Searching" />
              )}
              {inputValue && (
                <button
                  onClick={() => {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    setInputValue('');
                    navigate('/search');
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Tabs */}
          {searched && hasAnyResults && (
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none -mx-1 px-1 py-0.5">
              {TABS.map((tab) => {
                const active = activeTab === tab;
                const count = counts[tab] ?? 0;
                if (tab !== 'All' && count === 0) return null;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={active}
                    className={`h-8 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 select-none rounded-full text-[11px] font-bold leading-none transition-all cursor-pointer border active:scale-95 ${
                      active
                        ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-md shadow-purple-950/50'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/12 hover:text-white'
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`min-w-4.5 h-4.5 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center tabular-nums ${
                        active ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Results Body ──────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 md:px-12 pt-5">
        {loading ? (
          <GridSkeleton count={12} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => navigate(`/search?q=${encodeURIComponent(urlQuery)}`)} />
        ) : !searched || !urlQuery ? (
          /* Initial state — invitation + popular suggestions */
          <div className="min-h-[42dvh] flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-[#a855f7]/10 border border-[#a855f7]/25 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-[#c084fc]" />
            </div>
            <p className="text-base font-bold text-white mb-1.5">Find something to watch</p>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
              Search thousands of anime by title. Try one of these popular picks:
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => runSuggestion(s)}
                  className="h-8 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300 hover:bg-[#a855f7]/15 hover:border-[#a855f7]/40 hover:text-white transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3 h-3 text-[#c084fc]" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : hasAnyResults ? (
          <>
            {/* Result meta line */}
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <p className="text-xs font-semibold text-slate-500">
                <span className="tabular-nums text-slate-300">{filtered.length}</span>{' '}
                {filtered.length === 1 ? 'result' : 'results'} for "
                <span className="text-white">{urlQuery}</span>"
                {activeTab !== 'All' && <span className="text-slate-400"> · {activeTab}</span>}
              </p>
            </div>

            {filtered.length === 0 ? (
              /* Category tab empty, but other tabs have results */
              <div className="min-h-[30dvh] flex flex-col items-center justify-center text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <SearchX className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-white mb-1">No {activeTab} titles in these results</p>
                <p className="text-xs text-slate-400 mb-5">This search returned other types of anime.</p>
                <button
                  onClick={() => setActiveTab('All')}
                  className="px-5 py-2.5 rounded-full bg-[#a855f7] hover:bg-[#c084fc] text-white text-xs font-bold shadow-lg accent-glow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Show all {deduped.length} results
                </button>
              </div>
            ) : (
              <>
                {/* Uniform card grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {filtered.map((item) => (
                    <AnimeCard key={item.id} anime={item} />
                  ))}
                </div>

                {hasNextPage && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className={`px-8 py-3 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                        loadingMore
                          ? 'bg-white/5 text-slate-500 cursor-wait'
                          : 'bg-[#a855f7] hover:bg-[#c084fc] text-white shadow-xl shadow-purple-950/60 cursor-pointer btn-sheen'
                      }`}
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* No results at all — friendly retry state */
          <div className="min-h-[42dvh] flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <SearchX className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-base font-bold text-white mb-1.5">No results for "{urlQuery}"</p>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
              Check the spelling or try a different title. Here are some popular searches:
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => runSuggestion(s)}
                  className="h-8 px-3.5 inline-flex items-center whitespace-nowrap rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300 hover:bg-[#a855f7]/15 hover:border-[#a855f7]/40 hover:text-white transition-all cursor-pointer active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
