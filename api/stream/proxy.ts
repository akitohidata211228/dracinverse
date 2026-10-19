import { handleStreamProxy } from '../../src/server/handlers.js';

/**
 * GET/HEAD/OPTIONS /api/stream/proxy — streams upstream media with CORS,
 * referer headers and HLS manifest rewriting.
 *
 * Never cached: every response is either a byte stream or a manifest with
 * signed query params that expire.
 */
export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleStreamProxy(res, {
    targetUrl: String(req.query.url || ''),
    method: req.method,
    range: (req.headers.range as string | undefined) || undefined
  });
}
