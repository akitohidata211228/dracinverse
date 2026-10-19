import { handleStream } from '../../src/server/handlers.js';

/**
 * GET /api/dramas/stream — playable URL for one episode (proxied).
 *
 * Intentionally not edge-cached: the returned stream URL is short-lived and
 * a stale one produces a dead player.
 */
export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleStream({
    id: req.query.id as string | undefined,
    ep: req.query.ep as string | undefined,
    source: req.query.source as string | undefined,
    locale: req.query.locale as string | undefined
  });
  res.status(status).json(body);
}
