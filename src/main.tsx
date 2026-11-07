import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Register PWA service worker so browsers recognize AniStream as installable
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New AniStream update available.');
  },
  onOfflineReady() {
    console.log('[PWA] AniStream is ready for offline browsing.');
  },
  onRegisterError(error) {
    console.error('[PWA] SW registration failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
