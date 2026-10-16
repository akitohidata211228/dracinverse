import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as handlers from './src/server/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Local development / single-node deployment server.
 *
 * Every API handler lives in `src/server/handlers.ts` and is shared with the
 * Vercel serverless functions under `api/`. This file only wires those
 * handlers into Express routes and serves the frontend.
 */
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  const jsonResult = (res: Response) => (r: { status: number; body: any }) =>
    res.status(r.status).json(r.body);

  // 1. Home Catalog
  app.get('/api/dramas/home', async (req: Request, res: Response) => {
    const body = await handlers.handleHome({
      locale: String(req.query.locale || ''),
      source: String(req.query.source || '')
    });
    res.json(body);
  });

  // 2. Search
  app.get('/api/dramas/search', async (req: Request, res: Response) => {
    const body = await handlers.handleSearch({
      q: String(req.query.q || ''),
      source: String(req.query.source || ''),
      locale: String(req.query.locale || '')
    });
    res.json(body);
  });

  // 3. Drama Detail
  app.get('/api/dramas/detail', async (req: Request, res: Response) => {
    const result = await handlers.handleDetail({
      id: String(req.query.id || ''),
      source: String(req.query.source || ''),
      locale: String(req.query.locale || '')
    });
    jsonResult(res)(result);
  });

  // 4. Episode Streaming
  app.get('/api/dramas/stream', async (req: Request, res: Response) => {
    const result = await handlers.handleStream({
      id: String(req.query.id || ''),
      ep: String(req.query.ep || ''),
      source: String(req.query.source || ''),
      locale: String(req.query.locale || '')
    });
    jsonResult(res)(result);
  });

  // 5. Novel Chapter
  app.get('/api/dramas/chapter', async (req: Request, res: Response) => {
    const result = await handlers.handleChapter({
      slug: String(req.query.slug || ''),
      chapter: String(req.query.chapter || '')
    });
    jsonResult(res)(result);
  });

  // 6. Parse pasted URL
  app.post('/api/dramas/parse-url', (req: Request, res: Response) => {
    jsonResult(res)(handlers.handleParseUrl(req.body));
  });

  // 7. Video Stream Proxy (CORS, referer, HLS manifest rewrite)
  app.options('/api/stream/proxy', (_req: Request, res: Response) => {
    res.status(200).end();
  });

  app.all('/api/stream/proxy', async (req: Request, res: Response) => {
    await handlers.handleStreamProxy(res, {
      targetUrl: String(req.query.url || ''),
      method: req.method,
      range: (req.headers.range as string | undefined) || undefined
    });
  });

  // Serve built frontend in production, Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DracinVerse] Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
