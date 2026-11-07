import React, { useEffect, useState } from 'react';
import {
  Download,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Tv,
  Bookmark,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface VersionManifest {
  latest_version: string;
  min_supported_version: string;
  force_update: boolean;
  apk_url: string;
  release_notes: string;
}

/**
 * Android app download page (/app).
 *
 * The signed APK is committed to this same repo at public/anistream.apk and
 * the release manifest lives at public/app_version.json — the mobile app's
 * in-app updater reads that same manifest on every start (CineStream-style
 * version control system).
 */
export const DownloadAppView: React.FC = () => {
  const [manifest, setManifest] = useState<VersionManifest | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/app_version.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data: VersionManifest) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        /* page works without the manifest too */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = '/anistream.apk';
    link.download = 'anistream.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 2500);
  };

  const features: Array<{ icon: React.ReactNode; title: string; text: string }> = [
    {
      icon: <Tv className="w-5 h-5" />,
      title: 'Home, Explore & Movies',
      text: 'Trending rails, full filters, infinite scroll and a dedicated anime-movies page — the whole website in your pocket.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: 'Built-in AdBlock',
      text: 'The player blocks the embed\u2019s popunder/ad network at the network level, so episodes play without background ad tabs.',
    },
    {
      icon: <Bookmark className="w-5 h-5" />,
      title: 'My List & Sync',
      text: 'Sign in once and your watchlist + watch progress stay in sync between the website and the app.',
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: 'In-app updates',
      text: 'The app checks app_version.json on every start and installs new builds with one tap — no store needed.',
    },
  ];

  const steps = [
    'Download the APK with the button above.',
    'Open the file and allow "Install unknown apps" for your browser (one time).',
    'Install, sign in, and enjoy — future updates arrive inside the app.',
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 w-full pb-28 space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#170f2b] via-[#0d0a18] to-[#1a0f2e] p-6 sm:p-10 shadow-2xl shadow-black/60">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#a855f7]/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-[#a855f7]/15 border border-[#a855f7]/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-9 h-9 text-[#c084fc]" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#c084fc]">
                Android App
              </span>
              {manifest && (
                <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  v{manifest.latest_version}
                </span>
              )}
              <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                APK · direct install
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              AniStream for Android
            </h1>
            <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
              The full AniStream experience as a native app — built with Flutter, signed APK,
              and a built-in updater that installs new versions straight from this site.
            </p>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-3 mt-7">
          <button
            onClick={handleDownload}
            className="px-6 py-3.5 rounded-2xl bg-[#a855f7] hover:bg-[#c084fc] text-white font-extrabold text-sm shadow-xl shadow-purple-950/60 active:scale-95 transition-all flex items-center gap-2 cursor-pointer btn-sheen"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloading ? 'Downloading…' : 'Download anistream.apk'}</span>
          </button>
          {manifest?.release_notes && (
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              <Sparkles className="w-3 h-3 inline mr-1 text-[#a855f7]" />
              {manifest.release_notes}
            </p>
          )}
        </div>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">
          What's inside
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-2xl bg-[#0d0a18]/80 border border-white/10 hover:border-[#a855f7]/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#a855f7]/15 border border-[#a855f7]/30 flex items-center justify-center text-[#c084fc] mb-3">
                {f.icon}
              </div>
              <h3 className="font-extrabold text-white text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Install steps */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">
          Install in 3 steps
        </h2>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/8"
            >
              <span className="w-6 h-6 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#c084fc] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{s}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Updates are delivered in-app: the app compares its version against
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white/5 text-slate-400">/app_version.json</code>
            on every start and offers a one-tap update when a new APK is published here.
          </p>
        </div>
      </div>
    </div>
  );
};
