import { handleSearch } from '../../src/server/handlers.js';
import { setEdgeCache } from '../../src/server/http.js';

/**
 * GET /api/dramas/search — search across FlickReels + Melolo.
 *
 * Edge-cached for 60s keyed on the query string. Repeated searches and back
 * navigation skip the upstream scrape entirely.
 */
export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = await handleSearch({
    q: req.query.q as string | undefined,
    source: req.query.source as string | undefined,
    locale: req.query.locale as string | undefined
  });
  setEdgeCache(res, 60, 60);
  res.status(200).json(body);
}
