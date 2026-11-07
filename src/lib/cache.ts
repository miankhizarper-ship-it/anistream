/**
 * In-memory and SessionStorage Cache Utility for API calls with TTL
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

export function getCachedData<T>(key: string): T | null {
  // Check memory cache first
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < DEFAULT_TTL) {
    return mem.data;
  }

  // Check sessionStorage
  try {
    const sessionStr = sessionStorage.getItem(`anistream_cache_${key}`);
    if (sessionStr) {
      const parsed: CacheEntry<T> = JSON.parse(sessionStr);
      if (Date.now() - parsed.timestamp < DEFAULT_TTL) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    }
  } catch {
    // Ignore storage quota/security errors
  }

  return null;
}

export function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };

  memoryCache.set(key, entry);

  try {
    sessionStorage.setItem(`anistream_cache_${key}`, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}
