import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchAnime, normTitle } from '../lib/anilist';
import type { AnimeItem } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { LogoMark } from './Logo';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_KEY = 'anistream_recent_searches';

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input & lock scroll when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Live search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchAnime(q, 1);
        setResults(res.results.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const saveRecent = useCallback((q: string) => {
    setRecent((prev) => {
      const next = [q, ...prev.filter((r) => r !== q)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const goToAnime = (anime: AnimeItem) => {
    const q = query.trim();
    if (q) saveRecent(q);
    onClose();
    navigate(`/anime/${anime.id}`);
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    saveRecent(q);
    onClose();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Palette Panel */}
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 mx-auto mt-[12vh] w-[92%] max-w-xl rounded-3xl bg-[#12101e]/95 backdrop-blur-2xl border border-white/12 shadow-2xl shadow-black/90 overflow-hidden"
            role="dialog"
            aria-label="Search anime"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <LogoMark className="w-6 h-6 rounded-lg shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch();
                }}
                placeholder="Search anime titles..."
                className="flex-1 bg-transparent outline-none border-0 text-sm font-semibold text-white placeholder:text-slate-500"
                autoComplete="off"
                spellCheck={false}
              />
              {loading && <div className="w-4 h-4 border-2 border-[#a855f7]/30 border-t-[#a855f7] rounded-full animate-spin shrink-0" />}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results / Suggestions */}
            <div className="max-h-[55vh] overflow-y-auto">
              {/* Live results */}
              {query.trim().length >= 2 && (
                <div className="p-2">
                  {results.length === 0 && !loading && (
                    <p className="text-xs text-slate-500 text-center py-6 font-medium">
                      No matches for "{query.trim()}"
                    </p>
                  )}
                  {results.map((anime) => (
                    <button
                      key={anime.id}
                      onClick={() => goToAnime(anime)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/8 transition-colors cursor-pointer text-left"
                    >
                      <img
                        src={anime.image || ''}
                        alt=""
                        className="w-10 h-14 rounded-lg object-cover bg-[#1a152c] shrink-0"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white line-clamp-1">{normTitle(anime.title)}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {[anime.type, anime.releaseDate, anime.status].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {typeof anime.rating === 'number' && (
                        <span className="text-[10px] font-bold text-emerald-400 tabular-nums shrink-0">
                          {Math.round(anime.rating)}%
                        </span>
                      )}
                    </button>
                  ))}
                  {query.trim().length >= 2 && (
                    <button
                      onClick={submitSearch}
                      className="w-full flex items-center justify-center gap-2 py-3 mt-1 text-xs font-bold text-[#c084fc] hover:text-white transition-colors cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      See all results for "{query.trim()}"
                    </button>
                  )}
                </div>
              )}

              {/* Idle state: recent + trending suggestions */}
              {query.trim().length < 2 && (
                <div className="p-4 space-y-4">
                  {recent.length > 0 && (
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Recent Searches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recent.map((r) => (
                          <button
                            key={r}
                            onClick={() => setQuery(r)}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Try Searching
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Frieren', 'One Piece', 'Jujutsu Kaisen', 'Solo Leveling', 'Spy x Family'].map((r) => (
                        <button
                          key={r}
                          onClick={() => setQuery(r)}
                          className="px-3 py-1.5 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/25 text-xs font-semibold text-[#d8b4fe] hover:bg-[#a855f7]/25 hover:text-white transition-colors cursor-pointer"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-2.5 border-t border-white/10 bg-black/30 flex items-center justify-between text-[10px] text-slate-600 font-semibold">
              <span>Enter to search all anime</span>
              <span className="font-mono">ESC to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
