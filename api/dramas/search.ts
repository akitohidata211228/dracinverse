import type { VercelRequest, VercelResponse } from '../../src/server/vercel-types';
import { handleSearch } from '../../src/server/handlers';

/** GET /api/dramas/search — search across FlickReels + Melolo. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = await handleSearch({
    q: req.query.q as string | undefined,
    source: req.query.source as string | undefined,
    locale: req.query.locale as string | undefined
  });
  res.status(200).json(body);
}
