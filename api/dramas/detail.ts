import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDetail } from '../../src/server/handlers';

/** GET /api/dramas/detail — episode list + metadata for one drama. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleDetail({
    id: req.query.id as string | undefined,
    source: req.query.source as string | undefined,
    locale: req.query.locale as string | undefined
  });
  res.status(status).json(body);
}
