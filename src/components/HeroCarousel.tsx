import React, { useState, useEffect } from 'react';
import { Drama, getDramaPosterFallback } from '../types/drama';
import { Play, Heart, Star, ChevronLeft, ChevronRight, Flame } from 'lucide-react';

interface HeroCarouselProps {
  dramas: Drama[];
  onPlay: (drama: Drama) => void;
  onFavoriteToggle?: (drama: Drama) => void;
  favoriteIds?: Set<string>;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  dramas,
  onPlay,
  onFavoriteToggle,
  favoriteIds = new Set()
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (dramas.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dramas.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [dramas.length, isPaused]);

  if (!dramas || dramas.length === 0) return null;

  const current = dramas[currentIndex];
  const isFavorited = favoriteIds.has(current.id);
  const fallback = getDramaPosterFallback(current.title, current.source);
  const posterUrl = current.cover && current.cover.trim() ? current.cover : fallback;
  const episodeCount = current.episodes || current.totalEpisodes || 75;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full h-[380px] sm:h-[460px] md:h-[520px] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0a0b10] border border-white/[0.08] shadow-2xl select-none group"
    >
      {/* Background Cinematic Backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          key={current.id}
          src={posterUrl}
          alt={current.title}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallback;
          }}
          className="w-full h-full object-cover object-center filter blur-md scale-110 brightness-60 transition-all duration-1000 group-hover:scale-105"
        />

        {/* Ambient Vignette & Linear Gradients for perfect legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080b] via-[#07080b]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080b] via-[#07080b]/70 to-transparent max-w-3xl" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* Floating Poster Thumbnail for Desktop Cinema Look */}
      <div className="hidden lg:block absolute right-16 top-1/2 -translate-y-1/2 z-10 w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/10">
        <img
          src={posterUrl}
          alt={current.title}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallback;
          }}
          className="w-full h-full object-cover shadow-2xl"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
          <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" /> {current.rating || '9.8'}
          </span>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-end p-5 sm:p-8 md:p-12 max-w-3xl">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5 sm:mb-3">
          <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 shadow-md shadow-red-950">
            <Flame className="w-3.5 h-3.5 fill-current" /> TOP 1 TRENDING
          </span>

          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${
              current.source === 'flickreels'
                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {current.source === 'flickreels' ? 'FlickReels' : 'Melolo'}
          </span>

          <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" /> {current.rating || '9.8'}
          </span>

          <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-white/[0.06] text-slate-300 border border-white/10 font-mono">
            {episodeCount} Episode • Sub Indo
          </span>
        </div>

        {/* Drama Title */}
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight mb-2 sm:mb-3 drop-shadow-md line-clamp-2 tracking-tight">
          {current.title}
        </h1>

        {/* Synopsis */}
        <p className="text-xs sm:text-sm text-slate-300/90 line-clamp-2 md:line-clamp-3 leading-relaxed mb-4 sm:mb-6 max-w-2xl font-normal">
          {current.synopsis ||
            'Kisah drama pendek Asia penuh intrik cinta terlarang, tahta konglomerat, dan pembalasan dendam yang mendebarkan di setiap episodenya.'}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPlay(current)}
            className="px-5 sm:px-7 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-red-950/60 transition-all transform active:scale-95 hover:shadow-red-900/80 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> Putar Episode 1
          </button>

          {onFavoriteToggle && (
            <button
              onClick={() => onFavoriteToggle(current)}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isFavorited
                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : 'bg-black/50 hover:bg-black/75 border-white/10 text-white'
              }`}
              title="Simpan ke Favorit"
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="hidden sm:inline">{isFavorited ? 'Tersimpan' : 'Favorit'}</span>
            </button>
          )}

          {/* Genre tags */}
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            {current.tags?.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/40 text-slate-400 border border-white/5"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Arrows (Desktop) */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev - 1 + dramas.length) % dramas.length)}
        className="hidden sm:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        title="Sebelumnya"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % dramas.length)}
        className="hidden sm:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        title="Selanjutnya"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-8 flex items-center gap-1.5 z-20">
        <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
          {dramas.slice(0, 6).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`rounded-full transition-all cursor-pointer ${
                currentIndex === idx
                  ? 'w-5 h-1.5 bg-red-500'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              }`}
              aria-label={`Ke slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
