import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type RouteType =
  | 'home'
  | 'anime'
  | 'watch'
  | 'explore'
  | 'movies'
  | 'search'
  | 'mylist'
  | 'app'
  | 'notfound';

export interface RouteState {
  type: RouteType;
  params: {
    id?: string;
    episode?: string;
    genre?: string;
  };
  query: Record<string, string>;
  rawPath: string;
}

interface RouterContextType {
  route: RouteState;
  navigate: (path: string) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

function parsePath(fullPath: string): RouteState {
  const [pathname, search] = fullPath.split('?');
  const searchParams = new URLSearchParams(search || '');
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const segments = clean ? clean.split('/') : [];

  // /watch/:id/:episode
  if (segments[0] === 'watch' && segments[1]) {
    return {
      type: 'watch',
      params: { id: segments[1], episode: segments[2] || '1' },
      query,
      rawPath: fullPath,
    };
  }

  // /anime/:id
  if (segments[0] === 'anime' && segments[1]) {
    return {
      type: 'anime',
      params: { id: segments[1] },
      query,
      rawPath: fullPath,
    };
  }

  // /explore (optionally /explore/:genre)
  if (segments[0] === 'explore') {
    return {
      type: 'explore',
      params: { genre: segments[1] || undefined },
      query,
      rawPath: fullPath,
    };
  }

  // /movies — dedicated anime movies browser
  if (segments[0] === 'movies') {
    return {
      type: 'movies',
      params: {},
      query,
      rawPath: fullPath,
    };
  }

  // /search
  if (segments[0] === 'search') {
    return {
      type: 'search',
      params: {},
      query,
      rawPath: fullPath,
    };
  }

  // /mylist (and /profile alias)
  if (segments[0] === 'mylist' || segments[0] === 'profile') {
    return {
      type: 'mylist',
      params: {},
      query,
      rawPath: fullPath,
    };
  }

  // /app — Android app download page (public/anistream.apk + app_version.json)
  if (segments[0] === 'app' && segments.length === 1) {
    return {
      type: 'app',
      params: {},
      query,
      rawPath: fullPath,
    };
  }

  // Unknown single-segment paths that are not root -> 404 view
  if (segments.length > 0) {
    return {
      type: 'notfound',
      params: {},
      query,
      rawPath: fullPath,
    };
  }

  // Default home
  return {
    type: 'home',
    params: {},
    query,
    rawPath: fullPath || '/',
  };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname + window.location.search;
  });

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path === window.location.pathname + window.location.search) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  }, [navigate]);

  const routeState = parsePath(currentPath);

  return (
    <RouterContext.Provider value={{ route: routeState, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
