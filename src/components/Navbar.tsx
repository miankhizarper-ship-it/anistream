import React, { useState, useEffect } from 'react';
import { Search, Bookmark, Menu, X, Home, Compass, Film, LogIn, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { useRouter } from '../context/RouterContext';
import { CommandPalette } from './CommandPalette';
import { LogoMark, LogoWordmark } from './Logo';

export const Navbar: React.FC = () => {
  const { route, navigate } = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 30) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
      } else if (currentScrollY < lastScrollY - 5) {
        setShowNavbar(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Global shortcut for Cmd+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll when mobile menu drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [mobileMenuOpen]);

  // Search lives in the header icon button (Cmd+K) — no duplicate nav item.
  // My List lives in the profile menu — no duplicate nav item.
  const navLinks: Array<{
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Browse', path: '/explore', icon: Compass },
    { label: 'Movies', path: '/movies', icon: Film },
  ];

  const isActive = (path: string) => {
    if (path === '/') return route.type === 'home';
    if (path === '/explore') return route.type === 'explore';
    if (path === '/movies') return route.type === 'movies';
    return false;
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Modern Floating Navbar */}
      <header
        className={`fixed top-4 left-4 right-4 md:left-6 md:right-6 xl:left-1/2 xl:-translate-x-1/2 xl:w-[94%] xl:max-w-6xl 2xl:max-w-7xl z-50 transition-transform duration-300 transform-gpu ${
          showNavbar ? 'translate-y-0' : '-translate-y-24'
        }`}
      >
        <div className="bg-transparent border-0 shadow-none px-0 py-0 xl:bg-[#0b0814]/80 xl:backdrop-blur-2xl xl:border xl:border-white/[0.12] xl:shadow-2xl xl:shadow-black/80 xl:rounded-full xl:px-4 2xl:px-6 xl:py-2 flex items-center justify-between gap-2 xl:gap-3 2xl:gap-4 w-full">
          {/* Brand Wordmark & Icon */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap shrink-0 group focus-visible:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 xl:w-8 xl:h-8 rounded-full overflow-hidden flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform bg-black/60 xl:bg-black/40 backdrop-blur-xl xl:backdrop-blur-none border border-white/15 xl:border-transparent p-0.5 xl:p-0">
              <LogoMark className="w-full h-full rounded-full" />
            </div>
            <LogoWordmark />
          </button>

          {/* Desktop Navigation Links (Pill Style) */}
          <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1.5 text-xs font-medium">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`whitespace-nowrap shrink-0 transition-all px-2.5 2xl:px-3.5 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
                    active
                      ? 'bg-white text-[#0d0a18] font-bold shadow-md shadow-black/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right-side Utilities & Authentication */}
          <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
            {/* Search Trigger Button */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="p-2 xl:p-2.5 rounded-full bg-black/60 xl:bg-white/5 hover:bg-white/15 backdrop-blur-xl xl:backdrop-blur-none border border-white/15 xl:border-white/10 text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-lg xl:shadow-none shrink-0"
              title="Search anime (Cmd+K)"
              aria-label="Search anime"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Clerk Authentication in Header */}
            <SignedIn>
              <div className="flex items-center">
                <UserButton
                  appearance={{
                    baseTheme: dark,
                    variables: {
                      colorPrimary: '#a855f7',
                    },
                    elements: {
                      avatarBox:
                        'w-8 h-8 xl:w-9 xl:h-9 rounded-full border border-white/20 hover:border-[#a855f7] transition-all cursor-pointer shadow-md shadow-black/40',
                      userButtonTrigger: 'focus:shadow-none focus:outline-none',
                    },
                  }}
                >
                  <UserButton.MenuItems>
                    <UserButton.Action
                      label="My List"
                      labelIcon={<Bookmark className="w-4 h-4 text-[#a855f7]" />}
                      onClick={() => navigate('/mylist')}
                    />
                  </UserButton.MenuItems>
                </UserButton>
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="px-3.5 py-1.5 rounded-full bg-[#a855f7] hover:bg-[#c084fc] text-white text-xs font-bold shadow-md shadow-purple-950/50 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  title="Sign In with Clerk"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </SignInButton>
            </SignedOut>

            {/* Hamburger Menu Toggle (Mobile/Tablet) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="xl:hidden p-2.5 rounded-full bg-black/60 hover:bg-white/15 backdrop-blur-xl border border-white/15 text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer shadow-lg"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Navigation Drawer Menu (Mobile & Tablet Screens) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden xl:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 right-0 max-w-xs w-full bg-[#0d0a18] border-l border-white/10 shadow-2xl flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-base font-black text-white">
                  <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-black/40">
                    <LogoMark className="w-full h-full" />
                  </div>
                  <LogoWordmark compact />
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                {navLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <button
                      key={link.path}
                      onClick={() => handleNavClick(link.path)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-sm transition-all cursor-pointer ${
                        active
                          ? 'bg-[#a855f7] text-white shadow-lg shadow-purple-950/50'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <link.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                        <span>{link.label}</span>
                      </div>
                    </button>
                  );
                })}

                {/* App download teaser */}
                <button
                  onClick={() => handleNavClick('/explore')}
                  className="w-full mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#a855f7]/15 to-transparent border border-[#a855f7]/25 text-left cursor-pointer hover:border-[#a855f7]/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#c084fc] mb-1">
                    <Sparkles className="w-3 h-3" />
                    <span>AniStream Mobile</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Android app with offline downloads coming soon.
                  </p>
                </button>
              </div>

              {/* Drawer Footer Info */}
              <div className="p-4 border-t border-white/10 bg-black/40 text-[11px] text-slate-500 text-center">
                AniStream v1.0.0 · Anime Streaming
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
};
