import React, { useState } from 'react';
import { Drama, getDramaPosterFallback } from '../types/drama';
import { Play, Heart, Star, Film } from 'lucide-react';

interface DramaCardProps {
  drama: Drama;
  onPlay: (drama: Drama) => void;
  onFavoriteToggle?: (drama: Drama) => void;
  isFavorited?: boolean;
  rankNumber?: number;
}

export const DramaCard: React.FC<DramaCardProps> = ({
  drama,
  onPlay,
  onFavoriteToggle,
  isFavorited = false,
  rankNumber
}) => {
  const [imgSrc, setImgSrc] = useState<string>(
    drama.cover && drama.cover.trim()
      ? drama.cover
      : getDramaPosterFallback(drama.title, drama.source)
  );

  const fallback = getDramaPosterFallback(drama.title, drama.source);

  const episodeCount = drama.episodes || drama.totalEpisodes || 60;

  return (
    <div className="group relative flex flex-col rounded-xl sm:rounded-2xl bg-[#0f1118] border border-white/[0.06] hover:border-red-500/40 hover:shadow-xl hover:shadow-red-950/25 active:scale-[0.98] transition-all duration-200 overflow-hidden select-none">
      {/* Poster Image Container */}
      <div
        onClick={() => onPlay(drama)}
        className="relative w-full aspect-[2/3] overflow-hidden bg-[#090a0f] cursor-pointer"
      >
        <img
          src={imgSrc}
          alt={drama.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          onError={() => {
            setImgSrc(fallback);
          }}
        />

        {/* Ambient Cinema Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-black/35 opacity-90 group-hover:opacity-95 transition-opacity" />

        {/* Rank Number Badge (for Top 10) */}
        {rankNumber !== undefined && (
          <div
            className={`absolute top-2 left-2 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shadow-xl backdrop-blur-md ${
              rankNumber === 1
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black font-extrabold ring-1 ring-amber-300/50'
                : rankNumber === 2
                ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black font-extrabold ring-1 ring-white/50'
                : rankNumber === 3
                ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-extrabold ring-1 ring-amber-600/40'
                : 'bg-black/80 text-white/90 border border-white/15'
            }`}
          >
            #{rankNumber}
          </div>
        )}

        {/* Source Badge (top right) */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border ${
              drama.source === 'flickreels'
                ? 'bg-red-600/90 border-red-500/40 text-white'
                : 'bg-emerald-600/90 border-emerald-500/40 text-white'
            }`}
          >
            {drama.source === 'flickreels' ? 'FLICK' : 'MELOLO'}
          </span>
        </div>

        {/* Hover Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-600/95 text-white flex items-center justify-center pl-0.5 shadow-xl shadow-red-950 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current" />
          </div>
        </div>

        {/* Bottom Poster Badges */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] sm:text-xs">
          <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-400 font-bold flex items-center gap-0.5 border border-white/10 shadow-sm">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> {drama.rating || '9.8'}
          </span>

          <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-slate-300 text-[9px] sm:text-[10px] font-mono font-semibold border border-white/10 shadow-sm">
            {episodeCount} EP
          </span>
        </div>

        {/* Favorite Heart Quick Toggle */}
        {onFavoriteToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(drama);
            }}
            className="absolute top-2 left-2 z-20 p-1.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white transition-all transform active:scale-90"
            style={{ display: rankNumber !== undefined ? 'none' : 'block' }}
            title="Simpan ke Favorit"
            aria-label="Simpan Favorit"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-300 hover:text-white'
              }`}
            />
          </button>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-gradient-to-b from-[#0f1118] to-[#0c0d14]">
        <h4
          onClick={() => onPlay(drama)}
          className="text-xs sm:text-sm font-bold text-white line-clamp-2 hover:text-red-400 transition-colors cursor-pointer leading-tight sm:leading-snug tracking-tight"
          title={drama.title}
        >
          {drama.title}
        </h4>

        {/* Tags and Sub Indo Label */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/[0.04]">
          <div className="flex items-center gap-1 overflow-hidden">
            {drama.tags && drama.tags.length > 0 ? (
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 font-medium truncate max-w-[85px] sm:max-w-[110px]">
                {drama.tags[0]}
              </span>
            ) : (
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 font-medium">
                Dracin
              </span>
            )}
          </div>

          <span className="text-[9px] text-red-400/90 font-bold tracking-wider shrink-0 uppercase">
            Sub Indo
          </span>
        </div>
      </div>
    </div>
  );
};
