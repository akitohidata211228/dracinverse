import type { VercelRequest, VercelResponse } from '../../src/server/vercel-types';
import { handleParseUrl } from '../../src/server/handlers';

/** POST /api/dramas/parse-url — resolve a pasted URL into a playable ID. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = handleParseUrl(req.body);
  res.status(status).json(body);
}
