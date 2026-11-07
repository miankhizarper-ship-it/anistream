import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import type { AnimeItem } from '../lib/types';
import { normTitle } from '../lib/anilist';

export interface WatchlistItem {
  id: string;
  media_type: 'anime';
  title: string;
  poster: string | null;
  cover: string | null;
  rating: number | null;
  releaseDate: string | number | null;
  type: string | null;
  totalEpisodes: number | null;
  savedAt: number;
}

export interface WatchlistContextType {
  watchlist: WatchlistItem[];
  isSaved: (id: string | number) => boolean;
  toggleWatchlist: (anime: AnimeItem) => Promise<boolean>;
  removeFromWatchlist: (id: string | number) => Promise<void>;
  clearWatchlist: () => Promise<void>;
  isSyncing: boolean;
  openSignInForWatchlist: () => void;
}

const STORAGE_KEY = 'anistream_watchlist';
const EVENT_KEY = 'anistream_watchlist_updated';

/** Clerk metadata caps - keeps unsafeMetadata small and reliable */
const CLERK_CAP = 80;
const CLERK_SIZE_CAP = 8000;

const WatchlistContext = createContext<WatchlistContextType | null>(null);

function getLocalWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalWatchlist(items: WatchlistItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT_KEY));
  } catch (err) {
    console.error('Failed to write local watchlist:', err);
  }
}

function toWatchlistItem(anime: AnimeItem): WatchlistItem {
  return {
    id: String(anime.id),
    media_type: 'anime',
    title: normTitle(anime.title).slice(0, 60),
    poster: anime.image || null,
    cover: anime.cover || anime.image || null,
    rating: typeof anime.rating === 'number' ? anime.rating : null,
    releaseDate: anime.releaseDate ?? null,
    type: anime.type || null,
    totalEpisodes: anime.totalEpisodes ?? null,
    savedAt: Date.now(),
  };
}

function prepareClerkWatchlist(list: WatchlistItem[]): WatchlistItem[] {
  let trimmed: WatchlistItem[] = list.map((item) => ({
    id: item.id,
    media_type: 'anime',
    title: item.title.slice(0, 45),
    poster: item.poster,
    cover: item.cover,
    rating: item.rating,
    releaseDate: item.releaseDate,
    type: item.type,
    totalEpisodes: item.totalEpisodes,
    savedAt: item.savedAt,
  }));

  if (trimmed.length > CLERK_CAP) {
    trimmed = trimmed.slice(0, CLERK_CAP);
  }

  while (JSON.stringify(trimmed).length > CLERK_SIZE_CAP && trimmed.length > 2) {
    trimmed.pop();
  }

  return trimmed;
}

const syncToClerk = async (userObj: any, list: WatchlistItem[]) => {
  if (!userObj) return;
  try {
    const existing = { ...(userObj.unsafeMetadata || {}) };
    delete existing.watchlist;
    await userObj.update({
      unsafeMetadata: {
        ...existing,
        watchlist: prepareClerkWatchlist(list),
      },
    });
  } catch (err) {
    console.warn('Clerk metadata sync limit notice:', err);
  }
};

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, user, isLoaded } = useUser();
  const { openSignIn } = useClerk();

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => getLocalWatchlist());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const hasMigratedRef = useRef(false);

  // Sync state with Clerk user metadata when authenticated, with local storage migration
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      setWatchlist(getLocalWatchlist());
      hasMigratedRef.current = false;
      return;
    }

    const syncClerkMetadata = async () => {
      try {
        setIsSyncing(true);
        const metadata = (user.unsafeMetadata || {}) as { watchlist?: WatchlistItem[] };
        const clerkWatchlist: WatchlistItem[] = Array.isArray(metadata.watchlist)
          ? metadata.watchlist.filter((i) => i && i.id !== undefined)
          : [];

        const localItems = getLocalWatchlist();

        if (localItems.length > 0 && !hasMigratedRef.current) {
          hasMigratedRef.current = true;
          // Merge local items with Clerk items (deduplicated by id)
          const mergedMap = new Map<string, WatchlistItem>();

          clerkWatchlist.forEach((item) => {
            mergedMap.set(String(item.id), item);
          });

          localItems.forEach((item) => {
            const key = String(item.id);
            if (!mergedMap.has(key)) {
              mergedMap.set(key, item);
            }
          });

          const mergedList = Array.from(mergedMap.values()).sort(
            (a, b) => (b.savedAt || 0) - (a.savedAt || 0)
          );

          setWatchlist(mergedList);
          saveLocalWatchlist(mergedList);
          await syncToClerk(user, mergedList);
        } else {
          setWatchlist(clerkWatchlist);
          saveLocalWatchlist(clerkWatchlist);
        }
      } catch (err) {
        console.error('Failed to sync watchlist with Clerk metadata:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncClerkMetadata();
  }, [isLoaded, isSignedIn, user]);

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setWatchlist(getLocalWatchlist());
    };
    const handleCustom = () => setWatchlist(getLocalWatchlist());
    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_KEY, handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_KEY, handleCustom);
    };
  }, []);

  const openSignInForWatchlist = useCallback(() => {
    try {
      openSignIn({
        appearance: {
          variables: {
            colorPrimary: '#a855f7',
          },
        },
      });
    } catch (err) {
      console.warn('Could not open Clerk sign-in modal:', err);
    }
  }, [openSignIn]);

  const isSaved = useCallback(
    (id: string | number) => {
      return watchlist.some((b) => String(b.id) === String(id));
    },
    [watchlist]
  );

  const toggleWatchlist = useCallback(
    async (anime: AnimeItem): Promise<boolean> => {
      // Guest Mode Check: Require authentication
      if (!isSignedIn || !user) {
        openSignInForWatchlist();
        return false;
      }

      const id = String(anime.id);
      const existingIndex = watchlist.findIndex((b) => String(b.id) === id);

      let updatedList: WatchlistItem[];
      let isNowSaved = false;

      if (existingIndex >= 0) {
        updatedList = watchlist.filter((_, i) => i !== existingIndex);
        isNowSaved = false;
      } else {
        updatedList = [toWatchlistItem(anime), ...watchlist];
        isNowSaved = true;
      }

      // Optimistic update
      setWatchlist(updatedList);
      saveLocalWatchlist(updatedList);

      await syncToClerk(user, updatedList);

      return isNowSaved;
    },
    [isSignedIn, user, watchlist, openSignInForWatchlist]
  );

  const removeFromWatchlist = useCallback(
    async (id: string | number) => {
      const updatedList = watchlist.filter((b) => String(b.id) !== String(id));
      setWatchlist(updatedList);
      saveLocalWatchlist(updatedList);

      if (isSignedIn && user) {
        await syncToClerk(user, updatedList);
      }
    },
    [isSignedIn, user, watchlist]
  );

  const clearWatchlist = useCallback(async () => {
    setWatchlist([]);
    saveLocalWatchlist([]);

    if (isSignedIn && user) {
      try {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            watchlist: [],
          },
        });
      } catch (err) {
        console.error('Failed to clear Clerk metadata watchlist:', err);
      }
    }
  }, [isSignedIn, user]);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        isSaved,
        toggleWatchlist,
        removeFromWatchlist,
        clearWatchlist,
        isSyncing,
        openSignInForWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
