import axios from 'axios';
import type { ServerResponse } from 'http';
import * as flickreels from './services/flickreels.js';
import * as melolo from './services/melolo.js';
import * as mockFallback from './services/mockFallback.js';

/**
 * Transport-agnostic API handlers.
 *
 * The same logic serves both the local Express server (`server.ts`) and the
 * Vercel serverless functions (`api/**`). Handlers only read plain request
 * data and return JSON payloads, so no Express or Vercel types leak in.
 *
 * The one exception is `handleStreamProxy`, which streams bytes straight to a
 * `ServerResponse` — both Express and Vercel responses satisfy that shape.
 */

export interface JsonResult {
  status: number;
  body: any;
}

// ---------------------------------------------------------------------------
// 1. Home catalog
// ---------------------------------------------------------------------------
export async function handleHome(params: {
  locale?: string;
  source?: string;
}): Promise<any> {
  const locale = flickreels.normalizeLocale(String(params.locale || 'id'));
  const source = String(params.source || 'all');

  // Both catalogs are fetched in parallel: run sequentially this request cost
  // ~2x the origin latency, which routinely pushed `source=all` past the
  // serverless timeout and left the feed empty.
  const wantFlickreels = source === 'all' || source === 'flickreels';
  const wantMelolo = source === 'all' || source === 'melolo';

  const [flickData, meloloData] = await Promise.all([
    wantFlickreels ? fetchHomeFlickreels(locale) : Promise.resolve(null),
    wantMelolo ? fetchHomeMelolo() : Promise.resolve(null)
  ]);

  return {
    success: true,
    locale,
    flickreels: flickData,
    melolo: meloloData
  };
}

async function fetchHomeFlickreels(locale: string): Promise<any> {
  try {
    return await flickreels.getHomeDramas(locale);
  } catch (err: any) {
    console.warn('FlickReels home fetch error, using fallback:', err.message);
    return {
      locale,
      source: 'flickreels',
      carousel: mockFallback.FALLBACK_CAROUSEL,
      hot: mockFallback.FALLBACK_HOT,
      rankings: mockFallback.FALLBACK_RANKINGS,
      recommendations: mockFallback.FALLBACK_HOT,
      allFeatured: [...mockFallback.FALLBACK_CAROUSEL, ...mockFallback.FALLBACK_HOT]
    };
  }
}

async function fetchHomeMelolo(): Promise<any> {
  try {
    return await melolo.getHomeDramas();
  } catch (err: any) {
    console.warn('Melolo home fetch error, using fallback:', err.message);
    return {
      success: true,
      source: 'melolo',
      featured: mockFallback.FALLBACK_HOT.filter((d) => d.source === 'melolo'),
      categories: ['billionaire', 'romance', 'werewolf', 'fantasy', 'mafia']
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Search
// ---------------------------------------------------------------------------
export async function handleSearch(params: {
  q?: string;
  source?: string;
  locale?: string;
}): Promise<any> {
  const query = String(params.q || '').trim();
  const source = String(params.source || 'all');
  const locale = flickreels.normalizeLocale(String(params.locale || 'id'));

  if (!query) {
    return { success: true, results: [] };
  }

  const results: any[] = [];

  if (source === 'all' || source === 'flickreels') {
    try {
      const flickRes = await flickreels.searchDrama(query, locale);
      results.push(...flickRes);
    } catch (err: any) {
      console.warn('FlickReels search error:', err.message);
      const matches = [...mockFallback.FALLBACK_CAROUSEL, ...mockFallback.FALLBACK_HOT].filter(
        (d) =>
          d.title.toLowerCase().includes(query.toLowerCase()) ||
          d.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      );
      results.push(...matches);
    }
  }

  if (source === 'all' || source === 'melolo') {
    try {
      const meloloRes = await melolo.searchDrama(query);
      if (meloloRes && Array.isArray(meloloRes.results)) {
        results.push(...meloloRes.results);
      }
    } catch (err: any) {
      console.warn('Melolo search error:', err.message);
    }
  }

  return {
    success: true,
    query,
    count: results.length,
    results
  };
}

// ---------------------------------------------------------------------------
// 3. Drama detail
// ---------------------------------------------------------------------------
export async function handleDetail(params: {
  id?: string;
  source?: string;
  locale?: string;
}): Promise<JsonResult> {
  const id = String(params.id || '');
  const source = String(params.source || 'flickreels');
  const locale = flickreels.normalizeLocale(String(params.locale || 'id'));

  if (!id) {
    return { status: 400, body: { success: false, message: 'ID or slug is required' } };
  }

  try {
    if (source === 'melolo' || id.startsWith('melolo-')) {
      const detail = await melolo.getDramaDetail(id);
      return {
        status: 200,
        body: { success: true, drama: detail.drama, episodes: detail.episodes, source: 'melolo' }
      };
    }
    const detail = await flickreels.getDramaDetail(id, locale);
    return {
      status: 200,
      body: { success: true, drama: detail, episodes: detail.episodes, source: 'flickreels' }
    };
  } catch (err: any) {
    console.warn('Detail fetch failed, falling back:', err.message);
    const fallback = mockFallback.getFallbackDetail(id, source as any);
    return {
      status: 200,
      body: { success: true, drama: fallback, episodes: fallback.episodes, source, isFallback: true }
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Episode stream
// ---------------------------------------------------------------------------
export async function handleStream(params: {
  id?: string;
  ep?: string;
  source?: string;
  locale?: string;
}): Promise<JsonResult> {
  const id = String(params.id || '');
  const epNum = parseInt(String(params.ep || '1'), 10) || 1;
  const source = String(params.source || 'flickreels');
  const locale = flickreels.normalizeLocale(String(params.locale || 'id'));

  if (!id) {
    return { status: 400, body: { success: false, message: 'ID is required' } };
  }

  try {
    let streamInfo: any;
    if (source === 'melolo' || id.startsWith('melolo-')) {
      streamInfo = await melolo.getEpisodeStream(id, epNum);
    } else {
      streamInfo = await flickreels.getEpisodeStream(id, epNum, locale);
    }

    const cachedDrama = flickreels.lookupCachedDrama(id);
    const bestCover = streamInfo.cover || streamInfo.thumbnail || cachedDrama?.cover || null;

    // Route through the proxy for reliable CORS/referer handling on playback
    if (streamInfo && streamInfo.streamUrl) {
      const rawUrl = streamInfo.streamUrl;
      const proxiedUrl = `/api/stream/proxy?url=${encodeURIComponent(rawUrl)}`;
      return {
        status: 200,
        body: {
          ...streamInfo,
          cover: bestCover,
          thumbnail: bestCover,
          streamUrl: proxiedUrl,
          directUrl: rawUrl,
          success: true
        }
      };
    }

    return {
      status: 200,
      body: { ...streamInfo, cover: bestCover, thumbnail: bestCover, success: true }
    };
  } catch (err: any) {
    console.warn('Stream fetch failed, fallback stream:', err.message);
    const fallback = mockFallback.getFallbackStream(id, epNum);
    const fallbackProxied = fallback.streamUrl
      ? `/api/stream/proxy?url=${encodeURIComponent(fallback.streamUrl)}`
      : null;
    const fallbackCover = fallback.cover || fallback.thumbnail || null;
    return {
      status: 200,
      body: {
        ...fallback,
        cover: fallbackCover,
        thumbnail: fallbackCover,
        streamUrl: fallbackProxied,
        directUrl: fallback.streamUrl,
        success: true,
        isFallback: true,
        unavailable: !fallbackProxied,
        message: fallbackProxied ? undefined : 'Stream tidak tersedia untuk episode ini'
      }
    };
  }
}

// ---------------------------------------------------------------------------
// 5. Novel chapter
// ---------------------------------------------------------------------------
export async function handleChapter(params: {
  slug?: string;
  chapter?: string;
}): Promise<JsonResult> {
  const slug = String(params.slug || '');
  const chapter = parseInt(String(params.chapter || '1'), 10) || 1;

  if (!slug) {
    return { status: 400, body: { success: false, message: 'Slug is required' } };
  }

  try {
    const chapterData = await melolo.getChapterContent(slug, chapter);
    return { status: 200, body: chapterData };
  } catch (err: any) {
    return {
      status: 200,
      body: {
        success: true,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        chapterTitle: `Bab ${chapter}`,
        chapterNum: chapter,
        content: `Bab ${chapter} dari novel drama pendek ini mengisahkan pertemuan tak terduga antara tokoh utama dengan rahasia besar keluarga konglomerat. Bersiaplah untuk kelanjutan kisah dramatis berikutnya di episode video!`
      }
    };
  }
}

// ---------------------------------------------------------------------------
// 6. Parse pasted URL
// ---------------------------------------------------------------------------
export function handleParseUrl(body: any): JsonResult {
  const url = body?.url;
  if (!url || typeof url !== 'string') {
    return { status: 400, body: { success: false, message: 'URL is required' } };
  }

  const flickParsed = flickreels.parseDramaUrl(url);
  const meloloParsed = melolo.parseMeloloUrl(url);

  if (flickParsed.isFlickReelsUrl) {
    return {
      status: 200,
      body: {
        success: true,
        source: 'flickreels',
        dramaId: flickParsed.dramaId,
        slug: flickParsed.slug,
        episode: flickParsed.episodeNumber || 1,
        locale: flickParsed.locale
      }
    };
  }

  if (meloloParsed.isMeloloUrl) {
    return {
      status: 200,
      body: {
        success: true,
        source: 'melolo',
        slug: meloloParsed.slug,
        chapter: meloloParsed.chapter,
        category: meloloParsed.category
      }
    };
  }

  if (flickParsed.dramaId) {
    return {
      status: 200,
      body: {
        success: true,
        source: 'flickreels',
        dramaId: flickParsed.dramaId,
        slug: flickParsed.slug,
        episode: 1
      }
    };
  }

  return {
    status: 200,
    body: { success: false, message: 'Format URL atau ID tidak dikenali sebagai FlickReels atau Melolo' }
  };
}

// ---------------------------------------------------------------------------
// 7. Stream proxy (CORS, referer, HLS manifest rewrite)
// ---------------------------------------------------------------------------
const PROXY_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers':
    'Range, Accept, Origin, Content-Type, Authorization, X-Requested-With',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
  'Accept-Ranges': 'bytes'
};

function applyProxyCors(res: ServerResponse): void {
  for (const [key, value] of Object.entries(PROXY_CORS)) {
    res.setHeader(key, value);
  }
}

/**
 * Streams an upstream media URL back to the client.
 *
 * `res` only needs the standard `ServerResponse` surface, which both the local
 * Express response and the Vercel response provide.
 */
export async function handleStreamProxy(
  res: ServerResponse,
  opts: { targetUrl: string; method?: string; range?: string }
): Promise<void> {
  const targetUrl = opts.targetUrl;
  const method = (opts.method || 'GET').toUpperCase();

  if (!targetUrl || !targetUrl.startsWith('http')) {
    applyProxyCors(res);
    res.statusCode = 400;
    res.end('Invalid url');
    return;
  }

  applyProxyCors(res);

  if (method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const isFlick = targetUrl.includes('flickreels') || targetUrl.includes('farsunpteltd');
    const isMelolo = targetUrl.includes('melolo');
    const referer = isFlick
      ? 'https://www.flickreels.net/'
      : isMelolo
      ? 'https://melolo.com'
      : undefined;

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };
    if (referer) headers['Referer'] = referer;
    if (isMelolo) headers['Origin'] = 'https://melolo.com';
    if (opts.range) headers['Range'] = opts.range;

    const isM3u8 = targetUrl.toLowerCase().includes('.m3u8');

    if (isM3u8) {
      // The upstream CDN is flaky (intermittent 502/timeout), so retry once.
      let m3u8Res: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          m3u8Res = await axios.get(targetUrl, {
            responseType: 'text',
            headers,
            timeout: 15000
          });
          break;
        } catch (retryErr: any) {
          const status = retryErr?.response?.status;
          const retriable =
            status === 502 || status === 503 || status === 504 ||
            retryErr.code === 'ECONNABORTED';
          if (!retriable || attempt === 1) throw retryErr;
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      const lines = String(m3u8Res.data).split(/\r?\n/);
      const baseQuery = new URL(targetUrl).search;

      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Media segment URIs and sub-playlists
        if (!trimmed.startsWith('#')) {
          try {
            const absUrlObj = new URL(trimmed, targetUrl);
            if (!absUrlObj.search && baseQuery) {
              absUrlObj.search = baseQuery;
            }
            return `/api/stream/proxy?url=${encodeURIComponent(absUrlObj.href)}`;
          } catch {
            return line;
          }
        }

        // #EXT-X-KEY URIs
        if (trimmed.startsWith('#EXT-X-KEY:') && trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/, (_match, keyUri) => {
            try {
              const absKeyUrlObj = new URL(keyUri, targetUrl);
              if (!absKeyUrlObj.search && baseQuery) {
                absKeyUrlObj.search = baseQuery;
              }
              return `URI="/api/stream/proxy?url=${encodeURIComponent(absKeyUrlObj.href)}"`;
            } catch {
              return `URI="${keyUri}"`;
            }
          });
        }

        return line;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.statusCode = 200;
      if (method === 'HEAD') {
        res.end();
        return;
      }
      res.end(rewrittenLines.join('\n'));
      return;
    }

    // Binary media (.ts / .mp4 segments and everything else)
    const proxyRes = await axios.get(targetUrl, {
      responseType: 'stream',
      headers,
      timeout: 25000,
      validateStatus: (status) => status >= 200 && status < 400
    });

    let contentType = String(proxyRes.headers['content-type'] || '');
    if (targetUrl.includes('.ts')) {
      contentType = 'video/mp2t';
    } else if (targetUrl.includes('.mp4')) {
      contentType = 'video/mp4';
    } else if (contentType.includes('octet-stream')) {
      if (targetUrl.includes('.ts')) contentType = 'video/mp2t';
      else if (targetUrl.includes('.mp4')) contentType = 'video/mp4';
    }

    if (contentType) res.setHeader('Content-Type', contentType);
    if (proxyRes.headers['content-length']) {
      res.setHeader('Content-Length', String(proxyRes.headers['content-length']));
    }

    if (proxyRes.headers['content-range']) {
      res.setHeader('Content-Range', String(proxyRes.headers['content-range']));
      res.statusCode = 206;
    } else if (opts.range && proxyRes.headers['content-length']) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.statusCode = 200;
    } else {
      res.statusCode = 200;
    }

    if (method === 'HEAD') {
      res.end();
      proxyRes.data.destroy?.();
      return;
    }

    proxyRes.data.pipe(res);
  } catch (err: any) {
    console.warn('Proxy stream error for URL:', targetUrl, err.message);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end('Error streaming media: ' + err.message);
    } else {
      res.end();
    }
  }
}
