import type { VercelResponse } from './vercel-types';

/**
 * Marks an API response as cacheable by the Vercel Edge Network.
 *
 * These endpoints scrape upstream sites on every miss, so the function itself
 * is far too slow to sit in front of a page load. Caching at the edge means
 * only the first visitor pays the origin latency; everyone else is served
 * from a POP without invoking the function at all.
 *
 * Only safe for public, non-personalised GET responses.
 *
 * @param maxAgeSeconds how long the edge should serve the response as fresh
 * @param swrSeconds     how long a stale copy may be served while revalidating
 */
export function setEdgeCache(res: VercelResponse, maxAgeSeconds: number, swrSeconds = 60): void {
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${swrSeconds}`
  );
}
