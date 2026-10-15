import React from 'react';
import { Home, Film, BookOpen, Clock, Heart } from 'lucide-react';

interface BottomNavProps {
  activeSource: 'all' | 'flickreels' | 'melolo';
  onSourceChange: (source: 'all' | 'flickreels' | 'melolo') => void;
  onOpenHistoryModal: (type: 'history' | 'favorites') => void;
  historyCount: number;
  favoriteCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeSource,
  onSourceChange,
  onOpenHistoryModal,
  historyCount,
  favoriteCount
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07080b]/96 backdrop-blur-2xl border-t border-white/[0.08] px-3 py-1.5 shadow-2xl safe-area-bottom select-none">
      <div className="flex items-center justify-around">
        {/* Home / Semua */}
        <button
          onClick={() => onSourceChange('all')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeSource === 'all'
              ? 'text-red-500 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${activeSource === 'all' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Beranda</span>
        </button>

        {/* FlickReels */}
        <button
          onClick={() => onSourceChange('flickreels')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeSource === 'flickreels'
              ? 'text-red-500 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className={`w-5 h-5 ${activeSource === 'flickreels' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">FlickReels</span>
        </button>

        {/* Melolo */}
        <button
          onClick={() => onSourceChange('melolo')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeSource === 'melolo'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${activeSource === 'melolo' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Melolo</span>
        </button>

        {/* Riwayat Nonton */}
        <button
          onClick={() => onOpenHistoryModal('history')}
          className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Clock className="w-5 h-5 stroke-2" />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Riwayat</span>
          {historyCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">
              {historyCount > 9 ? '9+' : historyCount}
            </span>
          )}
        </button>

        {/* Favorit */}
        <button
          onClick={() => onOpenHistoryModal('favorites')}
          className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Heart className="w-5 h-5 stroke-2" />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Favorit</span>
          {favoriteCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">
              {favoriteCount > 9 ? '9+' : favoriteCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
