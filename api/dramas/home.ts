import { handleHome } from '../../src/server/handlers.js';
import { setEdgeCache } from '../../src/server/http.js';

/**
 * GET /api/dramas/home — catalog sections for the landing feed.
 *
 * Edge-cached for 5 minutes: the handler scrapes two upstream sites, so without
 * this every visitor waits on a cold function and can exceed the serverless
 * duration limit.
 */
export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = await handleHome({
    locale: req.query.locale as string | undefined,
    source: req.query.source as string | undefined
  });
  setEdgeCache(res, 300, 120);
  res.status(200).json(body);
}
