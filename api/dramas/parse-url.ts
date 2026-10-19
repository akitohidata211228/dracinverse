import { handleParseUrl } from '../../src/server/handlers.js';

/** POST /api/dramas/parse-url — resolve a pasted URL into a playable ID. */
export const config = { maxDuration: 10 };

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = handleParseUrl(req.body);
  res.status(status).json(body);
}
