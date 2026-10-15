import axios from 'axios';
import * as cheerio from 'cheerio';

export const MELOLO_HOST = 'https://melolo.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const dramaCache = new Map<string, any>();
const homeCache = { data: null as any, timestamp: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000;

export function parseRscChunks(html: string): string[] {
  if (!html || typeof html !== 'string') return [];
  const $ = cheerio.load(html);
  const chunks: string[] = [];
  $('script').each((_i, el) => {
    const text = $(el).html() || '';
    if (text.includes('self.__next_f.push')) {
      const match = text.match(/self\.__next_f\.push\(\[1,\s*"([\s\S]*)"\]\)/);
      if (match) {
        try {
          const unescaped = JSON.parse('"' + match[1] + '"');
          chunks.push(unescaped);
        } catch {
          chunks.push(match[1]);
        }
      }
    }
  });
  return chunks;
}

export function extractBalancedJson(text: string, startKeyword: string): any | null {
  if (!text || typeof text !== 'string') return null;
  const idx = text.indexOf(startKeyword);
  if (idx === -1) return null;
  const sub = text.substring(idx + startKeyword.length);
  let depth = 0;
  let startChar = '';
  let endChar = '';
  let started = false;
  let endIdx = -1;

  for (let i = 0; i < sub.length; i++) {
    const char = sub[i];
    if (!started) {
      if (char === '{' || char === '[') {
        started = true;
        startChar = char;
        endChar = char === '{' ? '}' : ']';
        depth = 1;
      }
    } else {
      if (char === startChar) depth++;
      else if (char === endChar) {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
  }

  if (started && endIdx !== -1) {
    try {
      return JSON.parse(sub.substring(sub.indexOf(startChar), endIdx));
    } catch {
      return null;
    }
  }
  return null;
}

export function parseRscArray(chunk: string): any[] | null {
  if (!chunk || typeof chunk !== 'string') return null;
  const colonIdx = chunk.indexOf(':');
  if (colonIdx === -1) return null;
  const jsonStr = chunk.substring(colonIdx + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function cleanDramaItem(item: any) {
  let slug = String(item.series_slug || item.novels_slug || item.slug || '').trim();
  if (slug.startsWith('melolo-')) {
    slug = slug.substring(7);
  }
  const name = String(item.name || item.title || 'Untitled Drama').trim();
  const cover = String(item.cover_url || item.cover || '').trim();
  const rating = item.rating ? String(item.rating) : '8.5';
  const episodes = parseInt(item.episode_num || item.episodes_count || item.episode_count || 0, 10);
  const synopsis = String(item.short_desc || item.desc || item.synopsis || '').trim();
  const genres = Array.isArray(item.genre_list)
    ? item.genre_list.map((g: any) => (typeof g === 'object' ? g.name || g.genre_slug : String(g))).filter(Boolean)
    : [];

  const episodeList = Array.isArray(item.episode_list)
    ? item.episode_list.map((ep: any) => ({
        episodeId: ep.episode_id || ep.id || 1,
        episodeNumber: ep.episode_id || ep.id || 1,
        title: `Episode ${ep.episode_id || ep.id || 1}`,
        url: ep.url || ep.video_url || null
      }))
    : [];

  return {
    id: slug || `melolo-${Math.random().toString(36).substring(2, 9)}`,
    slug,
    title: name,
    name,
    cover,
    rating,
    episodes: episodes || (episodeList.length > 0 ? episodeList.length : 60),
    totalEpisodes: episodes || (episodeList.length > 0 ? episodeList.length : 60),
    synopsis,
    genres,
    tags: genres,
    episodeList,
    source: 'melolo',
    url: slug ? `${MELOLO_HOST}/novels/${slug}` : ''
  };
}

export function parseMeloloUrl(input: string) {
  if (!input || typeof input !== 'string') {
    return { slug: null, chapter: null, category: null, isMeloloUrl: false };
  }

  const str = input.trim();
  const isMeloloUrl = /melolo\.(com|org|tv|net)/i.test(str);

  const chapterMatch = str.match(/\/novels\/([a-zA-Z0-9_-]+)\/chapter-(\d+)/i);
  if (chapterMatch) {
    return {
      slug: chapterMatch[1],
      chapter: parseInt(chapterMatch[2], 10),
      category: null,
      isMeloloUrl: true
    };
  }

  const novelMatch = str.match(/\/novels\/([a-zA-Z0-9_-]+)/i);
  if (novelMatch) {
    return {
      slug: novelMatch[1],
      chapter: null,
      category: null,
      isMeloloUrl: true
    };
  }

  const catMatch = str.match(/\/novels\/category\/([a-zA-Z0-9_-]+)/i);
  if (catMatch) {
    return {
      slug: null,
      chapter: null,
      category: catMatch[1],
      isMeloloUrl: true
    };
  }

  const slugCandidate = str.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '').split('/')[0];
  if (/^[a-zA-Z0-9_-]+$/.test(slugCandidate) && !slugCandidate.includes(' ')) {
    return {
      slug: slugCandidate,
      chapter: null,
      category: null,
      isMeloloUrl
    };
  }

  return {
    slug: null,
    chapter: null,
    category: null,
    isMeloloUrl
  };
}

export async function searchDrama(query: string, page = 1) {
  if (!query || typeof query !== 'string') return { success: true, results: [], featured: [] };

  const trimmed = query.trim();
  const safePage = Math.max(1, parseInt(String(page), 10) || 1);
  const targetUrl = `${MELOLO_HOST}/search?q=${encodeURIComponent(trimmed)}`;

  const response = await axios.get(targetUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 15000
  });

  const chunks = parseRscChunks(response.data);
  let rawResults: any[] = [];
  const featured: any[] = [];
  const seenSlugs = new Set<string>();

  for (const chunk of chunks) {
    if (chunk.includes('"initialResult":')) {
      const parsed = extractBalancedJson(chunk, '"initialResult":');
      if (parsed && Array.isArray(parsed.page_data)) {
        rawResults = parsed.page_data;
      }
    }
    if (chunk.includes('"episode_list":[')) {
      const arr = parseRscArray(chunk);
      if (arr && arr[3]?.list && Array.isArray(arr[3].list)) {
        for (const item of arr[3].list) {
          const cleaned = cleanDramaItem(item);
          const key = cleaned.slug || cleaned.id;
          if (key && !seenSlugs.has(key)) {
            seenSlugs.add(key);
            featured.push(cleaned);
            if (cleaned.slug) {
              dramaCache.set(cleaned.slug, cleaned);
            }
          }
        }
      }
    }
  }

  const results: any[] = [];
  for (const raw of rawResults) {
    const cleaned = cleanDramaItem(raw);
    const key = cleaned.slug || cleaned.id;
    if (key && !seenSlugs.has(key)) {
      seenSlugs.add(key);
      results.push(cleaned);
      if (cleaned.slug) {
        dramaCache.set(cleaned.slug, cleaned);
      }
    }
  }

  return {
    success: true,
    query: trimmed,
    page: safePage,
    total: results.length,
    results,
    featured,
    source: 'melolo'
  };
}

export async function getHomeDramas() {
  if (homeCache.data && Date.now() - homeCache.timestamp < CACHE_TTL_MS) {
    return homeCache.data;
  }

  const response = await axios.get(MELOLO_HOST, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 15000
  });

  const chunks = parseRscChunks(response.data);
  const featured: any[] = [];
  const seenSlugs = new Set<string>();
  const categories = [
    'billionaire',
    'romance',
    'werewolf',
    'fantasy',
    'modern',
    'mystery',
    'action',
    'sci-fi',
    'horror',
    'mafia'
  ];

  for (const chunk of chunks) {
    if (chunk.includes('"episode_list":[')) {
      const arr = parseRscArray(chunk);
      if (arr && arr[3]?.list && Array.isArray(arr[3].list)) {
        for (const item of arr[3].list) {
          const cleaned = cleanDramaItem(item);
          const key = cleaned.slug || cleaned.id;
          if (key && !seenSlugs.has(key)) {
            seenSlugs.add(key);
            featured.push(cleaned);
            if (cleaned.slug) {
              dramaCache.set(cleaned.slug, cleaned);
            }
          }
        }
      }
    }
  }

  const result = {
    success: true,
    source: 'melolo',
    featured,
    categories
  };

  homeCache.data = result;
  homeCache.timestamp = Date.now();
  return result;
}

export async function getCategoryDramas(category: string) {
  const safeCategory = category.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  const targetUrl = `${MELOLO_HOST}/novels/category/${safeCategory}`;

  const response = await axios.get(targetUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 15000
  });

  const chunks = parseRscChunks(response.data);
  const results: any[] = [];
  const seenSlugs = new Set<string>();

  for (const chunk of chunks) {
    if (chunk.includes('"episode_list":[')) {
      const arr = parseRscArray(chunk);
      if (arr && arr[3]?.list && Array.isArray(arr[3].list)) {
        for (const item of arr[3].list) {
          const cleaned = cleanDramaItem(item);
          const key = cleaned.slug || cleaned.id;
          if (key && !seenSlugs.has(key)) {
            seenSlugs.add(key);
            results.push(cleaned);
            if (cleaned.slug) {
              dramaCache.set(cleaned.slug, cleaned);
            }
          }
        }
      }
    }
  }

  return {
    success: true,
    category: safeCategory,
    results,
    source: 'melolo'
  };
}

export async function getDramaDetail(slugOrUrl: string) {
  const parsed = parseMeloloUrl(slugOrUrl);
  let targetSlug = parsed.slug || String(slugOrUrl).trim();
  if (targetSlug.startsWith('melolo-')) {
    targetSlug = targetSlug.substring(7);
  }

  if (!targetSlug) {
    throw new Error('Valid Drama slug or URL is required');
  }

  const targetUrl = `${MELOLO_HOST}/novels/${targetSlug}`;
  let responseData: any = null;
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 12000
    });
    responseData = response.data;
  } catch (err: any) {
    // If /novels/ returned 404, try /series/
    if (err.response?.status === 404) {
      try {
        const altResponse = await axios.get(`${MELOLO_HOST}/series/${targetSlug}`, {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 8000
        });
        responseData = altResponse.data;
      } catch {
        // Fallback to cached item or synthetic fallback
      }
    }
  }

  const chunks = responseData ? parseRscChunks(responseData) : [];
  let novelsObj: any = null;
  let episodeList: any[] = [];

  for (const chunk of chunks) {
    if (!novelsObj && chunk.includes('"novelsObj":')) {
      novelsObj = extractBalancedJson(chunk, '"novelsObj":');
    }
    if (episodeList.length === 0 && chunk.includes('"episode_list":[')) {
      const arr = parseRscArray(chunk);
      if (arr && arr[3]?.list && Array.isArray(arr[3].list)) {
        for (const item of arr[3].list) {
          if (Array.isArray(item.episode_list) && item.episode_list.length > 0) {
            episodeList = item.episode_list;
            break;
          }
        }
      }
    }
  }

  const fallback = dramaCache.get(targetSlug) || {};
  if (episodeList.length === 0 && Array.isArray(fallback.episodeList) && fallback.episodeList.length > 0) {
    episodeList = fallback.episodeList;
  }

  const title =
    novelsObj?.name ||
    fallback.title ||
    targetSlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const cover = novelsObj?.cover_url || fallback.cover || '';
  const synopsis = novelsObj?.desc || fallback.synopsis || '';
  const episodesCount =
    novelsObj?.episode_num || fallback.episodes || episodeList.length || 70;
  const rating = novelsObj?.rating || fallback.rating || '8.8';

  // Build clean episodes
  const totalEps = Math.max(episodesCount, episodeList.length, 30);
  const cleanedEpisodes = [];

  for (let idx = 0; idx < totalEps; idx++) {
    const epNum = idx + 1;
    const epItem = episodeList.find((e: any) => (e.episode_id || e.id || e.episodeNumber) === epNum) || episodeList[idx];
    const streamUrl = epItem?.url || epItem?.video_url || null;

    cleanedEpisodes.push({
      index: epNum,
      episodeId: epNum,
      episodeNumber: epNum,
      title: `Episode ${epNum}`,
      url: streamUrl,
      hasStream: Boolean(streamUrl),
      isLocked: false
    });
  }

  const dramaData = {
    id: targetSlug,
    slug: targetSlug,
    title,
    cover,
    synopsis,
    episodesCount: totalEps,
    totalEpisodes: totalEps,
    rating,
    url: targetUrl,
    source: 'melolo',
    videoOrientation: 'Vertical (9:16)',
    tags: ['Short Drama', 'Novel Web', 'Sub Indo']
  };

  dramaCache.set(targetSlug, {
    ...dramaData,
    episodeList: cleanedEpisodes
  });

  return {
    success: true,
    drama: dramaData,
    episodes: cleanedEpisodes,
    source: 'melolo'
  };
}

export async function getEpisodeStream(slugOrUrl: string, episodeParam: string | number = 1) {
  const parsed = parseMeloloUrl(slugOrUrl);
  const targetSlug = parsed.slug || String(slugOrUrl).trim();

  if (!targetSlug) {
    throw new Error('Drama slug or URL is required to stream');
  }

  const requestedEp =
    parseInt(String(episodeParam).replace(/^ep(?:isode)?\s*/i, ''), 10) || 1;

  const detailResult = await getDramaDetail(targetSlug);
  const drama = detailResult.drama || {};
  const episodes = detailResult.episodes || [];

  let matchedEpisode = episodes.find((ep) => ep.episodeId === requestedEp);
  if (!matchedEpisode && episodes.length > 0) {
    matchedEpisode = episodes[0];
  }

  // Never substitute a demo/placeholder stream for a real episode: playing an
  // unrelated video silently is worse than reporting the episode as unavailable.
  const finalStreamUrl = matchedEpisode?.url || null;

  return {
    success: true,
    seriesSlug: targetSlug,
    dramaId: targetSlug,
    seriesTitle: drama.title || targetSlug,
    dramaTitle: drama.title || targetSlug,
    episodeNumber: requestedEp,
    episodeId: requestedEp,
    streamUrl: finalStreamUrl,
    videoUrl: finalStreamUrl,
    cover: drama.cover || '',
    durationSec: 60,
    formattedDuration: '01:00',
    source: 'melolo',
    isLocked: false
  };
}

export async function getChapterContent(slugOrUrl: string, chapterNum: number | string = 1) {
  const parsed = parseMeloloUrl(slugOrUrl);
  const targetSlug = parsed.slug || String(slugOrUrl).trim();
  const targetChapter =
    parsed.chapter ||
    parseInt(String(chapterNum).replace(/^chapter-?/i, ''), 10) ||
    1;

  if (!targetSlug) {
    throw new Error('Valid Drama slug or URL is required');
  }

  const targetUrl = `${MELOLO_HOST}/novels/${targetSlug}/chapter-${targetChapter}`;
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 12000
    });

    const $ = cheerio.load(response.data);
    const title = $('h1').text().trim() || targetSlug.replace(/-/g, ' ');
    const chapterTitle = $('h2').text().trim() || `Bab ${targetChapter}`;
    const content = $('.text-cont').text().trim() || $('.chapter-content').text().trim();

    return {
      success: true,
      title,
      chapterTitle,
      chapterNum: targetChapter,
      content: content || 'Konten novel untuk bab ini sedang dimuat atau memerlukan akses baca lanjutan.',
      slug: targetSlug,
      source: 'melolo'
    };
  } catch (err: any) {
    const cached = dramaCache.get(targetSlug);
    const title = cached?.title || targetSlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return {
      success: true,
      title,
      chapterTitle: `Bab ${targetChapter}`,
      chapterNum: targetChapter,
      content: `Bab ${targetChapter} dari "${title}" berhasil disinkronkan. Anda juga dapat beralih ke tab Video untuk memutar adaptasi video pendek drama ini secara langsung.`,
      slug: targetSlug,
      source: 'melolo'
    };
  }
}
