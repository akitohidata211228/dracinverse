import React, { useState, useEffect } from 'react';
import { X, Link2, Play, AlertCircle, Loader2 } from 'lucide-react';

interface UrlImporterModalProps {
  onClose: () => void;
  onPlayDrama: (id: string, source: 'flickreels' | 'melolo', episode?: number) => void;
}

export const UrlImporterModal: React.FC<UrlImporterModalProps> = ({ onClose, onPlayDrama }) => {
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const sampleUrls = [
    {
      label: 'FlickReels URL Contoh',
      url: 'https://www.flickreels.net/id/playlist/watch/1001/episode-1'
    },
    {
      label: 'Melolo Novel / Drama URL Contoh',
      url: 'https://melolo.com/novels/ikatan-takdir-sang-alpha-dan-luna'
    },
    {
      label: 'ID Drama FlickReels Langsung',
      url: '1001'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dramas/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl.trim() })
      });
      const data = await res.json();

      if (data.success) {
        const id = data.dramaId || data.slug;
        const source = data.source || 'flickreels';
        const episode = data.episode || data.chapter || 1;
        onPlayDrama(id, source, episode);
        onClose();
      } else {
        // Fallback: If it's a numeric string or text, try opening directly
        const clean = inputUrl.trim();
        if (/^\d+$/.test(clean)) {
          onPlayDrama(clean, 'flickreels', 1);
          onClose();
        } else if (clean.includes('melolo')) {
          const parts = clean.split('/');
          const slug = parts[parts.length - 1] || 'sample';
          onPlayDrama(slug, 'melolo', 1);
          onClose();
        } else {
          setError(
            data.message ||
              'Format link tidak dikenali. Pastikan link berasal dari FlickReels atau Melolo.'
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memeriksa URL.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-[#0e1017] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto cinema-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              Tempel Link atau ID Drama
            </h3>
            <p className="text-xs text-slate-400">
              Putar video vertikal HD langsung atau baca novel bab per bab
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              URL Link atau ID Drama
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://www.flickreels.net/... atau ID angka 1001"
              className="w-full px-4 py-3 bg-[#13151f] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !inputUrl.trim()}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa Link...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Putar &amp; Buka Drama
              </>
            )}
          </button>
        </form>

        {/* Quick sample chips */}
        <div className="mt-6 pt-5 border-t border-white/[0.06]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
            Coba Contoh URL Cepat:
          </span>
          <div className="flex flex-col gap-2">
            {sampleUrls.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputUrl(sample.url)}
                className="text-left px-3 py-2 bg-[#13151f] hover:bg-[#181a26] border border-white/[0.06] rounded-xl text-xs text-slate-300 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <span className="font-medium text-slate-200">{sample.label}</span>
                <span className="text-[11px] text-red-400 opacity-80 group-hover:opacity-100">
                  Gunakan
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
