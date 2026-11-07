import React from 'react';
import { Bookmark, Compass, Search, Tv, Film } from 'lucide-react';
import { useRouter } from '../context/RouterContext';

interface BottomNavProps {
  watchlistCount?: number;
}

/** Mobile bottom navigation - fixed, safe-area aware */
export const BottomNav: React.FC<BottomNavProps> = ({ watchlistCount = 0 }) => {
  const { route, navigate } = useRouter();

  const items: Array<{
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { label: 'Home', path: '/', icon: Tv },
    { label: 'Browse', path: '/explore', icon: Compass },
    { label: 'Movies', path: '/movies', icon: Film },
    { label: 'My List', path: '/mylist', icon: Bookmark, badge: watchlistCount },
  ];

  // Hide on watch page (immersive player)
  if (route.type === 'watch') return null;

  const isActive = (path: string) => {
    if (path === '/') return route.type === 'home';
    if (path === '/explore') return route.type === 'explore';
    if (path === '/movies') return route.type === 'movies';
    if (path === '/mylist') return route.type === 'mylist';
    return false;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0814]/92 backdrop-blur-2xl border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around px-2 pt-1.5 pb-1">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1.5 rounded-xl transition-colors cursor-pointer ${
                active ? 'text-[#c084fc]' : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0 right-2 min-w-4 h-4 px-1 rounded-full bg-[#a855f7] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {active && <span className="absolute -top-[7px] w-8 h-0.5 bg-[#a855f7] rounded-full" />}
            </button>
          );
        })}
        <button
          onClick={() => navigate('/search')}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1.5 rounded-xl transition-colors cursor-pointer ${
            route.type === 'search' ? 'text-[#c084fc]' : 'text-slate-500 hover:text-slate-300'
          }`}
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wide">Search</span>
        </button>
      </div>
    </nav>
  );
};
