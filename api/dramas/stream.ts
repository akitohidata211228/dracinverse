import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleStream } from '../../src/server/handlers';

/** GET /api/dramas/stream — playable URL for one episode (proxied). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleStream({
    id: req.query.id as string | undefined,
    ep: req.query.ep as string | undefined,
    source: req.query.source as string | undefined,
    locale: req.query.locale as string | undefined
  });
  res.status(status).json(body);
}
