# AniStream - Anime Streaming (Web)

An anime streaming web application: live AniList discovery (trending, popular,
airing, search, browse by genre), a dedicated Yenime embed player with episode
tracking, and watchlist / watch-history persistence via Clerk.

Built as the anime sibling of CineStream - same architecture, anime soul.

```
React 19 + TypeScript + Vite + Tailwind CSS 4 + Clerk + Motion + PWA
Deploy target: Cloudflare Workers (static assets, SPA fallback - no backend)
```

## Features

- **Home** - auto-rotating hero spotlight (top trending), Continue Watching row
  with progress bars, Trending Now, All-Time Popular, Airing Soon (with episode
  countdowns), genre shortcuts, Android app teaser.
- **Details** (`/anime/:id`) - banner backdrop, poster, full metadata (rating,
  status, format, season, studios, duration), genres, synopsis, full episode
  grid with watched markers, characters, recommendations.
- **Watch** (`/watch/:id/:ep`) - immersive Yenime embed player (`?dub=1` for
  dub), sub/dub toggle, previous/next navigation, collapsible episode drawer,
  keyboard arrows, PLAYER_EVENT progress tracking, "More Like This".
- **Browse** (`/explore[/:genre]`) - genre + format + season + year + status
  filters with 4 sort orders and infinite scroll.
- **Movies** (`/movies`) - anime movies only (format=MOVIE), sort chips,
  auto load-more on scroll, floating back-to-top button.
- **Search** (`/search?q=`) - debounced live search + full results page.
- **My List** (`/mylist`) - Watchlist (cap 80) + Continue Watching (cap 50),
  synced to the signed-in Clerk account via `unsafeMetadata`.
- **Command palette** (`Cmd/Ctrl+K` or `/`) - quick search with recent searches.
- **PWA** - installable, offline shell caching, AniList image caching.
- 404 page, offline indicator, toasts, back-to-top, mobile bottom nav.

## Data sources

| Purpose | Source |
| --- | --- |
| Trending / Popular / Airing / Search / Browse lists | Consumet `meta/anilist` endpoints (`VITE_CONSUMET_BASE`) |
| Anime details (info, episodes, characters, recommendations) | AniList GraphQL (`graphql.anilist.co`) with automatic Consumet `info` fallback |
| Streaming | Yenime embed player `https://player.yenime.net/anime/ani/{anilistId}/{episode}` (docs: `?dub=1`, `PLAYER_EVENT` postMessages) |
| Auth + list sync | Clerk (`VITE_CLERK_PUBLISHABLE_KEY`) |

> Note: the details route prefers AniList GraphQL because it is faster and
> always available; the Consumet `/meta/anilist/info/:id` route on the current
> instance often hangs/fails (its provider scraping). If you fix the instance,
> you can swap the order in `src/lib/anilist.ts` -> `getAnimeInfo()`.

## Local development

```bash
npm install
npm run dev        # http://localhost:3001
```

Env vars live in `.env` (optional - copy `.env.example`; `src/config.ts`
ships working defaults so a bare build works without it):

```
VITE_CLERK_PUBLISHABLE_KEY=...
VITE_CONSUMET_BASE=https://apiconsumetorg-rho-lemon.vercel.app
VITE_PLAYER_BASE=https://player.yenime.net
```

## Deploy to Cloudflare Workers

The repo is worker-ready out of the box:

- `wrangler.jsonc` serves `./dist` with `not_found_handling:
  single-page-application`, so deep links like `/movies` or `/watch/21/1`
  work on hard refresh and direct visits.
- `src/config.ts` ships working defaults for the Clerk key and API bases, so
  the first deploy needs **no environment setup**.

### Option A - direct deploy (Wrangler CLI)

```bash
# 1. Build
npm run build

# 2. Login (first time only)
npx wrangler login

# 3. Deploy
npm run deploy       # == npm run build && wrangler deploy
```

### Option B - Git integration (Cloudflare Workers Builds)

1. Push the repo to GitHub/GitLab (`.gitignore` already excludes
   `node_modules`, `dist`, `.wrangler`, `.env`).
2. Cloudflare dashboard -> Workers & Pages -> Create -> Workers -> Connect
   to Git -> pick the repo.
3. Build settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
4. Save and deploy - every push to the connected branch redeploys.

### Local production preview

```bash
npm run build && npx wrangler dev   # serves ./dist exactly like production
```

Then open http://localhost:8787 and hard-refresh any deep route to confirm
the SPA fallback.

That's it - no server, no KV, no D1. Your app will be live at
`https://anistream.<your-subdomain>.workers.dev`.

**Custom domain:** Workers dashboard -> your worker -> Settings ->
Domains & Routes -> Add Custom Domain.

**Production Clerk key:** when moving off `pk_test`, set
`VITE_CLERK_PUBLISHABLE_KEY` to the production key in Cloudflare Workers
Build settings (or locally in `.env` before building) - the key is compiled
into the static bundle at build time.

## Project structure

```
src/
  config.ts               # env + brand palette + player URL builder
  lib/
    types.ts              # AnimeItem / AnimeInfo / PagedList ...
    cache.ts              # memory + sessionStorage TTL cache
    anilist.ts            # Consumet client + AniList GraphQL fallback
  context/
    RouterContext.tsx     # history-API router (anime routes)
    ToastContext.tsx      # toast notifications
    WatchlistContext.tsx  # watchlist + Clerk unsafeMetadata sync
    WatchHistoryContext.tsx # history + progress + Clerk sync (3s debounce)
  components/             # Navbar, BottomNav, Hero (in HomeView), cards, rows,
                          # EpisodeGrid, CommandPalette, Footer, states, Logo
  views/                  # Home, Details, Watch, Explore, Movies, Search,
                          # MyList, 404
```

## Brand - single color theme (shared with the Flutter app)

| Token | Hex |
| --- | --- |
| Background | `#08060D` |
| Surface | `#12101E` |
| Surface 2 | `#1A152C` |
| **Accent (primary)** | **`#A855F7`** |
| Accent hover | `#C084FC` |
| Accent deep | `#7C3AED` |
| Text | `#F8FAFC` |
| Text muted | `#A29EC0` |

Font: `Plus Jakarta Sans` (300-800). Logo/icon: `public/icon.svg`
(purple gradient play triangle + anime sparkles) - reuse it as the Android
app icon source for a consistent brand.

## Sync rules (mirrors the CineStream app)

- Watchlist: max 80 items, deduped by `anime_{anilistId}`.
- History: max 50 entries, deduped by `anime_{anilistId}_{episode}`, newest
  wins, progress updated from player `timeupdate` events, Clerk writes
  debounced by 3 seconds.
- Guests use `localStorage`; on sign-in the local data migrates + merges into
  the Clerk account automatically.
