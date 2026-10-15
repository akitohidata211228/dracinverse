import React, { useState } from 'react';
import {
  Film,
  Search,
  Link2,
  Clock,
  Heart,
  BookOpen,
  X,
  ChevronDown,
  TrendingUp,
  Layers
} from 'lucide-react';

interface NavbarProps {
  activeSource: 'all' | 'flickreels' | 'melolo';
  onSourceChange: (source: 'all' | 'flickreels' | 'melolo') => void;
  activeLocale: string;
  onLocaleChange: (locale: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (q: string) => void;
  onOpenUrlModal: () => void;
  onOpenHistoryModal: (type: 'history' | 'favorites') => void;
  historyCount: number;
  favoriteCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSource,
  onSourceChange,
  activeLocale,
  onLocaleChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onOpenUrlModal,
  onOpenHistoryModal,
  historyCount,
  favoriteCount
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState<boolean>(false);

  const languages = [
    { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'tc', label: '繁體中文', flag: '🇹🇼' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' }
  ];

  const currentLang = languages.find((l) => l.code === activeLocale) || languages[0];

  const quickTrends = [
    'CEO Milyarder',
    'Menantu Terbuang',
    'Ratu Mafia',
    'Reinkarnasi',
    'Werewolf & Luna',
    'Kawin Kontrak'
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchSubmit(searchQuery.trim());
      setMobileSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#07080b]/92 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-18 gap-2 sm:gap-4">
          {/* Logo Brand */}
          <div
            onClick={() => onSourceChange('all')}
            className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white shadow-lg shadow-red-950/80 group-hover:scale-105 transition-transform">
              <span className="font-black text-sm sm:text-base md:text-lg tracking-tight">剧</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg md:text-xl text-white tracking-tight">
                  DRACIN<span className="text-red-500">VERSE</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                  4K
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium hidden md:block">
                Streaming Drama Pendek Asia &amp; Novel
              </p>
            </div>
          </div>

          {/* Source Tabs (Desktop) */}
          <div className="hidden md:flex items-center bg-[#10121a] p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => onSourceChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSource === 'all'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Semua
            </button>
            <button
              onClick={() => onSourceChange('flickreels')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSource === 'flickreels'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> FlickReels
            </button>
            <button
              onClick={() => onSourceChange('melolo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSource === 'melolo'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Melolo
            </button>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-2">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari judul drama, CEO, balas dendam..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-20 py-2 bg-[#10121a] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/80 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-12 top-2 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                Cari
              </button>
            </form>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Icon Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#10121a] hover:bg-[#161822] border border-white/[0.08] text-slate-300"
              title="Cari Drama"
              aria-label="Toggle Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Direct Link Importer */}
            <button
              onClick={onOpenUrlModal}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#10121a] hover:bg-[#161822] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Tempel URL FlickReels / Melolo"
            >
              <Link2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="hidden sm:inline">Tempel Link</span>
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-[#10121a] hover:bg-[#161822] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Pilih Bahasa Subtitle"
              >
                <span>{currentLang.flag}</span>
                <span className="font-mono uppercase text-[11px] hidden sm:inline">{currentLang.code}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-[#10121a] border border-white/[0.1] rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-fade-in">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onLocaleChange(lang.code);
                        setShowLanguageMenu(false);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                        activeLocale === lang.code
                          ? 'bg-red-600 font-bold text-white'
                          : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Only History & Favorites */}
            <button
              onClick={() => onOpenHistoryModal('history')}
              className="hidden md:flex relative p-2.5 rounded-xl bg-[#10121a] hover:bg-[#161822] border border-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Riwayat Tontonan"
              aria-label="Riwayat"
            >
              <Clock className="w-4 h-4" />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-[10px] font-black text-white rounded-full flex items-center justify-center">
                  {historyCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onOpenHistoryModal('favorites')}
              className="hidden md:flex relative p-2.5 rounded-xl bg-[#10121a] hover:bg-[#161822] border border-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Daftar Favorit"
              aria-label="Favorit"
            >
              <Heart className="w-4 h-4" />
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-[10px] font-black text-white rounded-full flex items-center justify-center">
                  {favoriteCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Expandable Bar */}
        {mobileSearchOpen && (
          <div className="lg:hidden pb-3 pt-1 animate-fade-in">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                autoFocus
                placeholder="Cari judul drama, CEO, balas dendam..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-18 py-2.5 bg-[#10121a] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold"
              >
                Cari
              </button>
            </form>
          </div>
        )}

        {/* Quick Trends Bar (Desktop) */}
        <div className="hidden md:flex items-center gap-2 py-2 overflow-x-auto text-xs no-scrollbar border-t border-white/[0.04]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" /> Sedang Hangat:
          </span>
          {quickTrends.map((trend) => (
            <button
              key={trend}
              onClick={() => onSearchSubmit(trend)}
              className="px-2.5 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] text-slate-300 hover:text-white transition-colors shrink-0 text-[11px] font-medium cursor-pointer"
            >
              #{trend}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
