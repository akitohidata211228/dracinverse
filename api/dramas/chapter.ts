import { handleChapter } from '../../src/server/handlers.js';

/** GET /api/dramas/chapter — novel chapter text for a Melolo slug. */
export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleChapter({
    slug: req.query.slug as string | undefined,
    chapter: req.query.chapter as string | undefined
  });
  res.status(status).json(body);
}
