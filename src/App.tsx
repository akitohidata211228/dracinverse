import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Drama, HistoryItem, getDramaPosterFallback } from './types/drama';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HeroCarousel } from './components/HeroCarousel';
import { DramaCard } from './components/DramaCard';
import { DramaPlayerModal } from './components/DramaPlayerModal';
import { UrlImporterModal } from './components/UrlImporterModal';
import { WatchHistoryModal } from './components/WatchHistoryModal';
import {
  Flame,
  Trophy,
  Award,
  BookOpen,
  Search,
  Filter,
  Loader2,
  ChevronRight,
  Tv,
  Play,
  X
} from 'lucide-react';

export default function App() {
  const [activeSource, setActiveSource] = useState<'all' | 'flickreels' | 'melolo'>('all');
  const [activeLocale, setActiveLocale] = useState<string>('id');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('semua');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [carouselDramas, setCarouselDramas] = useState<Drama[]>([]);
  const [hotDramas, setHotDramas] = useState<Drama[]>([]);
  const [rankingDramas, setRankingDramas] = useState<Drama[]>([]);
  const [recommendations, setRecommendations] = useState<Drama[]>([]);
  const [meloloFeatured, setMeloloFeatured] = useState<Drama[]>([]);

  // Search state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Drama[]>([]);

  // Modals state
  const [selectedDramaForPlayer, setSelectedDramaForPlayer] = useState<{
    id: string;
    source: 'flickreels' | 'melolo';
    episode?: number;
    initialDrama?: Drama | null;
  } | null>(null);

  const [urlModalOpen, setUrlModalOpen] = useState<boolean>(false);
  const [historyModalType, setHistoryModalType] = useState<'history' | 'favorites' | null>(null);

  // LocalStorage state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<Drama[]>([]);

  // Load history & favorites from localStorage and auto-heal missing covers
  const refreshStorage = useCallback(() => {
    try {
      const rawHist = localStorage.getItem('dracin_history') || '[]';
      const parsedHist: HistoryItem[] = JSON.parse(rawHist);
      let changed = false;

      const sanitizedHist = parsedHist.map((item) => {
        if (!item.cover || typeof item.cover !== 'string' || item.cover.trim() === '') {
          changed = true;
          return { ...item, cover: getDramaPosterFallback(item.title, item.source) };
        }
        return item;
      });

      if (changed) {
        localStorage.setItem('dracin_history', JSON.stringify(sanitizedHist));
      }

      setHistoryItems(sanitizedHist);

      const rawFav = localStorage.getItem('dracin_favorites') || '[]';
      setFavoriteItems(JSON.parse(rawFav));
    } catch (e) {
      console.warn('Storage parse error:', e);
    }
  }, []);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

  const favoriteIds = useMemo(() => {
    return new Set(favoriteItems.map((d) => d.id));
  }, [favoriteItems]);

  const toggleFavorite = (drama: Drama) => {
    try {
      const rawFav = localStorage.getItem('dracin_favorites') || '[]';
      let favList: Drama[] = JSON.parse(rawFav);
      const exists = favList.some((d) => d.id === drama.id);

      if (exists) {
        favList = favList.filter((d) => d.id !== drama.id);
      } else {
        favList = [drama, ...favList];
      }

      localStorage.setItem('dracin_favorites', JSON.stringify(favList));
      setFavoriteItems(favList);
    } catch (e) {
      console.error(e);
    }
  };

  const removeFavorite = (id: string) => {
    try {
      const rawFav = localStorage.getItem('dracin_favorites') || '[]';
      const favList: Drama[] = JSON.parse(rawFav).filter((d: Drama) => d.id !== id);
      localStorage.setItem('dracin_favorites', JSON.stringify(favList));
      setFavoriteItems(favList);
    } catch (e) {
      console.error(e);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('dracin_history');
    setHistoryItems([]);
  };

  const removeHistoryItem = (id: string) => {
    try {
      const rawHist = localStorage.getItem('dracin_history') || '[]';
      const histList: HistoryItem[] = JSON.parse(rawHist).filter((d: HistoryItem) => d.id !== id);
      localStorage.setItem('dracin_history', JSON.stringify(histList));
      setHistoryItems(histList);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to open player and update watch history immediately
  const handlePlayDrama = (
    dramaOrId: Drama | string,
    source?: 'flickreels' | 'melolo',
    episode: number = 1
  ) => {
    let dramaObj: Drama | null = null;
    let dramaId: string = '';
    let dramaSource: 'flickreels' | 'melolo' = source || 'flickreels';

    if (typeof dramaOrId === 'object' && dramaOrId !== null) {
      dramaObj = dramaOrId;
      dramaId = dramaOrId.id;
      dramaSource = dramaOrId.source;
    } else {
      dramaId = dramaOrId;
      const allKnown = [
        ...carouselDramas,
        ...hotDramas,
        ...rankingDramas,
        ...recommendations,
        ...meloloFeatured,
        ...searchResults
      ];
      dramaObj = allKnown.find((d) => d.id === dramaId || d.slug === dramaId) || null;
      if (dramaObj) {
        dramaSource = dramaObj.source;
      }
    }

    const fallbackPoster = getDramaPosterFallback(dramaObj?.title, dramaSource);
    const bestCover =
      dramaObj?.cover && dramaObj.cover.trim() ? dramaObj.cover : fallbackPoster;
    const bestTitle = dramaObj?.title || 'Dracin';
    const totalEps = dramaObj?.totalEpisodes || dramaObj?.episodes || 60;

    try {
      const rawHist = localStorage.getItem('dracin_history') || '[]';
      const histList: any[] = JSON.parse(rawHist);
      const filtered = histList.filter((item) => item.id !== dramaId);
      const newEntry: HistoryItem = {
        id: dramaId,
        title: bestTitle,
        cover: bestCover,
        source: dramaSource,
        lastEpisode: episode,
        totalEpisodes: totalEps,
        updatedAt: Date.now()
      };
      const updated = [newEntry, ...filtered.slice(0, 30)];
      localStorage.setItem('dracin_history', JSON.stringify(updated));
      setHistoryItems(updated);
    } catch (e) {
      console.warn('History update error:', e);
    }

    setSelectedDramaForPlayer({
      id: dramaId,
      source: dramaSource,
      episode,
      initialDrama: dramaObj
    });
  };

  // Fetch catalog from server
  const fetchHomeCatalog = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dramas/home?source=${activeSource}&locale=${activeLocale}`);
      const data = await res.json();

      if (data.success) {
        const flick = data.flickreels;
        const mel = data.melolo;

        // Process Flickreels
        if (flick) {
          setCarouselDramas(flick.carousel || []);
          setHotDramas(flick.hot || []);
          setRankingDramas(flick.rankings || []);
          setRecommendations(flick.recommendations || flick.allFeatured || []);
        }

        // Process Melolo
        if (mel && mel.featured) {
          setMeloloFeatured(mel.featured);
          if (!flick || !flick.carousel || flick.carousel.length === 0) {
            setCarouselDramas(mel.featured.slice(0, 5));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching home catalog:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeSource, activeLocale]);

  useEffect(() => {
    fetchHomeCatalog();
  }, [fetchHomeCatalog]);

  // Execute Search
  const handleSearchSubmit = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchQuery(query);
    try {
      const res = await fetch(
        `/api/dramas/search?q=${encodeURIComponent(query.trim())}&source=${activeSource}&locale=${activeLocale}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Filter Categories
  const categories = [
    { id: 'semua', label: 'Semua Genre' },
    { id: 'ceo', label: 'CEO & Konglomerat' },
    { id: 'balas-dendam', label: 'Pembalasan Dendam' },
    { id: 'romantis', label: 'Cinta & Pernikahan' },
    { id: 'menantu', label: 'Menantu Terbuang' },
    { id: 'reinkarnasi', label: 'Reinkarnasi' },
    { id: 'werewolf', label: 'Werewolf & Luna' },
    { id: 'mafia', label: 'Ratu Mafia & Aksi' }
  ];

  const filterByActiveCategory = (list: Drama[]) => {
    if (activeCategory === 'semua') return list;
    return list.filter((d) => {
      const searchSpace = `${d.title} ${d.synopsis || ''} ${d.tags?.join(' ') || ''}`.toLowerCase();
      if (activeCategory === 'ceo')
        return (
          searchSpace.includes('ceo') ||
          searchSpace.includes('milyarder') ||
          searchSpace.includes('presdir') ||
          searchSpace.includes('tahta')
        );
      if (activeCategory === 'balas-dendam')
        return (
          searchSpace.includes('dendam') ||
          searchSpace.includes('balas') ||
          searchSpace.includes('revenge')
        );
      if (activeCategory === 'romantis')
        return (
          searchSpace.includes('cinta') ||
          searchSpace.includes('nikah') ||
          searchSpace.includes('romance') ||
          searchSpace.includes('kontrak')
        );
      if (activeCategory === 'menantu')
        return (
          searchSpace.includes('menantu') ||
          searchSpace.includes('miskin') ||
          searchSpace.includes('hina')
        );
      if (activeCategory === 'reinkarnasi')
        return (
          searchSpace.includes('reinkarnasi') ||
          searchSpace.includes('kaisar') ||
          searchSpace.includes('dewa')
        );
      if (activeCategory === 'werewolf')
        return (
          searchSpace.includes('werewolf') ||
          searchSpace.includes('luna') ||
          searchSpace.includes('alpha') ||
          searchSpace.includes('serigala')
        );
      if (activeCategory === 'mafia')
        return (
          searchSpace.includes('mafia') ||
          searchSpace.includes('bos') ||
          searchSpace.includes('sindikat')
        );
      return true;
    });
  };

  const filteredHot = useMemo(() => filterByActiveCategory(hotDramas), [hotDramas, activeCategory]);
  const filteredRankings = useMemo(
    () => filterByActiveCategory(rankingDramas),
    [rankingDramas, activeCategory]
  );
  const filteredRecommendations = useMemo(
    () => filterByActiveCategory(recommendations),
    [recommendations, activeCategory]
  );
  const filteredMelolo = useMemo(
    () => filterByActiveCategory(meloloFeatured),
    [meloloFeatured, activeCategory]
  );
  const filteredSearchResults = useMemo(
    () => filterByActiveCategory(searchResults),
    [searchResults, activeCategory]
  );

  return (
    <div className="min-h-screen bg-[#07080b] text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Sticky Top Navigation Bar */}
      <Navbar
        activeSource={activeSource}
        onSourceChange={(src) => {
          setActiveSource(src);
          clearSearch();
        }}
        activeLocale={activeLocale}
        onLocaleChange={(loc) => {
          setActiveLocale(loc);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onOpenUrlModal={() => setUrlModalOpen(true)}
        onOpenHistoryModal={(type) => {
          refreshStorage();
          setHistoryModalType(type);
        }}
        historyCount={historyItems.length}
        favoriteCount={favoriteItems.length}
      />

      {/* Main Body Content */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-6 sm:space-y-10 pb-24 md:pb-12 flex-1">
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Menyiapkan Koleksi Drama Asia...
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Menghubungkan ke jaringan siaran FlickReels &amp; Melolo
            </p>
          </div>
        )}

        {/* Category Filter Chips Bar */}
        <section className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" />
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                activeCategory === cat.id
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/40'
                  : 'bg-[#10121a] hover:bg-[#161824] border-white/[0.08] text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </section>

        {/* Search Results Display */}
        {searchQuery ? (
          <section className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-red-500" />
                <h2 className="text-base sm:text-xl font-extrabold text-white">
                  Hasil Pencarian: &ldquo;{searchQuery}&rdquo;
                </h2>
                <span className="text-xs bg-[#12141e] px-2.5 py-0.5 rounded-full text-slate-400 border border-white/[0.08] font-mono">
                  {filteredSearchResults.length} Ditemukan
                </span>
              </div>
              <button
                onClick={clearSearch}
                className="text-xs font-bold text-red-400 hover:text-red-300 cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Hapus Pencarian
              </button>
            </div>

            {isSearching ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin mr-3" />
                <span className="text-sm font-semibold text-slate-300">
                  Mencari drama sesuai kata kunci...
                </span>
              </div>
            ) : filteredSearchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-[#0e1017] rounded-3xl border border-white/[0.08] p-8">
                <p className="text-base font-bold text-slate-200">Tidak ada drama yang cocok.</p>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                  Coba kata kunci lain atau gunakan fitur Tempel Link untuk memutar siaran langsung.
                </p>
                <button
                  onClick={() => setUrlModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950 cursor-pointer"
                >
                  Tempel Link Langsung
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
                {filteredSearchResults.map((drama) => (
                  <DramaCard
                    key={`${drama.source}-${drama.id}`}
                    drama={drama}
                    onPlay={(d) => handlePlayDrama(d, d.source, 1)}
                    onFavoriteToggle={toggleFavorite}
                    isFavorited={favoriteIds.has(drama.id)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Hero Carousel */}
            {carouselDramas.length > 0 && activeCategory === 'semua' && (
              <section>
                <HeroCarousel
                  dramas={carouselDramas}
                  onPlay={(d) => handlePlayDrama(d, d.source, 1)}
                  onFavoriteToggle={toggleFavorite}
                  favoriteIds={favoriteIds}
                />
              </section>
            )}

            {/* Quick Continue Watching (Lanjutkan Menonton Banner) */}
            {historyItems.length > 0 && (
              <section className="space-y-3 bg-[#0d0f17] border border-white/[0.08] rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center border border-red-500/25">
                      <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                        Lanjutkan Menonton
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      refreshStorage();
                      setHistoryModalType('history');
                    }}
                    className="text-[11px] sm:text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    Semua ({historyItems.length}) <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {historyItems.slice(0, 4).map((item) => {
                    const posterFallback = getDramaPosterFallback(item.title, item.source);
                    const displayCover =
                      item.cover && item.cover.trim() ? item.cover : posterFallback;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handlePlayDrama(item.id, item.source, item.lastEpisode)}
                        className="p-2.5 bg-[#12141e] hover:bg-[#181a26] rounded-2xl border border-white/[0.06] transition-all cursor-pointer flex items-center gap-3 group active:scale-[0.98]"
                      >
                        <img
                          src={displayCover}
                          alt={item.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = posterFallback;
                          }}
                          className="w-13 h-18 rounded-xl object-cover shrink-0 border border-white/10 shadow-md group-hover:scale-105 transition-transform"
                        />
                        <div className="truncate flex-1">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                              item.source === 'flickreels'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {item.source}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors mt-0.5">
                            {item.title}
                          </h4>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-300 font-bold bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                              EP {item.lastEpisode}
                            </span>
                            <span className="text-[11px] text-red-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              <Play className="w-3 h-3 fill-current" /> Lanjut
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 1: SEDANG TREN */}
            {(activeSource === 'all' || activeSource === 'flickreels') && filteredHot.length > 0 && (
              <section className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center shadow-md shadow-red-950 shrink-0">
                      <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                        Sedang Tren
                      </h2>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                        Episode pendek vertikal HD dengan subtitle bahasa Indonesia
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
                  {filteredHot.map((drama) => (
                    <DramaCard
                      key={`hot-${drama.id}`}
                      drama={drama}
                      onPlay={(d) => handlePlayDrama(d, d.source, 1)}
                      onFavoriteToggle={toggleFavorite}
                      isFavorited={favoriteIds.has(drama.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2: TOP 10 PERINGKAT TERATAS */}
            {(activeSource === 'all' || activeSource === 'flickreels') &&
              filteredRankings.length > 0 && (
                <section className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-black flex items-center justify-center shadow-md shadow-amber-950 shrink-0">
                        <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                          Peringkat Teratas (Top 10)
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                          Pilihan drama berating tertinggi minggu ini
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
                    {filteredRankings.map((drama, idx) => (
                      <DramaCard
                        key={`ranking-${drama.id}`}
                        drama={drama}
                        rankNumber={idx + 1}
                        onPlay={(d) => handlePlayDrama(d, d.source, 1)}
                        onFavoriteToggle={toggleFavorite}
                        isFavorited={favoriteIds.has(drama.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

            {/* SECTION 3: REKOMENDASI EDITORIAL */}
            {(activeSource === 'all' || activeSource === 'flickreels') &&
              filteredRecommendations.length > 0 && (
                <section className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 border border-red-500/25">
                        <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                          Pilihan Rekomendasi
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                          Koleksi drama pendek pilihan khusus untuk Anda
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
                    {filteredRecommendations.map((drama) => (
                      <DramaCard
                        key={`rec-${drama.id}`}
                        drama={drama}
                        onPlay={(d) => handlePlayDrama(d, d.source, 1)}
                        onFavoriteToggle={toggleFavorite}
                        isFavorited={favoriteIds.has(drama.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

            {/* SECTION 4: MELOLO NOVEL & SHORT DRAMAS */}
            {(activeSource === 'all' || activeSource === 'melolo') && filteredMelolo.length > 0 && (
              <section className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
                      <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                        Katalog Melolo
                      </h2>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                        Tersedia mode pemutar video serta pembaca bab novel lengkap
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
                  {filteredMelolo.map((drama) => (
                    <DramaCard
                      key={`melolo-${drama.id || drama.slug}`}
                      drama={drama}
                      onPlay={(d) => handlePlayDrama(d, 'melolo', 1)}
                      onFavoriteToggle={toggleFavorite}
                      isFavorited={favoriteIds.has(drama.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#050608] py-8 px-4 sm:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-black flex items-center justify-center">
              剧
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-tight">
                DRACIN<span className="text-red-500">VERSE</span>
              </span>
              <p className="text-slate-500 text-xs">
                Platform agregator streaming drama pendek Asia &amp; pembaca novel
              </p>
            </div>
          </div>

          <div className="text-slate-500 text-[11px] text-center md:text-right">
            Subtitle Indonesia &amp; Multibahasa. Hak cipta milik masing-masing penyedia siaran.
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar (Hidden when player modal is open) */}
      {!selectedDramaForPlayer && (
        <BottomNav
          activeSource={activeSource}
          onSourceChange={(src) => {
            setActiveSource(src);
            clearSearch();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenHistoryModal={(type) => {
            refreshStorage();
            setHistoryModalType(type);
          }}
          historyCount={historyItems.length}
          favoriteCount={favoriteItems.length}
        />
      )}

      {/* Full Cinema Player Modal */}
      {selectedDramaForPlayer && (
        <DramaPlayerModal
          dramaId={selectedDramaForPlayer.id}
          source={selectedDramaForPlayer.source}
          initialEpisode={selectedDramaForPlayer.episode || 1}
          initialDrama={selectedDramaForPlayer.initialDrama}
          locale={activeLocale}
          onClose={() => {
            setSelectedDramaForPlayer(null);
            refreshStorage();
          }}
          onFavoriteToggle={toggleFavorite}
          isFavorited={favoriteIds.has(selectedDramaForPlayer.id)}
          onHistoryUpdate={refreshStorage}
        />
      )}

      {/* URL Importer Modal */}
      {urlModalOpen && (
        <UrlImporterModal
          onClose={() => setUrlModalOpen(false)}
          onPlayDrama={(id, source, episode) => {
            handlePlayDrama(id, source, episode || 1);
          }}
        />
      )}

      {/* Watch History & Favorites Modal */}
      {historyModalType && (
        <WatchHistoryModal
          type={historyModalType}
          historyItems={historyItems}
          favoriteItems={favoriteItems}
          onClose={() => setHistoryModalType(null)}
          onPlayDrama={(id, source, episode) => {
            handlePlayDrama(id, source, episode || 1);
          }}
          onClearHistory={clearHistory}
          onRemoveHistoryItem={removeHistoryItem}
          onRemoveFavorite={removeFavorite}
        />
      )}
    </div>
  );
}
