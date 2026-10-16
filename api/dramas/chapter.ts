import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleChapter } from '../../src/server/handlers';

/** GET /api/dramas/chapter — novel chapter text for a Melolo slug. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleChapter({
    slug: req.query.slug as string | undefined,
    chapter: req.query.chapter as string | undefined
  });
  res.status(status).json(body);
}
