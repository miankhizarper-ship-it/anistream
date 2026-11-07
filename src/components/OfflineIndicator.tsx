import React, { useEffect, useState } from 'react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOnline(false);
    const goOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 2500);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (isOnline && !justReconnected) return null;

  return (
    <div
      className={`fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[95] px-4 py-2.5 rounded-full border shadow-2xl flex items-center gap-2 text-xs font-bold backdrop-blur-xl transition-colors ${
        isOnline
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
          : 'bg-[#1a152c]/95 border-[#a855f7]/40 text-slate-200'
      }`}
      role="status"
    >
      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      {isOnline ? 'Back online' : 'You are offline - browsing cached content'}
    </div>
  );
};
