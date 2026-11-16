import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Register PWA service worker so browsers recognize EniStream as installable
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New EniStream update available.');
  },
  onOfflineReady() {
    console.log('[PWA] EniStream is ready for offline browsing.');
  },
  onRegisterError(error) {
    console.error('[PWA] SW registration failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
