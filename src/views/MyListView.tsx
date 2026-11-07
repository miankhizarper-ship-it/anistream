import React, { useState, useEffect } from 'react';
import { Bookmark, History, Trash2, LogIn } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { normTitle } from '../lib/anilist';
import type { AnimeItem } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { useWatchlist, type WatchlistItem } from '../context/WatchlistContext';
import { useWatchHistory } from '../context/WatchHistoryContext';
import { EmptyState } from '../components/states';
import { AnimeCard } from '../components/AnimeCard';

type Tab = 'watchlist' | 'history';

export const MyListView: React.FC = () => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const { watchlist, removeFromWatchlist, clearWatchlist, isSyncing } = useWatchlist();
  const { history, removeHistoryItem, clearHistory } = useWatchHistory();

  const [tab, setTab] = useState<Tab>('watchlist');

  const watchlistAsItems: AnimeItem[] = watchlist.map(
    (w) =>
      ({
        id: w.id,
        media_type: 'anime',
        title: w.title,
        image: w.poster,
        cover: w.cover,
        rating: w.rating,
        releaseDate: w.releaseDate,
        type: w.type,
        totalEpisodes: w.totalEpisodes,
      }) as AnimeItem
  );

  const historyAsItems: AnimeItem[] = history.map(
    (h) =>
      ({
        id: h.id,
        media_type: 'anime',
        title: h.title,
        image: h.poster,
        cover: h.cover,
      }) as AnimeItem
  );

  const historyMap = new Map<string, { episode: number; progress?: number }>();
  history.forEach((h) => {
    const key = String(h.id);
    if (!historyMap.has(key)) historyMap.set(key, { episode: h.episode, progress: h.progress });
  });

  const handleClear = async () => {
    if (tab === 'watchlist') {
      await clearWatchlist();
      showToast('Watchlist cleared', 'delete');
    } else {
      await clearHistory();
      showToast('Watch history cleared', 'delete');
    }
  };

  const handleRemove = async (id: string) => {
    if (tab === 'watchlist') {
      await removeFromWatchlist(id);
      showToast('Removed from My List', 'delete');
    } else {
      await removeHistoryItem(id);
      showToast('Removed from history', 'delete');
    }
  };

  const items = tab === 'watchlist' ? watchlistAsItems : historyAsItems;
  const count = tab === 'watchlist' ? watchlist.length : history.length;

  return (
    <div className="w-full min-h-[70dvh] pb-24">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-12 pt-28 sm:pt-32 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">My List</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Your saved anime and watching progress, synced to your account
          {isSyncing && <span className="text-[#c084fc]"> · syncing...</span>}
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-5">
          <TabButton active={tab === 'watchlist'} onClick={() => setTab('watchlist')} icon={<Bookmark className="w-3.5 h-3.5" />} label={`Watchlist (${watchlist.length})`} />
          <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={<History className="w-3.5 h-3.5" />} label={`Continue Watching (${history.length})`} />
        </div>
      </div>

      {/* Content */}
      <SignedIn>
        <div className="px-4 sm:px-6 md:px-12">
          {count === 0 ? (
            <EmptyState
              icon={tab === 'watchlist' ? <Bookmark className="w-8 h-8 text-[#a855f7]" /> : <History className="w-8 h-8 text-[#a855f7]" />}
              title={tab === 'watchlist' ? 'Your watchlist is empty' : 'Nothing watched yet'}
              subtitle={
                tab === 'watchlist'
                  ? 'Tap the + button on any anime to save it here. Your list follows your account across devices.'
                  : 'Start watching any anime and it will appear here so you can pick up where you left off.'
              }
              action={
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 rounded-2xl bg-[#a855f7] hover:bg-[#c084fc] text-white text-xs font-extrabold shadow-xl shadow-purple-950/60 active:scale-95 transition-all cursor-pointer"
                >
                  Discover Anime
                </button>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-slate-500">
                  {count} {tab === 'watchlist' ? 'saved' : 'recently watched'}
                </p>
                <button
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {tab === 'watchlist'
                  ? watchlistAsItems.map((item) => (
                      <WatchlistCard
                        key={item.id}
                        item={watchlist.find((w) => String(w.id) === String(item.id)) as WatchlistItem}
                        onRemove={() => handleRemove(item.id)}
                      />
                    ))
                  : historyAsItems.map((item, idx) => (
                      <AnimeCard
                        key={`${item.id}-${idx}`}
                        anime={item}
                        variant="history"
                        historyEntry={historyMap.get(String(item.id))}
                        compact
                      />
                    ))}
              </div>

              {/* sync note */}
              <p className="text-[10px] text-slate-600 font-medium mt-6 text-center">
                Watchlist keeps up to 80 titles · History keeps your last 50 episodes · Synced via your Clerk account
              </p>
            </>
          )}
        </div>
      </SignedIn>

      <SignedOut>
        <div className="px-4 sm:px-6 md:px-12">
          <EmptyState
            icon={<LogIn className="w-8 h-8 text-[#a855f7]" />}
            title="Sign in to unlock My List"
            subtitle="Your watchlist and watching progress sync securely to your account so they follow you on every device."
            action={
              <SignInButton mode="modal">
                <button className="px-6 py-3 rounded-2xl bg-[#a855f7] hover:bg-[#c084fc] text-white text-xs font-extrabold shadow-xl shadow-purple-950/60 active:scale-95 transition-all cursor-pointer flex items-center gap-2">
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In to Continue
                </button>
              </SignInButton>
            }
          />
        </div>
      </SignedOut>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active,
  onClick,
  icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
      active
        ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-lg shadow-purple-950/50'
        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/12 hover:text-white'
    }`}
  >
    {icon}
    {label}
  </button>
);

/** Watchlist card with remove button overlay */
const WatchlistCard: React.FC<{ item: WatchlistItem; onRemove: () => void }> = ({ item, onRemove }) => {
  const { navigate } = useRouter();
  const anime: AnimeItem = {
    id: item.id,
    media_type: 'anime',
    title: item.title,
    image: item.poster,
    cover: item.cover,
    rating: item.rating,
    releaseDate: item.releaseDate,
    type: item.type,
    totalEpisodes: item.totalEpisodes,
  };

  return (
    <div className="relative group">
      <AnimeCard anime={anime} compact />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 right-2 z-30 p-2 rounded-full bg-black/70 hover:bg-rose-600 border border-white/20 text-white transition-all active:scale-90 cursor-pointer md:opacity-0 md:group-hover:opacity-100"
        title="Remove from My List"
        aria-label="Remove from My List"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
