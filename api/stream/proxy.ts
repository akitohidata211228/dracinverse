import type { VercelRequest, VercelResponse } from '../../src/server/vercel-types';
import { handleStreamProxy } from '../../src/server/handlers';

/**
 * GET/HEAD/OPTIONS /api/stream/proxy — streams upstream media with CORS,
 * referer headers and HLS manifest rewriting.
 *
 * Max duration is raised because segment fetches from the upstream CDN are
 * slow and each retry adds latency.
 */
export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleStreamProxy(res, {
    targetUrl: String(req.query.url || ''),
    method: req.method,
    range: (req.headers.range as string | undefined) || undefined
  });
}
