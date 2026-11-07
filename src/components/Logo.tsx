import React from 'react';

/**
 * AniStream brand mark - inline SVG version of /public/icon.svg
 * Purple gradient play triangle + anime sparkles on a dark rounded square.
 */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="ani-logo-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1c1233" />
        <stop offset="0.55" stopColor="#100a1f" />
        <stop offset="1" stopColor="#08060d" />
      </linearGradient>
      <linearGradient id="ani-logo-acc" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
        <stop offset="0" stopColor="#c98bff" />
        <stop offset="0.5" stopColor="#a855f7" />
        <stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="116" fill="url(#ani-logo-bg)" />
    <ellipse cx="268" cy="268" rx="150" ry="140" fill="#a855f7" opacity="0.16" />
    <path
      d="M198 168 L348 250 Q364 259 364 268 Q364 277 348 286 L198 368 Q180 378 168 367 Q156 356 156 334 L156 202 Q156 180 168 169 Q180 158 198 168 Z"
      fill="url(#ani-logo-acc)"
    />
    <path
      d="M382 96 C389 127 403 141 434 148 C403 155 389 169 382 200 C375 169 361 155 330 148 C361 141 375 127 382 96 Z"
      fill="#f3e8ff"
    />
    <path
      d="M136 322 C140 340 148 348 166 352 C148 356 140 364 136 382 C132 364 124 356 106 352 C124 348 132 340 136 322 Z"
      fill="#e9d5ff"
      opacity="0.9"
    />
  </svg>
);

export const LogoWordmark: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <span className="font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-slate-200 bg-clip-text text-transparent inline-block drop-shadow-md">
    ANI<span className="text-[#a855f7]">STREAM</span>
    {!compact && null}
  </span>
);
