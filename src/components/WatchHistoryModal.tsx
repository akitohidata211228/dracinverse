import React, { useEffect } from 'react';
import { HistoryItem, Drama, getDramaPosterFallback } from '../types/drama';
import { X, Play, Trash2, Clock, Heart, Film } from 'lucide-react';

interface WatchHistoryModalProps {
  type: 'history' | 'favorites';
  historyItems: HistoryItem[];
  favoriteItems: Drama[];
  onClose: () => void;
  onPlayDrama: (id: string, source: 'flickreels' | 'melolo', episode?: number) => void;
  onClearHistory?: () => void;
  onRemoveHistoryItem?: (id: string) => void;
  onRemoveFavorite?: (id: string) => void;
}

export const WatchHistoryModal: React.FC<WatchHistoryModalProps> = ({
  type,
  historyItems,
  favoriteItems,
  onClose,
  onPlayDrama,
  onClearHistory,
  onRemoveHistoryItem,
  onRemoveFavorite
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0e1017] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                type === 'history'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}
            >
              {type === 'history' ? (
                <Clock className="w-5 h-5" />
              ) : (
                <Heart className="w-5 h-5 fill-red-500" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {type === 'history' ? 'Riwayat Tontonan' : 'Daftar Favorit'}
              </h3>
              <p className="text-xs text-slate-400">
                {type === 'history'
                  ? 'Lanjutkan menonton episode yang belum selesai'
                  : 'Koleksi drama pendek Asia tersimpan Anda'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {type === 'history' && historyItems.length > 0 && onClearHistory && (
              <button
                onClick={onClearHistory}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-red-950/60 hover:text-red-400 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Hapus Semua Riwayat"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 cinema-scrollbar">
          {type === 'history' ? (
            historyItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                <Film className="w-12 h-12 mb-3 opacity-30 text-red-500" />
                <p className="text-sm font-bold text-slate-300">Belum ada riwayat tontonan</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Putar drama apa pun untuk menyimpan riwayat episode terakhir Anda secara otomatis.
                </p>
              </div>
            ) : (
              historyItems.map((item) => {
                const posterFallback = getDramaPosterFallback(item.title, item.source);
                const displayCover =
                  item.cover && item.cover.trim() ? item.cover : posterFallback;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-[#13151f] hover:bg-[#181a26] rounded-2xl border border-white/[0.06] transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 truncate flex-1 mr-2">
                      <img
                        src={displayCover}
                        alt={item.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = posterFallback;
                        }}
                        className="w-13 h-18 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                      />
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                              item.source === 'flickreels'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {item.source}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Episode Terakhir:{' '}
                          <span className="text-red-400 font-bold">
                            EP {item.lastEpisode}
                          </span>{' '}
                          / {item.totalEpisodes}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onRemoveHistoryItem && (
                        <button
                          onClick={() => onRemoveHistoryItem(item.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
                          title="Hapus dari Riwayat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onPlayDrama(item.id, item.source, item.lastEpisode);
                          onClose();
                        }}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Lanjut
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : favoriteItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <Heart className="w-12 h-12 mb-3 opacity-30 text-red-500" />
              <p className="text-sm font-bold text-slate-300">Belum ada drama favorit tersimpan</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Klik ikon hati (❤️) pada drama favorit Anda untuk menyimpannya di sini.
              </p>
            </div>
          ) : (
            favoriteItems.map((item) => {
              const posterFallback = getDramaPosterFallback(item.title, item.source);
              const displayCover =
                item.cover && item.cover.trim() ? item.cover : posterFallback;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-[#13151f] hover:bg-[#181a26] rounded-2xl border border-white/[0.06] transition-colors group"
                >
                  <div className="flex items-center gap-3.5 truncate flex-1 mr-2">
                    <img
                      src={displayCover}
                      alt={item.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = posterFallback;
                      }}
                      className="w-13 h-18 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                    />
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                            item.source === 'flickreels'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {item.source}
                        </span>
                        <span className="text-[11px] font-bold text-amber-400">
                          ★ {item.rating || '9.8'}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.synopsis?.slice(0, 70)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onPlayDrama(item.id, item.source, 1);
                        onClose();
                      }}
                      className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Tonton
                    </button>

                    {onRemoveFavorite && (
                      <button
                        onClick={() => onRemoveFavorite(item.id)}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
                        title="Hapus dari Favorit"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
