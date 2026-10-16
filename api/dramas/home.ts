import type { VercelRequest, VercelResponse } from '../../src/server/vercel-types';
import { handleHome } from '../../src/server/handlers';

/** GET /api/dramas/home — catalog sections for the landing feed. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = await handleHome({
    locale: req.query.locale as string | undefined,
    source: req.query.source as string | undefined
  });
  res.status(200).json(body);
}
