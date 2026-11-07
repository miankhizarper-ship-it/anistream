import React from 'react';
import { Home } from 'lucide-react';
import { Ghost } from 'lucide-react';
import { useRouter } from '../context/RouterContext';

export const NotFoundView: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="w-full min-h-[75dvh] flex flex-col items-center justify-center gap-5 text-center px-4">
      <div className="relative">
        <Ghost className="w-16 h-16 text-[#a855f7] animate-float" />
        <span className="absolute -top-2 -right-3 text-xl">?</span>
      </div>
      <div>
        <p className="text-5xl font-black text-white mb-2 tracking-tight">
          4<span className="text-[#a855f7]">0</span>4
        </p>
        <p className="text-sm font-bold text-white">This page drifted into another isekai</p>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 rounded-2xl bg-[#a855f7] hover:bg-[#c084fc] text-white text-xs font-extrabold shadow-xl shadow-purple-950/60 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
      >
        <Home className="w-4 h-4" />
        Back to Home
      </button>
    </div>
  );
};
