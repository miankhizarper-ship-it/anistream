import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { RouterProvider, useRouter } from './context/RouterContext';
import { ToastProvider } from './context/ToastContext';
import { WatchlistProvider, useWatchlist } from './context/WatchlistContext';
import { WatchHistoryProvider } from './context/WatchHistoryContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BackToTop } from './components/BackToTop';
import { CLERK_PUBLISHABLE_KEY } from './config';

// Views
import { HomeView } from './views/HomeView';
import { DetailsView } from './views/DetailsView';
import { WatchView } from './views/WatchView';
import { ExploreView } from './views/ExploreView';
import { MoviesView } from './views/MoviesView';
import { SearchView } from './views/SearchView';
import { MyListView } from './views/MyListView';
import { DownloadAppView } from './views/DownloadAppView';
import { NotFoundView } from './views/NotFoundView';

const MainContent: React.FC = () => {
  const { route } = useRouter();
  const { watchlist } = useWatchlist();

  const isWatchPage = route.type === 'watch';

  const renderView = () => {
    switch (route.type) {
      case 'home':
        return <HomeView />;
      case 'anime':
        return <DetailsView id={route.params.id || ''} />;
      case 'watch':
        return <WatchView id={route.params.id || ''} episode={route.params.episode || '1'} />;
      case 'explore':
        return <ExploreView initialGenre={route.params.genre} />;
      case 'movies':
        return <MoviesView />;
      case 'search':
        return <SearchView query={route.query} />;
      case 'mylist':
        return <MyListView />;
      case 'app':
        return <DownloadAppView />;
      default:
        return <NotFoundView />;
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full overflow-x-hidden bg-[#08060d] text-slate-100 antialiased selection:bg-[#a855f7] selection:text-white">
      {!isWatchPage && <Navbar />}
      <main className={`flex-1 w-full relative ${!isWatchPage ? 'sm:mt-4' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={route.rawPath}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      {!isWatchPage && <Footer />}
      <BottomNav watchlistCount={watchlist.length} />
      <OfflineIndicator />
      {!isWatchPage && <BackToTop />}
    </div>
  );
};

export default function App() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#a855f7',
          colorBackground: '#12101e',
          colorInputBackground: '#1a152c',
          colorText: '#f8fafc',
          colorInputText: '#ffffff',
        },
      }}
    >
      <ToastProvider>
        <WatchlistProvider>
          <WatchHistoryProvider>
            <RouterProvider>
              <MainContent />
            </RouterProvider>
          </WatchHistoryProvider>
        </WatchlistProvider>
      </ToastProvider>
    </ClerkProvider>
  );
}
