import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as flickreels from './src/server/services/flickreels.js';
import * as melolo from './src/server/services/melolo.js';
import * as mockFallback from './src/server/services/mockFallback.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // 1. Home Catalog Endpoint
  app.get('/api/dramas/home', async (req: Request, res: Response) => {
    const locale = flickreels.normalizeLocale(String(req.query.locale || 'id'));
    const source = String(req.query.source || 'all');

    let flickData: any = null;
    let meloloData: any = null;

    if (source === 'all' || source === 'flickreels') {
      try {
        flickData = await flickreels.getHomeDramas(locale);
      } catch (err: any) {
        console.warn('FlickReels home fetch error, using fallback:', err.message);
        flickData = {
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

    if (source === 'all' || source === 'melolo') {
      try {
        meloloData = await melolo.getHomeDramas();
      } catch (err: any) {
        console.warn('Melolo home fetch error, using fallback:', err.message);
        meloloData = {
          success: true,
          source: 'melolo',
          featured: mockFallback.FALLBACK_HOT.filter((d) => d.source === 'melolo'),
          categories: ['billionaire', 'romance', 'werewolf', 'fantasy', 'mafia']
        };
      }
    }

    res.json({
      success: true,
      locale,
      flickreels: flickData,
      melolo: meloloData
    });
  });

  // 2. Search Endpoint
  app.get('/api/dramas/search', async (req: Request, res: Response) => {
    const query = String(req.query.q || '').trim();
    const source = String(req.query.source || 'all');
    const locale = flickreels.normalizeLocale(String(req.query.locale || 'id'));

    if (!query) {
      return res.json({ success: true, results: [] });
    }

    const results: any[] = [];

    // Search Flickreels
    if (source === 'all' || source === 'flickreels') {
      try {
        const flickRes = await flickreels.searchDrama(query, locale);
        results.push(...flickRes);
      } catch (err: any) {
        console.warn('FlickReels search error:', err.message);
        // Match in fallback
        const matches = [...mockFallback.FALLBACK_CAROUSEL, ...mockFallback.FALLBACK_HOT].filter(
          (d) =>
            d.title.toLowerCase().includes(query.toLowerCase()) ||
            d.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        );
        results.push(...matches);
      }
    }

    // Search Melolo
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

    res.json({
      success: true,
      query,
      count: results.length,
      results
    });
  });

  // 3. Drama Detail Endpoint
  app.get('/api/dramas/detail', async (req: Request, res: Response) => {
    const id = String(req.query.id || '');
    const source = String(req.query.source || 'flickreels');
    const locale = flickreels.normalizeLocale(String(req.query.locale || 'id'));

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID or slug is required' });
    }

    try {
      if (source === 'melolo' || id.startsWith('melolo-')) {
        const detail = await melolo.getDramaDetail(id);
        return res.json({ success: true, drama: detail.drama, episodes: detail.episodes, source: 'melolo' });
      } else {
        const detail = await flickreels.getDramaDetail(id, locale);
        return res.json({ success: true, drama: detail, episodes: detail.episodes, source: 'flickreels' });
      }
    } catch (err: any) {
      console.warn('Detail fetch failed, falling back:', err.message);
      const fallback = mockFallback.getFallbackDetail(id, source as any);
      return res.json({ success: true, drama: fallback, episodes: fallback.episodes, source, isFallback: true });
    }
  });

  // 4. Episode Streaming Endpoint
  app.get('/api/dramas/stream', async (req: Request, res: Response) => {
    const id = String(req.query.id || '');
    const epNum = parseInt(String(req.query.ep || '1'), 10) || 1;
    const source = String(req.query.source || 'flickreels');
    const locale = flickreels.normalizeLocale(String(req.query.locale || 'id'));

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID is required' });
    }

    try {
      let streamInfo: any;
      if (source === 'melolo' || id.startsWith('melolo-')) {
        streamInfo = await melolo.getEpisodeStream(id, epNum);
      } else {
        streamInfo = await flickreels.getEpisodeStream(id, epNum, locale);
      }

      const cachedDrama = flickreels.lookupCachedDrama(id);
      const bestCover =
        streamInfo.cover ||
        streamInfo.thumbnail ||
        cachedDrama?.cover ||
        null;

      // If stream info has a raw remote URL, route through proxy for 100% reliable CORS/playback
      if (streamInfo && streamInfo.streamUrl) {
        const rawUrl = streamInfo.streamUrl;
        const proxiedUrl = `/api/stream/proxy?url=${encodeURIComponent(rawUrl)}`;
        return res.json({
          ...streamInfo,
          cover: bestCover,
          thumbnail: bestCover,
          streamUrl: proxiedUrl,
          directUrl: rawUrl,
          success: true
        });
      }

      return res.json({
        ...streamInfo,
        cover: bestCover,
        thumbnail: bestCover,
        success: true
      });
    } catch (err: any) {
      console.warn('Stream fetch failed, fallback stream:', err.message);
      const fallback = mockFallback.getFallbackStream(id, epNum);
      const fallbackProxied = fallback.streamUrl
        ? `/api/stream/proxy?url=${encodeURIComponent(fallback.streamUrl)}`
        : null;
      const fallbackCover = fallback.cover || fallback.thumbnail || null;
      return res.json({
        ...fallback,
        cover: fallbackCover,
        thumbnail: fallbackCover,
        streamUrl: fallbackProxied,
        directUrl: fallback.streamUrl,
        success: true,
        isFallback: true,
        unavailable: !fallbackProxied,
        message: fallbackProxied ? undefined : 'Stream tidak tersedia untuk episode ini'
      });
    }
  });

  // 5. Melolo Novel Chapter Endpoint
  app.get('/api/dramas/chapter', async (req: Request, res: Response) => {
    const slug = String(req.query.slug || '');
    const chapter = parseInt(String(req.query.chapter || '1'), 10) || 1;

    if (!slug) {
      return res.status(400).json({ success: false, message: 'Slug is required' });
    }

    try {
      const chapterData = await melolo.getChapterContent(slug, chapter);
      return res.json(chapterData);
    } catch (err: any) {
      return res.json({
        success: true,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        chapterTitle: `Bab ${chapter}`,
        chapterNum: chapter,
        content: `Bab ${chapter} dari novel drama pendek ini mengisahkan pertemuan tak terduga antara tokoh utama dengan rahasia besar keluarga konglomerat. Bersiaplah untuk kelanjutan kisah dramatis berikutnya di episode video!`
      });
    }
  });

  // 6. Parse URL Endpoint
  app.post('/api/dramas/parse-url', (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const flickParsed = flickreels.parseDramaUrl(url);
    const meloloParsed = melolo.parseMeloloUrl(url);

    if (flickParsed.isFlickReelsUrl) {
      return res.json({
        success: true,
        source: 'flickreels',
        dramaId: flickParsed.dramaId,
        slug: flickParsed.slug,
        episode: flickParsed.episodeNumber || 1,
        locale: flickParsed.locale
      });
    }

    if (meloloParsed.isMeloloUrl) {
      return res.json({
        success: true,
        source: 'melolo',
        slug: meloloParsed.slug,
        chapter: meloloParsed.chapter,
        category: meloloParsed.category
      });
    }

    // Try guessing numeric ID as flickreels or slug as melolo
    if (flickParsed.dramaId) {
      return res.json({
        success: true,
        source: 'flickreels',
        dramaId: flickParsed.dramaId,
        slug: flickParsed.slug,
        episode: 1
      });
    }

    res.json({
      success: false,
      message: 'Format URL atau ID tidak dikenali sebagai FlickReels atau Melolo'
    });
  });

  // 7. Video Stream Proxy (to bypass CORS, Referer protections, and rewrite HLS manifests)
  app.options('/api/stream/proxy', (_req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin, Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.status(200).end();
  });

  app.all('/api/stream/proxy', async (req: Request, res: Response) => {
    const targetUrl = String(req.query.url || '');
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).send('Invalid url');
    }

    // Always set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin, Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
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
      if (referer) {
        headers['Referer'] = referer;
      }
      if (isMelolo) {
        headers['Origin'] = 'https://melolo.com';
      }
      if (req.headers.range) headers['Range'] = req.headers.range as string;

      const isM3u8 = targetUrl.toLowerCase().includes('.m3u8');

      if (isM3u8) {
        // Fetch playlist text and rewrite relative URIs to absolute proxy URIs.
        // The upstream CDN is flaky (intermittent 502/timeout), so retry once
        // before giving up.
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
              status === 502 || status === 503 || status === 504 || retryErr.code === 'ECONNABORTED';
            if (!retriable || attempt === 1) throw retryErr;
            await new Promise((r) => setTimeout(r, 400));
          }
        }

        const lines = String(m3u8Res.data).split(/\r?\n/);
        const baseQuery = new URL(targetUrl).search;

        const rewrittenLines = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // Rewrite media segment URIs or sub-playlists
          if (!trimmed.startsWith('#')) {
            try {
              const absUrlObj = new URL(trimmed, targetUrl);
              // Preserve base query params (tokens / verification) if segment doesn't have its own
              if (!absUrlObj.search && baseQuery) {
                absUrlObj.search = baseQuery;
              }
              return `/api/stream/proxy?url=${encodeURIComponent(absUrlObj.href)}`;
            } catch {
              return line;
            }
          }

          // Rewrite #EXT-X-KEY URI if present
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
        if (req.method === 'HEAD') {
          return res.status(200).end();
        }
        return res.send(rewrittenLines.join('\n'));
      }

      // Binary media streaming (.ts, .mp4, webp, etc.)
      const proxyRes = await axios.get(targetUrl, {
        responseType: 'stream',
        headers,
        timeout: 25000,
        validateStatus: (status) => status >= 200 && status < 400
      });

      // Set proper content-type
      let contentType = String(proxyRes.headers['content-type'] || '');
      if (targetUrl.includes('.ts')) {
        contentType = 'video/mp2t';
      } else if (targetUrl.includes('.mp4')) {
        contentType = 'video/mp4';
      } else if (contentType.includes('octet-stream')) {
        if (targetUrl.includes('.ts')) contentType = 'video/mp2t';
        else if (targetUrl.includes('.mp4')) contentType = 'video/mp4';
      }

      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', String(proxyRes.headers['content-length']));
      }
      if (proxyRes.headers['content-range']) {
        res.setHeader('Content-Range', String(proxyRes.headers['content-range']));
        res.status(206);
      } else if (req.headers.range && proxyRes.headers['content-length']) {
        // If upstream returned 200 full stream, indicate range support
        res.setHeader('Accept-Ranges', 'bytes');
      }

      if (req.method === 'HEAD') {
        return res.status(200).end();
      }

      proxyRes.data.pipe(res);
    } catch (err: any) {
      console.warn('Proxy stream error for URL:', targetUrl, err.message);
      res.status(502).send('Error streaming media: ' + err.message);
    }
  });

  // Setup Vite in Dev or Static in Production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DracinVerse] Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
