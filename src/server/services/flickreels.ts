import axios from 'axios';
import * as cheerio from 'cheerio';

const FLICKREELS_ORIGIN = 'https://www.flickreels.net';
const DEFAULT_LOCALE = 'id';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// In-memory cache for fast response times and reducing origin strain
const dramaCache = new Map<string, any>();
const homeCache = new Map<string, { data: any; timestamp: number }>();
const detailCache = new Map<string, { data: any; timestamp: number }>();
const streamCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function normalizeLocale(locale?: string): string {
  if (!locale || typeof locale !== 'string') return DEFAULT_LOCALE;
  const l = locale.toLowerCase().trim();
  if (['id', 'in', 'indo', 'indonesia'].includes(l)) return 'id';
  if (['en', 'us', 'gb', 'english'].includes(l)) return 'en';
  if (['ja', 'jp', 'japanese'].includes(l)) return 'ja';
  if (['ko', 'kr', 'korean'].includes(l)) return 'ko';
  if (['es', 'spanish'].includes(l)) return 'es';
  if (['th', 'thai'].includes(l)) return 'th';
  if (['tc', 'zh-tw', 'traditional-chinese'].includes(l)) return 'tc';
  return l;
}

export function slugify(text?: string): string {
  if (!text) return '';
  const str = String(text);
  return str
    .toLowerCase()
    .replace(/[/&\s()（）[\]{}]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDuration(seconds: number | string): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function unpackNuxt(data: any[]): any {
  if (!Array.isArray(data)) return data;
  const memo = new Map<number, any>();

  function resolve(val: any): any {
    if (typeof val === 'number') {
      if (val < 0 || val >= data.length) return val;
      if (memo.has(val)) return memo.get(val);
      const target = data[val];
      return resolveTarget(target, val);
    }
    return val;
  }

  function resolveTarget(target: any, idx?: number): any {
    if (target === null || typeof target !== 'object') {
      if (idx !== undefined) memo.set(idx, target);
      return target;
    }
    if (Array.isArray(target)) {
      if (['ShallowReactive', 'Reactive', 'Set'].includes(target[0])) {
        const res = resolve(target[1]);
        if (idx !== undefined) memo.set(idx, res);
        return res;
      }
      const arr: any[] = [];
      if (idx !== undefined) memo.set(idx, arr);
      for (const item of target) {
        arr.push(resolve(item));
      }
      return arr;
    }
    const obj: Record<string, any> = {};
    if (idx !== undefined) memo.set(idx, obj);
    for (const [k, v] of Object.entries(target)) {
      obj[k] = resolve(v);
    }
    return obj;
  }

  return resolve(0);
}

export function parseM3u8Manifest(m3u8Content: string, playlistUrl: string = '') {
  if (!m3u8Content || typeof m3u8Content !== 'string') return null;

  const lines = m3u8Content.split(/\r?\n/);
  const segments: Array<{ index: number; duration: number; url: string }> = [];
  let targetDuration = 0;
  let version = 3;
  let currentSegmentDuration = 0;
  let hasEndList = false;

  const baseUrl = playlistUrl ? playlistUrl.split('?')[0].replace(/\/[^/]+$/, '/') : '';
  const queryString = playlistUrl && playlistUrl.includes('?') ? '?' + playlistUrl.split('?')[1] : '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#EXT-X-TARGETDURATION:')) {
      targetDuration = Number(trimmed.split(':')[1]) || 0;
    } else if (trimmed.startsWith('#EXT-X-VERSION:')) {
      version = Number(trimmed.split(':')[1]) || 3;
    } else if (trimmed.startsWith('#EXTINF:')) {
      const parts = trimmed.substring(8).split(',');
      currentSegmentDuration = parseFloat(parts[0]) || 0;
    } else if (trimmed === '#EXT-X-ENDLIST') {
      hasEndList = true;
    } else if (!trimmed.startsWith('#')) {
      let segmentUrl = trimmed;
      if (!segmentUrl.startsWith('http://') && !segmentUrl.startsWith('https://')) {
        segmentUrl = baseUrl + trimmed + queryString;
      }
      segments.push({
        index: segments.length + 1,
        duration: currentSegmentDuration,
        url: segmentUrl
      });
      currentSegmentDuration = 0;
    }
  }

  const totalCalculatedDuration = segments.reduce((acc, s) => acc + s.duration, 0);

  return {
    version,
    targetDuration,
    hasEndList,
    totalSegments: segments.length,
    totalDuration: Math.round(totalCalculatedDuration * 100) / 100,
    firstSegmentUrl: segments.length > 0 ? segments[0].url : null,
    segments: segments.slice(0, 50)
  };
}

export function indexDrama(drama: any, locale: string = DEFAULT_LOCALE) {
  if (!drama || !drama.playlet_id) return;
  const idStr = String(drama.playlet_id);
  const title = drama.title || '';
  const slug = slugify(title);

  const entry = {
    id: idStr,
    playletId: idStr,
    title,
    slug,
    locale,
    source: 'flickreels',
    cover: drama.cover || null,
    totalEpisodes: Number(drama.upload_num) || 0,
    synopsis: drama.introduce || '',
    tags: Array.isArray(drama.tag_list)
      ? drama.tag_list.map((t: any) => (typeof t === 'string' ? t : t.tag_name || '')).filter(Boolean)
      : Array.isArray(drama.tag_name)
      ? drama.tag_name.map((t: any) => (typeof t === 'string' ? t : t.tag_name || '')).filter(Boolean)
      : [],
    hasCollection: Boolean(drama.has_collection),
    url: `${FLICKREELS_ORIGIN}/${locale}/playlist/${slug || 'watch'}/${idStr}/episode-1`,
    episodesListUrl: `${FLICKREELS_ORIGIN}/${locale}/episodes-list/${slug || 'drama'}-${idStr}`
  };

  dramaCache.set(idStr, entry);
  if (slug) {
    dramaCache.set(slug, entry);
  }
}

export function lookupCachedDrama(identifier: string | number) {
  if (identifier === null || identifier === undefined) return null;
  const key = String(identifier).trim();
  return dramaCache.get(key) || null;
}

export function parseDramaUrl(input: string | number) {
  if (input === null || input === undefined) {
    return {
      dramaId: null,
      slug: null,
      episodeNumber: null,
      locale: DEFAULT_LOCALE,
      isFlickReelsUrl: false
    };
  }

  const trimmed = String(input).trim();
  const isFlickReelsUrl = /flickreels\.net/i.test(trimmed);

  const playlistMatch = trimmed.match(
    /(?:https?:\/\/[^/]+)?(?:\/([a-z]{2}))?\/playlist\/([^/]+)\/(\d+)(?:\/episode-(\d+))?/i
  );
  if (playlistMatch) {
    return {
      dramaId: playlistMatch[3],
      slug: playlistMatch[2],
      episodeNumber: playlistMatch[4] ? Number(playlistMatch[4]) : 1,
      locale: normalizeLocale(playlistMatch[1] || DEFAULT_LOCALE),
      isFlickReelsUrl: true
    };
  }

  const episodesListMatch = trimmed.match(
    /(?:https?:\/\/[^/]+)?(?:\/([a-z]{2}))?\/episodes-list\/([a-zA-Z0-9_-]+)-(\d+)/i
  );
  if (episodesListMatch) {
    return {
      dramaId: episodesListMatch[3],
      slug: episodesListMatch[2],
      episodeNumber: 1,
      locale: normalizeLocale(episodesListMatch[1] || DEFAULT_LOCALE),
      isFlickReelsUrl: true
    };
  }

  const movieMatch = trimmed.match(
    /(?:https?:\/\/[^/]+)?(?:\/([a-z]{2}))?\/movie\/([a-zA-Z0-9_-]+)-(\d+)/i
  );
  if (movieMatch) {
    return {
      dramaId: movieMatch[3],
      slug: movieMatch[2],
      episodeNumber: 1,
      locale: normalizeLocale(movieMatch[1] || DEFAULT_LOCALE),
      isFlickReelsUrl: true
    };
  }

  const numericMatch = trimmed.match(/^(\d+)$/);
  if (numericMatch) {
    const cached = lookupCachedDrama(numericMatch[1]);
    return {
      dramaId: numericMatch[1],
      slug: cached ? cached.slug : null,
      episodeNumber: null,
      locale: cached ? cached.locale : DEFAULT_LOCALE,
      isFlickReelsUrl: false
    };
  }

  return {
    dramaId: null,
    slug: null,
    episodeNumber: null,
    locale: DEFAULT_LOCALE,
    isFlickReelsUrl
  };
}

export async function searchDrama(query: string, locale = DEFAULT_LOCALE) {
  const q = String(query || '').trim();
  if (!q) return [];

  const loc = normalizeLocale(locale);
  const targetUrl = `${FLICKREELS_ORIGIN}/${loc}/search?drama=${encodeURIComponent(q)}`;

  const res = await axios.get(targetUrl, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: 12000
  });

  const $ = cheerio.load(res.data);
  const scriptEl = $('#__NUXT_DATA__');
  if (!scriptEl.length) {
    throw new Error('Nuxt script tag not found');
  }

  const raw = JSON.parse(scriptEl.html() || '[]');
  const unpacked = unpackNuxt(raw);

  const data = unpacked.data || {};
  const key = Object.keys(data).find((k) => k.startsWith('search-page-'));
  const list = key && data[key] && Array.isArray(data[key].list) ? data[key].list : [];

  return list.map((item: any) => {
    indexDrama(item, loc);
    const slug = slugify(item.title);
    return {
      id: String(item.playlet_id),
      playletId: String(item.playlet_id),
      title: item.title,
      slug,
      cover: item.cover,
      episodes: Number(item.upload_num) || 0,
      totalEpisodes: Number(item.upload_num) || 0,
      tags: Array.isArray(item.tag_list)
        ? item.tag_list.map((t: any) => (typeof t === 'string' ? t : t.tag_name)).filter(Boolean)
        : [],
      synopsis: item.introduce || '',
      hasCollection: Boolean(item.has_collection),
      source: 'flickreels',
      url: `${FLICKREELS_ORIGIN}/${loc}/playlist/${slug}/${item.playlet_id}/episode-1`,
      episodesListUrl: `${FLICKREELS_ORIGIN}/${loc}/episodes-list/${slug}-${item.playlet_id}`
    };
  });
}

export async function getHomeDramas(locale = DEFAULT_LOCALE) {
  const loc = normalizeLocale(locale);
  const cached = homeCache.get(loc);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const targetUrl = `${FLICKREELS_ORIGIN}/${loc}/`;
  const res = await axios.get(targetUrl, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: 15000
  });

  const $ = cheerio.load(res.data);
  const scriptEl = $('#__NUXT_DATA__');
  if (!scriptEl.length) {
    throw new Error('Nuxt script tag not found on homepage');
  }

  const raw = JSON.parse(scriptEl.html() || '[]');
  const unpacked = unpackNuxt(raw);

  if (!unpacked || !unpacked.data || !Array.isArray(unpacked.data['home-playletList'])) {
    throw new Error('Failed to deserialize home drama catalog');
  }

  const rawSections = unpacked.data['home-playletList'];
  const formattedSections: any[] = [];

  for (const section of rawSections) {
    const conf = section.column_config || {};
    const title = conf.title || 'Collection';
    const dramas = (section.playlet_list || []).map((item: any) => {
      indexDrama(item, loc);
      const slug = slugify(item.title);
      return {
        id: String(item.playlet_id),
        playletId: String(item.playlet_id),
        title: item.title,
        slug,
        cover: item.cover,
        episodes: Number(item.upload_num) || 0,
        synopsis: item.introduce || '',
        tags: Array.isArray(item.tag_list)
          ? item.tag_list.map((t: any) => (typeof t === 'string' ? t : t.tag_name)).filter(Boolean)
          : Array.isArray(item.tag_name)
          ? item.tag_name.map((t: any) => (typeof t === 'string' ? t : t.tag_name)).filter(Boolean)
          : [],
        source: 'flickreels',
        url: `${FLICKREELS_ORIGIN}/${loc}/playlist/${slug}/${item.playlet_id}/episode-1`
      };
    });

    formattedSections.push({
      id: conf.id || null,
      title,
      total: dramas.length,
      dramas
    });
  }

  const carousel = formattedSections[0] ? formattedSections[0].dramas : [];
  const hot = formattedSections[1] ? formattedSections[1].dramas : [];
  const rankings = formattedSections[2] ? formattedSections[2].dramas : [];
  const recommendations = formattedSections[3] ? formattedSections[3].dramas : [];
  const favorites = formattedSections[4] ? formattedSections[4].dramas : [];

  const result = {
    locale: loc,
    source: 'flickreels',
    sections: formattedSections,
    carousel,
    hot,
    rankings,
    recommendations,
    favorites,
    allFeatured: [...carousel, ...hot, ...rankings].filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i
    )
  };

  homeCache.set(loc, { data: result, timestamp: Date.now() });
  return result;
}

export async function getDramaDetail(input: string | number, locale = DEFAULT_LOCALE) {
  let loc = normalizeLocale(locale);
  const parsed = parseDramaUrl(input);

  let dramaId = parsed.dramaId;
  let slug = parsed.slug;
  if (parsed.locale) loc = parsed.locale;

  if (!dramaId) {
    const cached = lookupCachedDrama(input);
    if (cached) {
      dramaId = cached.id;
      slug = cached.slug;
    } else {
      const searchResults = await searchDrama(String(input), loc).catch(() => []);
      if (searchResults.length > 0) {
        dramaId = searchResults[0].id;
        slug = searchResults[0].slug;
      }
    }
  }

  if (!dramaId) {
    throw new Error(`Could not resolve drama ID from input: ${input}`);
  }

  const cacheKey = `${loc}_${dramaId}`;
  const cachedDetail = detailCache.get(cacheKey);
  if (cachedDetail && Date.now() - cachedDetail.timestamp < CACHE_TTL_MS) {
    return cachedDetail.data;
  }

  if (!slug) {
    const cached = lookupCachedDrama(dramaId);
    if (cached && cached.slug) {
      slug = cached.slug;
    } else {
      slug = 'watch';
    }
  }

  const targetUrl = `${FLICKREELS_ORIGIN}/${loc}/playlist/${slug}/${dramaId}/episode-1`;
  const res = await axios.get(targetUrl, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: 15000
  });

  const $ = cheerio.load(res.data);
  const scriptEl = $('#__NUXT_DATA__');
  if (!scriptEl.length) {
    throw new Error('Nuxt script tag not found in drama page');
  }

  const raw = JSON.parse(scriptEl.html() || '[]');
  const unpacked = unpackNuxt(raw);

  if (!unpacked || !unpacked.data) {
    throw new Error('Failed to retrieve drama detail data');
  }

  const chapterKey = Object.keys(unpacked.data).find((k) => k.startsWith('chapters-list-'));
  const detailData = chapterKey ? unpacked.data[chapterKey] : null;

  if (!detailData) {
    throw new Error(`No episode details found for drama ID ${dramaId}`);
  }

  const title = detailData.title || (lookupCachedDrama(dramaId) || {}).title || 'Drama Title';
  const realSlug = slugify(title) || slug;
  const startPayNum = Number(detailData.start_pay_num) || 0;
  const rawChapters = Array.isArray(detailData.list) ? detailData.list : [];
  const screenType = Number(detailData.screen_type) || 1;
  const finishState = Number(detailData.finish_state) || 1;

  const episodes = rawChapters.map((chap: any, idx: number) => {
    const epNum = Number(chap.chapter_num) || idx + 1;
    const isLocked = Boolean(chap.is_lock === 1 || (startPayNum > 0 && epNum >= startPayNum));
    const chapId = String(chap.chapter_id || `${dramaId}_${epNum}`);
    const durSec = Number(chap.duration) || 0;

    return {
      index: idx + 1,
      episodeNumber: epNum,
      chapterId: chapId,
      title: chap.chapter_title || `${title} - Episode ${epNum}`,
      cover: chap.chapter_cover || detailData.cover || null,
      durationSec: durSec,
      formattedDuration: formatDuration(durSec),
      isLocked,
      url: `${FLICKREELS_ORIGIN}/${loc}/playlist/${realSlug}/${dramaId}/episode-${epNum}`
    };
  });

  const finalDetail = {
    id: String(detailData.playlet_id || dramaId),
    playletId: String(detailData.playlet_id || dramaId),
    title,
    slug: realSlug,
    locale: loc,
    source: 'flickreels',
    cover: detailData.cover || null,
    synopsis: detailData.introduce || '',
    totalEpisodes: Number(detailData.upload_num) || episodes.length,
    startPayNum,
    freeEpisodesCount: startPayNum > 1 ? startPayNum - 1 : (episodes.length > 0 ? 10 : 0),
    screenType,
    videoOrientation: screenType === 1 ? 'Vertical (9:16)' : 'Horizontal (16:9)',
    finishState,
    completionStatus: finishState === 2 ? 'Tamat (Completed)' : 'Berjalan (Ongoing)',
    uploadDate: detailData.upload_date || null,
    tags: Array.isArray(detailData.tag_name)
      ? detailData.tag_name.map((t: any) => (typeof t === 'string' ? t : t.tag_name)).filter(Boolean)
      : [],
    episodes,
    playlistUrl: `${FLICKREELS_ORIGIN}/${loc}/playlist/${realSlug}/${dramaId}/episode-1`,
    episodesListUrl: `${FLICKREELS_ORIGIN}/${loc}/episodes-list/${realSlug}-${dramaId}`
  };

  detailCache.set(cacheKey, { data: finalDetail, timestamp: Date.now() });
  return finalDetail;
}

export async function getEpisodeStream(
  input: string | number,
  episodeNumber: number | string = 1,
  locale = DEFAULT_LOCALE
) {
  let loc = normalizeLocale(locale);
  const parsed = parseDramaUrl(input);

  let dramaId = parsed.dramaId;
  let slug = parsed.slug;
  let epNum = Number(parsed.episodeNumber) || Number(episodeNumber) || 1;
  if (parsed.locale) loc = parsed.locale;

  if (!dramaId) {
    const cached = lookupCachedDrama(input);
    if (cached) {
      dramaId = cached.id;
      slug = cached.slug;
    } else {
      const searchResults = await searchDrama(String(input), loc).catch(() => []);
      if (searchResults.length > 0) {
        dramaId = searchResults[0].id;
        slug = searchResults[0].slug;
      }
    }
  }

  if (!dramaId) {
    throw new Error(`Could not resolve drama ID for streaming: ${input}`);
  }

  const streamCacheKey = `${loc}_${dramaId}_${epNum}`;
  const cachedStream = streamCache.get(streamCacheKey);
  if (cachedStream && Date.now() - cachedStream.timestamp < CACHE_TTL_MS) {
    return cachedStream.data;
  }

  if (!slug) {
    const cached = lookupCachedDrama(dramaId);
    if (cached && cached.slug) {
      slug = cached.slug;
    } else {
      slug = 'watch';
    }
  }

  const targetUrl = `${FLICKREELS_ORIGIN}/${loc}/playlist/${slug}/${dramaId}/episode-${epNum}`;
  const res = await axios.get(targetUrl, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: 15000
  });

  const $ = cheerio.load(res.data);
  const scriptEl = $('#__NUXT_DATA__');
  if (!scriptEl.length) {
    throw new Error('Nuxt script tag not found in streaming page');
  }

  const raw = JSON.parse(scriptEl.html() || '[]');
  const unpacked = unpackNuxt(raw);

  let playbackData: any = null;
  if (unpacked && unpacked.state && unpacked.state['$splaylet-playback']) {
    playbackData = unpacked.state['$splaylet-playback'].data || null;
  }

  let hlsUrl = playbackData && playbackData.hls_url ? playbackData.hls_url : null;

  if (!hlsUrl && unpacked) {
    function findHlsRecursive(val: any): string | null {
      if (typeof val === 'string' && val.includes('.m3u8')) return val;
      if (typeof val === 'object' && val !== null) {
        for (const child of Object.values(val)) {
          const found = findHlsRecursive(child);
          if (found) return found;
        }
      }
      return null;
    }
    hlsUrl = findHlsRecursive(unpacked);
  }

  const cached = lookupCachedDrama(dramaId);
  const dramaTitle =
    (playbackData && playbackData.chapter_title && playbackData.chapter_title.split('-EP')[0]) ||
    (cached ? cached.title : `Drama ${dramaId}`);

  let parsedManifest = null;
  if (hlsUrl) {
    try {
      const manifestRes = await axios.get(hlsUrl, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Referer: FLICKREELS_ORIGIN
        },
        timeout: 8000
      });
      parsedManifest = parseM3u8Manifest(manifestRes.data, hlsUrl);
    } catch (e) {}
  }

  const durationSec = playbackData
    ? Number(playbackData.total_duration) || (parsedManifest ? parsedManifest.totalDuration : 0)
    : parsedManifest ? parsedManifest.totalDuration : 0;

  const result = {
    dramaId: String(dramaId),
    dramaTitle,
    episodeNumber: epNum,
    chapterId: playbackData ? String(playbackData.chapter_id) : null,
    chapterTitle: playbackData ? playbackData.chapter_title : `${dramaTitle} - Episode ${epNum}`,
    streamUrl: hlsUrl || null,
    hlsUrl: hlsUrl || null,
    firstSegmentUrl: parsedManifest ? parsedManifest.firstSegmentUrl : null,
    thumbnail: playbackData ? playbackData.chapter_cover : (cached ? cached.cover : null),
    durationSec,
    formattedDuration: formatDuration(durationSec),
    videoFormat: 'HLS Stream (.m3u8)',
    mimeType: 'application/x-mpegURL',
    videoOrientation: 'Vertical (9:16)',
    isPayChapter: playbackData ? Number(playbackData.is_pay_chapter) === 1 : false,
    isNeedPay: playbackData ? Number(playbackData.is_need_pay) === 1 : false,
    isLocked: !hlsUrl,
    shareUrl: playbackData ? playbackData.share_text : targetUrl,
    pageUrl: targetUrl,
    locale: loc,
    source: 'flickreels'
  };

  streamCache.set(streamCacheKey, { data: result, timestamp: Date.now() });
  return result;
}
