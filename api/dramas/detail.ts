import type { VercelRequest, VercelResponse } from '../../src/server/vercel-types';
import { handleDetail } from '../../src/server/handlers';
import { setEdgeCache } from '../../src/server/http';

/**
 * GET /api/dramas/detail — episode list + metadata for one drama.
 *
 * Edge-cached for 5 minutes; episode lists rarely change and the handler hits
 * the upstream site whenever its in-memory cache is cold.
 */
export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleDetail({
    id: req.query.id as string | undefined,
    source: req.query.source as string | undefined,
    locale: req.query.locale as string | undefined
  });
  setEdgeCache(res, 300, 120);
  res.status(status).json(body);
}
