import React from 'react';
import { useRouter } from '../context/RouterContext';
import { LogoMark } from './Logo';

export const Footer: React.FC = () => {
  const { navigate } = useRouter();

  const quickLinks: Array<{ label: string; path: string }> = [
    { label: 'Home', path: '/' },
    { label: 'Browse Anime', path: '/explore' },
    { label: 'Anime Movies', path: '/movies' },
    { label: 'Search', path: '/search' },
    { label: 'My List', path: '/mylist' },
    { label: 'Android App', path: '/app' },
  ];

  const genres: Array<{ label: string; genre: string }> = [
    { label: 'Action', genre: 'Action' },
    { label: 'Romance', genre: 'Romance' },
    { label: 'Fantasy', genre: 'Fantasy' },
    { label: 'Comedy', genre: 'Comedy' },
  ];

  return (
    <footer className="mt-10 border-t border-white/8 bg-[#0a0713]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          {/* Brand */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <LogoMark className="w-9 h-9 rounded-xl" />
              <span className="text-lg font-black tracking-tight text-white">
                ANI<span className="text-[#a855f7]">STREAM</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stream your favorite anime with a beautiful, fast interface. Metadata by
              AniList, playback via the Yenime embed player.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Explore</p>
              <ul className="space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.path}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="text-xs font-semibold text-slate-400 hover:text-[#c084fc] transition-colors cursor-pointer"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Genres</p>
              <ul className="space-y-2">
                {genres.map((g) => (
                  <li key={g.genre}>
                    <button
                      onClick={() => navigate(`/explore/${encodeURIComponent(g.genre)}`)}
                      className="text-xs font-semibold text-slate-400 hover:text-[#c084fc] transition-colors cursor-pointer"
                    >
                      {g.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Powered By</p>
              <ul className="space-y-2 text-xs font-semibold text-slate-400">
                <li>AniList</li>
                <li>Consumet API</li>
                <li>Yenime Player</li>
                <li>Clerk Auth</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-white/8">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            AniStream does not host or store any video files on its servers. All anime
            metadata is provided by the AniList community database and playback is handled
            by third-party embed players. AniStream is a discovery interface only.
          </p>
          <p className="text-[11px] text-slate-600 mt-2">
            © {new Date().getFullYear()} AniStream · Built for anime fans
          </p>
        </div>
      </div>
    </footer>
  );
};
