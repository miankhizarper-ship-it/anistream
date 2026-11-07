import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';

export interface WatchHistoryItem {
  id: string;
  media_type: 'anime';
  title: string;
  poster: string | null;
  cover: string | null;
  episode: number;
  lastWatched: number; // timestamp in ms
  currentTime?: number; // playback position in seconds
  duration?: number; // total duration in seconds
  progress?: number; // 0 to 100 percentage
}

export interface WatchHistoryContextType {
  history: WatchHistoryItem[];
  addOrUpdateHistory: (item: Omit<WatchHistoryItem, 'lastWatched'> & { lastWatched?: number }) => void;
  updateProgress: (id: string | number, episode: number, currentTime: number, duration?: number) => void;
  getHistoryItem: (id: string | number, episode?: number) => WatchHistoryItem | undefined;
  getAnimeProgress: (id: string | number) => WatchHistoryItem | undefined;
  removeHistoryItem: (id: string | number, episode?: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  isSyncing: boolean;
}

const STORAGE_KEY = 'anistream_history';
const EVENT_KEY = 'anistream_history_updated';

const WatchHistoryContext = createContext<WatchHistoryContextType | null>(null);

const HISTORY_CAP = 50;

function getLocalHistory(): WatchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(items: WatchHistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT_KEY));
  } catch (err) {
    console.error('Failed to write local watch history:', err);
  }
}

function matchesItem(a: WatchHistoryItem, id: string | number, episode?: number): boolean {
  if (String(a.id) !== String(id)) return false;
  if (episode !== undefined && a.episode !== undefined && a.episode !== episode) return false;
  return true;
}

export const WatchHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, user, isLoaded } = useUser();
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => getLocalHistory());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const hasMigratedRef = useRef(false);
  const clerkDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClerkUpdateRef = useRef<WatchHistoryItem[] | null>(null);

  // Commit updates to Clerk with debouncing to prevent rate-limiting on player ticks (5s)
  const queueClerkSync = useCallback(
    (updatedHistory: WatchHistoryItem[], immediate = false) => {
      if (!isSignedIn || !user) return;
      pendingClerkUpdateRef.current = updatedHistory;

      if (clerkDebounceTimerRef.current) {
        clearTimeout(clerkDebounceTimerRef.current);
        clerkDebounceTimerRef.current = null;
      }

      const performSync = async () => {
        if (!pendingClerkUpdateRef.current || !user) return;
        const payload = pendingClerkUpdateRef.current;
        pendingClerkUpdateRef.current = null;
        try {
          await user.update({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              watchHistory: payload.slice(0, HISTORY_CAP),
            },
          });
        } catch (err) {
          console.warn('Failed to sync watch history with Clerk metadata:', err);
        }
      };

      if (immediate) {
        performSync();
      } else {
        clerkDebounceTimerRef.current = setTimeout(performSync, 3000);
      }
    },
    [isSignedIn, user]
  );

  // Flush any pending updates when unmounting
  useEffect(() => {
    return () => {
      if (clerkDebounceTimerRef.current && pendingClerkUpdateRef.current && user) {
        clearTimeout(clerkDebounceTimerRef.current);
        const payload = pendingClerkUpdateRef.current;
        user
          .update({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              watchHistory: payload.slice(0, HISTORY_CAP),
            },
          })
          .catch(() => {});
      }
    };
  }, [user]);

  // Sync state with Clerk metadata upon sign in and migration from localStorage
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      setHistory(getLocalHistory());
      hasMigratedRef.current = false;
      return;
    }

    const syncClerkMetadata = async () => {
      try {
        setIsSyncing(true);
        const metadata = (user.unsafeMetadata || {}) as { watchHistory?: WatchHistoryItem[] };
        const clerkHistory: WatchHistoryItem[] = Array.isArray(metadata.watchHistory)
          ? metadata.watchHistory.filter((i) => i && i.id !== undefined)
          : [];

        const localItems = getLocalHistory();

        if (localItems.length > 0 && !hasMigratedRef.current) {
          hasMigratedRef.current = true;
          // Merge local history with Clerk history (dedupe anime_id_episode, newest wins)
          const mergedMap = new Map<string, WatchHistoryItem>();

          clerkHistory.forEach((item) => {
            const key = `${item.id}_${item.episode || 0}`;
            mergedMap.set(key, item);
          });

          localItems.forEach((localItem) => {
            const key = `${localItem.id}_${localItem.episode || 0}`;
            const existing = mergedMap.get(key);
            if (!existing || (localItem.lastWatched || 0) > (existing.lastWatched || 0)) {
              mergedMap.set(key, localItem);
            }
          });

          const mergedList = Array.from(mergedMap.values())
            .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
            .slice(0, HISTORY_CAP);

          setHistory(mergedList);
          saveLocalHistory(mergedList);

          await user.update({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              watchHistory: mergedList,
            },
          });
        } else {
          setHistory(clerkHistory);
          saveLocalHistory(clerkHistory);
        }
      } catch (err) {
        console.error('Failed to fetch/sync watch history from Clerk:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncClerkMetadata();
  }, [isLoaded, isSignedIn, user]);

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(getLocalHistory());
    };
    const handleCustom = () => setHistory(getLocalHistory());
    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_KEY, handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_KEY, handleCustom);
    };
  }, []);

  // Add or update an item in watch history
  const addOrUpdateHistory = useCallback(
    (item: Omit<WatchHistoryItem, 'lastWatched'> & { lastWatched?: number }) => {
      const currentList = getLocalHistory();
      const existing = currentList.find((h) => matchesItem(h, item.id, item.episode));

      const entry: WatchHistoryItem = {
        ...item,
        id: String(item.id),
        media_type: 'anime',
        lastWatched: item.lastWatched || Date.now(),
        currentTime: item.currentTime ?? existing?.currentTime ?? 0,
        duration: item.duration ?? existing?.duration ?? 0,
        progress:
          item.progress ??
          existing?.progress ??
          (item.currentTime && item.duration && item.duration > 0
            ? Math.min(100, Math.round((item.currentTime / item.duration) * 100))
            : 0),
      };

      const filtered = currentList.filter((h) => !matchesItem(h, item.id, item.episode));
      const updated = [entry, ...filtered].slice(0, HISTORY_CAP);

      setHistory(updated);
      saveLocalHistory(updated);
      queueClerkSync(updated, false);
    },
    [queueClerkSync]
  );

  // High-performance progress updater for player ticks
  const updateProgress = useCallback(
    (id: string | number, episode: number, currentTime: number, duration?: number) => {
      const currentList = getLocalHistory();
      const targetIndex = currentList.findIndex((h) => matchesItem(h, id, episode));

      if (targetIndex === -1) {
        // Not tracked yet - create a stub entry (title/poster filled by caller on first add)
        return;
      }

      const existing = currentList[targetIndex];
      const validDuration = duration && duration > 0 ? duration : existing.duration || 0;
      const progressPercent =
        validDuration > 0
          ? Math.min(100, Math.round((currentTime / validDuration) * 100))
          : existing.progress || 0;

      const updatedItem: WatchHistoryItem = {
        ...existing,
        currentTime: Math.floor(currentTime),
        duration: Math.floor(validDuration),
        progress: progressPercent,
        lastWatched: Date.now(),
      };

      const remaining = currentList.filter((_, idx) => idx !== targetIndex);
      const updatedList = [updatedItem, ...remaining].slice(0, HISTORY_CAP);

      setHistory(updatedList);
      saveLocalHistory(updatedList);
      queueClerkSync(updatedList, false);
    },
    [queueClerkSync]
  );

  const historyRef = useRef(history);
  historyRef.current = history;

  const getHistoryItem = useCallback(
    (id: string | number, episode?: number) => {
      return historyRef.current.find((h) => matchesItem(h, id, episode));
    },
    []
  );

  const getAnimeProgress = useCallback(
    (id: string | number) => {
      // most recent history entry for this anime (any episode)
      return historyRef.current.find((h) => String(h.id) === String(id));
    },
    []
  );

  const removeHistoryItem = useCallback(
    async (id: string | number, episode?: number) => {
      const updated = getLocalHistory().filter((h) => !matchesItem(h, id, episode));
      setHistory(updated);
      saveLocalHistory(updated);
      queueClerkSync(updated, true);
    },
    [queueClerkSync]
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    saveLocalHistory([]);
    if (isSignedIn && user) {
      try {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            watchHistory: [],
          },
        });
      } catch (err) {
        console.error('Failed to clear Clerk watch history metadata:', err);
      }
    }
  }, [isSignedIn, user]);

  return (
    <WatchHistoryContext.Provider
      value={{
        history,
        addOrUpdateHistory,
        updateProgress,
        getHistoryItem,
        getAnimeProgress,
        removeHistoryItem,
        clearHistory,
        isSyncing,
      }}
    >
      {children}
    </WatchHistoryContext.Provider>
  );
};

export function useWatchHistory() {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
}
