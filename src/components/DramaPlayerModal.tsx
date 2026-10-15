import React, { useState, useEffect, useRef } from 'react';
import { Drama, Episode, StreamData, getDramaPosterFallback } from '../types/drama';
import { VideoPlayer } from './VideoPlayer';
import { NovelReader } from './NovelReader';
import {
  X,
  Play,
  Share2,
  Film,
  Lock,
  Search,
  Sparkles,
  Info
} from 'lucide-react';

interface DramaPlayerModalProps {
  dramaId: string;
  source: 'flickreels' | 'melolo';
  initialEpisode?: number;
  initialDrama?: Drama | null;
  locale?: string;
  onClose: () => void;
  onFavoriteToggle?: (drama: Drama) => void;
  isFavorited?: boolean;
  onHistoryUpdate?: () => void;
}

export const DramaPlayerModal: React.FC<DramaPlayerModalProps> = ({
  dramaId,
  source,
  initialEpisode = 1,
  initialDrama = null,
  locale = 'id',
  onClose,
  onFavoriteToggle,
  isFavorited = false,
  onHistoryUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'novel' | 'info'>('video');
  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisode);
  const [drama, setDrama] = useState<Drama | null>(initialDrama);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(!initialDrama);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(false);
  const [episodeSearch, setEpisodeSearch] = useState<string>('');
  const [autoNext, setAutoNext] = useState<boolean>(true);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [episodeDrawerOpen, setEpisodeDrawerOpen] = useState<boolean>(false);
  const [activeRangeTab, setActiveRangeTab] = useState<number>(0);
  const episodeDrawerOpenRef = useRef<boolean>(false);

  // Keep the ref in sync so the keydown handler reads the current value.
  useEffect(() => {
    episodeDrawerOpenRef.current = episodeDrawerOpen;
  }, [episodeDrawerOpen]);

  // Lock body scroll when modal is open + close on Escape.
  // Escape closes the innermost layer first (episode drawer) before the modal itself.
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (episodeDrawerOpenRef.current) {
        setEpisodeDrawerOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  // Sync initial drama if passed
  useEffect(() => {
    if (initialDrama) {
      setDrama(initialDrama);
    }
  }, [initialDrama]);

  const defaultPoster = getDramaPosterFallback(drama?.title || initialDrama?.title, source);

  // Save history helper that guarantees image is never missing
  const saveToHistory = (ep: number, newStream?: any, detailDrama?: Drama | null) => {
    try {
      const bestCover =
        detailDrama?.cover ||
        drama?.cover ||
        initialDrama?.cover ||
        newStream?.cover ||
        newStream?.thumbnail ||
        defaultPoster;

      const rawHist = localStorage.getItem('dracin_history') || '[]';
      const histList: any[] = JSON.parse(rawHist);
      const filtered = histList.filter((item) => item.id !== dramaId);

      const newEntry = {
        id: dramaId,
        title:
          detailDrama?.title ||
          drama?.title ||
          initialDrama?.title ||
          newStream?.dramaTitle ||
          'Dracin',
        cover: bestCover && bestCover.trim() ? bestCover : defaultPoster,
        source,
        lastEpisode: ep,
        totalEpisodes:
          detailDrama?.totalEpisodes || drama?.totalEpisodes || episodes.length || 60,
        updatedAt: Date.now()
      };

      localStorage.setItem('dracin_history', JSON.stringify([newEntry, ...filtered.slice(0, 30)]));
      if (onHistoryUpdate) onHistoryUpdate();
    } catch (e) {
      console.warn('Failed to update watch history:', e);
    }
  };

  // Fetch drama details & episodes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingDetail(true);

    fetch(`/api/dramas/detail?id=${encodeURIComponent(dramaId)}&source=${source}&locale=${locale}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.drama) {
          setDrama(data.drama);
          setEpisodes(data.episodes || []);
          saveToHistory(currentEpisode, undefined, data.drama);
        }
      })
      .catch((err) => {
        console.error('Failed to load drama details:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dramaId, source, locale]);

  // Fetch episode stream when episode changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingStream(true);

    fetch(
      `/api/dramas/stream?id=${encodeURIComponent(dramaId)}&ep=${currentEpisode}&source=${source}&locale=${locale}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setStreamData(data);
          saveToHistory(currentEpisode, data, drama);
        }
      })
      .catch((err) => {
        console.error('Failed to load stream:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingStream(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dramaId, currentEpisode, source, locale]);

  const totalEpisodesCount =
    drama?.totalEpisodes ||
    drama?.episodes ||
    (episodes.length > 0 ? episodes.length : 60);

  // Pagination ranges for episodes (e.g. 1-25, 26-50...)
  const RANGE_SIZE = 25;
  const totalRanges = Math.ceil(totalEpisodesCount / RANGE_SIZE);
  const ranges = Array.from({ length: totalRanges }).map((_, i) => ({
    start: i * RANGE_SIZE + 1,
    end: Math.min((i + 1) * RANGE_SIZE, totalEpisodesCount),
    label: `${i * RANGE_SIZE + 1}-${Math.min((i + 1) * RANGE_SIZE, totalEpisodesCount)}`
  }));

  // Auto-switch range tab to match current episode
  useEffect(() => {
    const rangeIndex = Math.floor((currentEpisode - 1) / RANGE_SIZE);
    if (rangeIndex >= 0 && rangeIndex < totalRanges) {
      setActiveRangeTab(rangeIndex);
    }
  }, [currentEpisode, totalRanges]);

  const handleShare = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      }
    } catch {}
  };

  const filteredEpisodes = episodes.filter((ep) => {
    if (episodeSearch.trim()) {
      return (
        String(ep.episodeNumber).includes(episodeSearch.trim()) ||
        ep.title?.toLowerCase().includes(episodeSearch.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden animate-fade-in">
      {/* 
        Container styling:
        - Mobile: Fullscreen 100vw x 100vh, zero borders, edge-to-edge
        - Desktop: Elegant cinema aspect modal with darkroom border
      */}
      <div
        className={`w-full h-full bg-black flex flex-col overflow-hidden relative ${
          activeTab === 'video'
            ? 'p-0 border-0 rounded-none'
            : 'max-w-6xl max-h-[92vh] md:rounded-3xl border border-white/[0.08] shadow-2xl'
        }`}
      >
        {/* Top Header for Novel and Info Tabs */}
        {activeTab !== 'video' && (
          <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-white/[0.08] bg-[#0c0d14]/95 backdrop-blur-md z-10 shrink-0">
            <div className="flex items-center gap-2.5 truncate max-w-[70%]">
              <button
                onClick={() => setActiveTab('video')}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md shadow-red-950"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Kembali ke Video</span>
              </button>

              <span className="text-xs sm:text-sm font-bold text-white truncate">
                {drama?.title || 'Dracin'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl bg-white/[0.06] hover:bg-red-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Tutup"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Main Column: Video Player or Novel Reader or Info */}
          <div className="flex-1 flex flex-col bg-black relative overflow-hidden items-center justify-center">
            {/* TAB 1: VIDEO PLAYER (Edge-to-Edge Fullscreen on Mobile & Immersive on Desktop) */}
            {activeTab === 'video' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
                <div className="w-full h-full flex items-center justify-center relative">
                  <VideoPlayer
                    streamUrl={
                      streamData?.streamUrl || streamData?.videoUrl || streamData?.hlsUrl || null
                    }
                    streamLoading={isLoadingStream}
                    errorMessage={streamData?.message || null}
                    directUrl={streamData?.directUrl || null}
                    title={drama?.title || initialDrama?.title || 'Dracin'}
                    source={source}
                    episodeNumber={currentEpisode}
                    totalEpisodes={totalEpisodesCount}
                    isLocked={streamData?.isLocked}
                    onNextEpisode={() => {
                      if (currentEpisode < totalEpisodesCount) {
                        setCurrentEpisode((ep) => ep + 1);
                      }
                    }}
                    onPrevEpisode={() => {
                      if (currentEpisode > 1) {
                        setCurrentEpisode((ep) => ep - 1);
                      }
                    }}
                    autoNext={autoNext}
                    onAutoNextToggle={setAutoNext}
                    onClose={onClose}
                    isFavorited={isFavorited}
                    onFavoriteToggle={() => {
                      if (drama && onFavoriteToggle) {
                        onFavoriteToggle(drama);
                      }
                    }}
                    onShare={handleShare}
                    copiedShare={copiedShare}
                    onOpenEpisodeDrawer={() => setEpisodeDrawerOpen(true)}
                    onSelectTab={(tab) => setActiveTab(tab)}
                    activeTab={activeTab}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: NOVEL READER */}
            {activeTab === 'novel' && (
              <div className="w-full h-full flex flex-col p-2 sm:p-4 overflow-hidden bg-[#07080b]">
                <div className="flex-1 overflow-hidden">
                  <NovelReader
                    slug={drama?.slug || dramaId}
                    initialChapter={currentEpisode}
                    totalChapters={totalEpisodesCount}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: DRAMA INFO */}
            {activeTab === 'info' && (
              <div className="w-full h-full p-4 sm:p-8 overflow-y-auto text-slate-200 cinema-scrollbar bg-[#07080b]">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                    <img
                      src={drama?.cover || initialDrama?.cover || defaultPoster}
                      alt={drama?.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = defaultPoster;
                      }}
                      className="w-28 h-40 sm:w-36 sm:h-52 rounded-2xl object-cover shadow-2xl border border-white/10 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                        {drama?.source === 'flickreels' ? 'FlickReels Series' : 'Melolo Short Play'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-white mt-1 mb-2">
                        {drama?.title}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          ★ {drama?.rating || '9.8'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#141622] text-slate-300 border border-white/10">
                          {totalEpisodesCount} Total Episode
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-500/10 text-red-300 border border-red-500/30">
                          {drama?.completionStatus || 'Tamat'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                        {drama?.tags?.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg text-[11px] bg-white/[0.05] border border-white/[0.08] text-slate-300"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f1118] p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-red-500" /> Sinopsis
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {drama?.synopsis ||
                        'Drama pendek Asia ini menyajikan kisah pembalasan dendam manis, rahasia keluarga konglomerat, cinta tak terduga, dan intrik yang membuat ketagihan di setiap episodenya.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Playlist & Episode Selector (Desktop) */}
          <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-[#0b0c12] border-l border-white/[0.08] shrink-0">
            {/* Playlist Header */}
            <div className="p-4 border-b border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-red-500" /> Daftar Episode
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {totalEpisodesCount} Episode
                </span>
              </div>

              {/* Range pagination tabs on desktop playlist */}
              {totalRanges > 1 && (
                <div className="mb-2 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                  {ranges.map((rng, idx) => (
                    <button
                      key={rng.label}
                      onClick={() => setActiveRangeTab(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                        activeRangeTab === idx
                          ? 'bg-red-600 text-white'
                          : 'bg-[#141622] text-slate-400 hover:text-white'
                      }`}
                    >
                      {rng.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nomor episode..."
                  value={episodeSearch}
                  onChange={(e) => setEpisodeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#141622] text-xs text-white placeholder-slate-500 rounded-xl border border-white/[0.08] focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Desktop Episode List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 cinema-scrollbar">
              {filteredEpisodes.length === 0 &&
                Array.from({ length: totalEpisodesCount }).map((_, idx) => {
                  const epNum = idx + 1;

                  // Range filter
                  if (!episodeSearch && totalRanges > 1) {
                    const currentRange = ranges[activeRangeTab];
                    if (currentRange && (epNum < currentRange.start || epNum > currentRange.end)) {
                      return null;
                    }
                  }

                  const isSelected = epNum === currentEpisode;
                  return (
                    <button
                      key={epNum}
                      onClick={() => {
                        setCurrentEpisode(epNum);
                        setActiveTab('video');
                      }}
                      className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                          : 'bg-[#12141e] hover:bg-[#1a1c2a] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono text-xs w-6">{epNum}</span>
                        <span className="truncate">Episode {epNum}</span>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Diputar</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pilih</span>
                      )}
                    </button>
                  );
                })}

              {filteredEpisodes.map((ep) => {
                const isSelected = ep.episodeNumber === currentEpisode;
                return (
                  <button
                    key={ep.episodeNumber}
                    onClick={() => {
                      setCurrentEpisode(ep.episodeNumber);
                      setActiveTab('video');
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                        : 'bg-[#12141e] hover:bg-[#1a1c2a] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-xs w-6">{ep.episodeNumber}</span>
                      <span className="truncate">{ep.title || `Episode ${ep.episodeNumber}`}</span>
                    </div>
                    {isSelected ? (
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Diputar</span>
                    ) : ep.isLocked ? (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> VIP
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Pilih</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Slide-Up Episode Drawer / Bottom Sheet */}
        {episodeDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
            <div className="w-full max-w-xl mx-auto bg-[#0e1017] border-t md:border border-white/[0.08] rounded-t-3xl md:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up mb-0 md:mb-6 overflow-hidden">
              {/* Sheet header */}
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-red-500" /> Pilih Episode
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Total {totalEpisodesCount} Episode (Sedang Memutar EP {currentEpisode})
                  </p>
                </div>
                <button
                  onClick={() => setEpisodeDrawerOpen(false)}
                  className="p-1.5 rounded-full bg-white/[0.06] hover:bg-red-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Range pagination tabs for quick hopping */}
              {totalRanges > 1 && (
                <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {ranges.map((rng, idx) => (
                    <button
                      key={rng.label}
                      onClick={() => setActiveRangeTab(idx)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                        activeRangeTab === idx
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-[#141622] text-slate-400 hover:text-white'
                      }`}
                    >
                      EP {rng.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Sheet Search */}
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ketik nomor episode (cth: 15)..."
                    value={episodeSearch}
                    onChange={(e) => setEpisodeSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#141622] text-xs text-white placeholder-slate-500 rounded-xl border border-white/[0.08] focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Sheet Episodes Grid */}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 sm:grid-cols-5 gap-2 cinema-scrollbar">
                {Array.from({ length: totalEpisodesCount }).map((_, idx) => {
                  const epNum = idx + 1;
                  const isSelected = epNum === currentEpisode;

                  // Filter by search or range
                  if (episodeSearch) {
                    if (!String(epNum).includes(episodeSearch)) return null;
                  } else if (totalRanges > 1) {
                    const currentRange = ranges[activeRangeTab];
                    if (currentRange && (epNum < currentRange.start || epNum > currentRange.end)) {
                      return null;
                    }
                  }

                  return (
                    <button
                      key={epNum}
                      onClick={() => {
                        setCurrentEpisode(epNum);
                        setActiveTab('video');
                        setEpisodeDrawerOpen(false);
                      }}
                      className={`py-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950'
                          : 'bg-[#12141e] border-white/[0.06] text-slate-300 hover:bg-[#1a1c2a]'
                      }`}
                    >
                      <span className="text-sm font-black">{epNum}</span>
                      <span className="text-[9px] opacity-75 font-normal">
                        {isSelected ? 'Diputar' : 'Pilih'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
