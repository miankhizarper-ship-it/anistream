/// <reference types="vite-plugin-pwa/client" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'favicon.svg', 'mask-icon.svg'],
        manifest: {
          id: '/',
          name: 'AniStream - Anime Streaming',
          short_name: 'AniStream',
          description:
            'An anime streaming web application featuring live AniList discovery, responsive carousels, dedicated Yenime embed player, and watchlist persistence.',
          theme_color: '#08060d',
          background_color: '#08060d',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['entertainment', 'video'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // The /app page screenshots are heavy artwork that gets replaced
          // freely (the current repo copies are 2+ MB). They must NOT be
          // precached: Workbox's 2 MiB per-file limit turns them into a hard
          // BUILD failure (Cloudflare deploy crash), and precaching ~13 MB of
          // artwork on first visit would bloat offline storage. They are
          // served from the network and cached on demand by the same-origin
          // image runtime rule below instead.
          globIgnores: [
            '**/home.png',
            '**/explore.png',
            '**/movies.png',
            '**/search.png',
            '**/profile.png',
            '**/details.png',
            '**/episodes.png',
            '**/watch.png',
          ],
          // Safety net: a deploy must never fail again just because a stray
          // asset crossed Workbox's default 2 MiB per-file precache limit.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/s4\.anilist\.co\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'anilist-images-cache',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Same-origin images that are NOT precached — the /app page
              // screenshots. StaleWhileRevalidate keeps them offline-capable
              // after the first view without the up-front precache cost.
              // (Precached assets are always served by the precache
              // controller first, so this rule never duplicates them.)
              urlPattern: /\.(?:png|jpe?g|webp|gif|avif)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-images-cache',
                expiration: {
                  maxEntries: 32,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
