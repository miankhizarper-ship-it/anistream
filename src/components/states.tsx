import React from 'react';
import { RefreshCw, Ghost, SearchX } from 'lucide-react';

/* ------------------------------- Loading --------------------------------- */

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div className="w-full min-h-[60dvh] flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-8 h-8 border-[3px] border-[#a855f7]/30 border-t-[#a855f7] rounded-full animate-spin" />
    <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">{label}...</p>
  </div>
);

export const CardSkeleton: React.FC<{ aspect?: 'poster' | 'backdrop' }> = ({ aspect = 'poster' }) => (
  <div className={`rounded-2xl overflow-hidden bg-[#12101e] border border-white/5 ${aspect === 'backdrop' ? 'aspect-video' : 'aspect-[2/3]'}`}>
    <div className="w-full h-full skeleton-shimmer" />
  </div>
);

export const RowSkeleton: React.FC<{ title?: string; aspect?: 'poster' | 'backdrop' }> = ({ title, aspect = 'poster' }) => (
  <section className="my-5 sm:my-7 md:my-8 px-4 sm:px-6 md:px-12">
    {title && (
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-4 sm:h-5 bg-[#a855f7] rounded-full inline-block" />
        <div className="h-5 w-40 rounded-lg skeleton-shimmer" />
      </div>
    )}
    <div className="flex gap-2.5 sm:gap-4 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={aspect === 'backdrop' ? 'w-[200px] sm:w-[260px] shrink-0' : 'w-[125px] sm:w-[165px] md:w-[200px] shrink-0'}>
          <CardSkeleton aspect={aspect} />
        </div>
      ))}
    </div>
  </section>
);

export const GridSkeleton: React.FC<{ count?: number }> = ({ count = 18 }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const DetailSkeleton: React.FC = () => (
  <div className="w-full">
    <div className="relative h-[42vh] sm:h-[48vh] skeleton-shimmer" />
    <div className="px-4 sm:px-6 md:px-12 -mt-24 relative z-10 flex flex-col md:flex-row gap-6 md:gap-10">
      <div className="w-36 sm:w-44 md:w-56 shrink-0 aspect-[2/3] rounded-2xl skeleton-shimmer" />
      <div className="flex-1 space-y-4 pt-10 md:pt-16">
        <div className="h-8 w-2/3 rounded-xl skeleton-shimmer" />
        <div className="h-4 w-1/3 rounded-lg skeleton-shimmer" />
        <div className="h-24 w-full rounded-xl skeleton-shimmer" />
        <div className="flex gap-3">
          <div className="h-12 w-36 rounded-2xl skeleton-shimmer" />
          <div className="h-12 w-36 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    </div>
  </div>
);

/* -------------------------------- Errors ---------------------------------- */

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Unable to reach the anime service. Check your connection and try again.',
  onRetry,
}) => (
  <div className="w-full min-h-[55dvh] flex flex-col items-center justify-center gap-4 text-center px-4">
    <div className="w-16 h-16 rounded-3xl bg-[#a855f7]/10 border border-[#a855f7]/25 flex items-center justify-center">
      <Ghost className="w-8 h-8 text-[#c084fc]" />
    </div>
    <div>
      <p className="text-sm font-bold text-white mb-1">Something went wrong</p>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#c084fc] text-white text-xs font-bold shadow-lg accent-glow-sm active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ icon, title, subtitle, action }) => (
  <div className="w-full min-h-[45dvh] flex flex-col items-center justify-center gap-4 text-center px-4">
    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
      {icon || <SearchX className="w-8 h-8 text-slate-400" />}
    </div>
    <div>
      <p className="text-sm font-bold text-white mb-1">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 max-w-xs leading-relaxed">{subtitle}</p>}
    </div>
    {action}
  </div>
);
