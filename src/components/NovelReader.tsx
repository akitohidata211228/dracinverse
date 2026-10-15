import React, { useState, useEffect, useRef } from 'react';
import { ChapterData } from '../types/drama';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sun,
  Moon,
  Coffee,
  Loader2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface NovelReaderProps {
  slug: string;
  initialChapter?: number;
  totalChapters?: number;
}

export const NovelReader: React.FC<NovelReaderProps> = ({
  slug,
  initialChapter = 1,
  totalChapters = 50
}) => {
  const [currentChapter, setCurrentChapter] = useState<number>(initialChapter);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(16);
  const [theme, setTheme] = useState<'dark' | 'sepia' | 'light'>('dark');

  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/dramas/chapter?slug=${encodeURIComponent(slug)}&chapter=${currentChapter}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.content) {
          setChapterData(data);
          // Reset scroll to top of chapter
          if (contentScrollRef.current) {
            contentScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
          }
        } else {
          setError(data.message || 'Konten bab tidak tersedia.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Gagal mengambil bab novel.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, currentChapter, reloadKey]);

  const themes = {
    dark: 'bg-[#0b0c12] text-slate-200 border-white/[0.08]',
    sepia: 'bg-[#fbf0d9] text-[#3e2c1c] border-[#ecd5b2]',
    light: 'bg-[#f8fafc] text-slate-800 border-slate-200'
  };

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border ${themes[theme]} transition-colors overflow-hidden select-text`}
    >
      {/* Reader Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-inherit bg-black/10 dark:bg-white/5 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 truncate max-w-[45%]">
          <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider truncate">
            Bab {currentChapter} / {totalChapters}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Font Size controls */}
          <div className="flex items-center bg-black/15 dark:bg-white/10 rounded-lg p-0.5 border border-inherit">
            <button
              onClick={() => setFontSize((s) => Math.max(13, s - 2))}
              className="px-2 py-0.5 text-xs font-bold hover:bg-black/10 rounded cursor-pointer"
              title="Perkecil Font"
            >
              A-
            </button>
            <span className="text-[11px] px-1 font-mono font-medium">{fontSize}</span>
            <button
              onClick={() => setFontSize((s) => Math.min(24, s + 2))}
              className="px-2 py-0.5 text-xs font-bold hover:bg-black/10 rounded cursor-pointer"
              title="Perbesar Font"
            >
              A+
            </button>
          </div>

          {/* Theme switcher */}
          <div className="flex items-center bg-black/15 dark:bg-white/10 rounded-lg p-0.5 border border-inherit">
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                theme === 'dark' ? 'bg-[#181a24] text-emerald-400' : 'opacity-60'
              }`}
              title="Mode Gelap"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                theme === 'sepia' ? 'bg-[#ecd5b2] text-amber-900' : 'opacity-60'
              }`}
              title="Mode Sepia"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'opacity-60'
              }`}
              title="Mode Terang"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Novel Body */}
      <div
        ref={contentScrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-10 sm:py-8 space-y-4 cinema-scrollbar"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <span className="text-xs font-semibold opacity-70">
              Memuat Teks Bab {currentChapter}...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-sm font-medium mb-4">{error}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Coba Muat Ulang
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto pb-8">
            <div className="mb-4">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                Novel Web Drama
              </span>
              <h2 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">
                {chapterData?.chapterTitle || `Bab ${currentChapter}`}
              </h2>
            </div>
            <div className="h-0.5 w-12 bg-emerald-500 mb-6 rounded-full" />

            <div
              className="leading-relaxed font-normal whitespace-pre-line tracking-normal"
              style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.8}px` }}
            >
              {chapterData?.content}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Bottom Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-t border-inherit bg-black/10 dark:bg-white/5 shrink-0">
        <button
          onClick={() => setCurrentChapter((c) => Math.max(1, c - 1))}
          disabled={currentChapter <= 1 || isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-inherit disabled:opacity-30 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Bab</span> Sebelumnya
        </button>

        <span className="text-xs font-semibold opacity-75 font-mono">
          Bab {currentChapter} / {totalChapters}
        </span>

        <button
          onClick={() => setCurrentChapter((c) => Math.min(totalChapters, c + 1))}
          disabled={currentChapter >= totalChapters || isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-30 transition-colors shadow-md shadow-emerald-950 cursor-pointer"
        >
          Selanjutnya <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
