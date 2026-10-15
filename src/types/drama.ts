export interface Episode {
  index?: number;
  episodeNumber: number;
  episodeId?: number | string;
  chapterId?: string;
  title: string;
  cover?: string | null;
  durationSec?: number;
  formattedDuration?: string;
  isLocked?: boolean;
  url?: string | null;
  hasStream?: boolean;
}

export interface Drama {
  id: string;
  playletId?: string;
  title: string;
  slug: string;
  cover: string;
  episodes?: number;
  totalEpisodes?: number;
  synopsis?: string;
  tags?: string[];
  source: 'flickreels' | 'melolo';
  rating?: string;
  locale?: string;
  url?: string;
  screenType?: number;
  videoOrientation?: string;
  completionStatus?: string;
  freeEpisodesCount?: number;
  startPayNum?: number;
  uploadDate?: string;
  episodeList?: Episode[];
}

export interface StreamData {
  dramaId: string;
  dramaTitle: string;
  episodeNumber: number;
  chapterTitle?: string;
  streamUrl?: string | null;
  directUrl?: string | null;
  hlsUrl?: string | null;
  videoUrl?: string | null;
  thumbnail?: string | null;
  durationSec?: number;
  formattedDuration?: string;
  videoFormat?: string;
  isLocked?: boolean;
  source?: string;
  shareUrl?: string;
  isFallback?: boolean;
  /** True when no stream exists for this episode (server reported unavailable). */
  unavailable?: boolean;
  message?: string;
}

export interface ChapterData {
  title: string;
  chapterTitle: string;
  chapterNum: number;
  content: string;
  slug: string;
  source: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  cover: string;
  source: 'flickreels' | 'melolo';
  lastEpisode: number;
  totalEpisodes: number;
  updatedAt: number;
}

/**
 * High-end cinematic fallback poster that renders instantly without external network requests
 */
export function getDramaPosterFallback(title?: string, source?: string): string {
  const safeTitle = (title || 'Dracin').slice(0, 26).replace(/[<>&"]/g, '');
  const isMelolo = source === 'melolo';
  const tag = isMelolo ? 'MELOLO' : 'FLICKREELS';
  const color1 = isMelolo ? '#064e3b' : '#881337';
  const color2 = isMelolo ? '#022c22' : '#4c0519';
  const accent = isMelolo ? '#10b981' : '#f43f5e';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="60%" stop-color="${color2}"/>
        <stop offset="100%" stop-color="#090a0f"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="200" cy="220" r="95" fill="${accent}" opacity="0.12"/>
    <text x="200" y="235" font-family="system-ui, sans-serif" font-weight="900" font-size="76" fill="${accent}" text-anchor="middle" opacity="0.9">剧</text>
    <rect x="140" y="315" width="120" height="26" rx="13" fill="${accent}" opacity="0.25"/>
    <text x="200" y="332" font-family="system-ui, sans-serif" font-weight="800" font-size="11" fill="#ffffff" text-anchor="middle" letter-spacing="2">${tag}</text>
    <text x="200" y="420" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#ffffff" text-anchor="middle">${safeTitle}</text>
    <text x="200" y="450" font-family="system-ui, sans-serif" font-weight="600" font-size="13" fill="#94a3b8" text-anchor="middle">HD Vertikal • Sub Indo</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
