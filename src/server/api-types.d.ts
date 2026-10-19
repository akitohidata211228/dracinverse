/**
 * Ambient types for the serverless entry points and the shared handlers.
 *
 * These are declared globally on purpose rather than imported.
 *
 * `import type { ... }` stops Vercel's dependency tracer from following the
 * rest of that file's imports. When the tracer gives up it does not copy the
 * shared modules into /var/task/, and the function then dies at startup with:
 *   ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/src/server/handlers'
 *
 * A .d.ts file is never imported at runtime and never shipped, so declaring
 * the request/response shapes here keeps the tracer working while the
 * handlers stay fully type-checked.
 *
 * Both the Vercel functions and the local Express server structurally satisfy
 * these shapes, so one declaration covers both runtimes.
 */

interface VercelRequest {
  query: Record<string, unknown>;
  body: unknown;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse extends NodeJS.WritableStream {
  statusCode: number;
  readonly headersSent: boolean;
  setHeader(name: string, value: string | number): void;
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  send(body: unknown): VercelResponse;
}

/** Minimal writable surface the stream proxy needs (Node/Express response). */
interface StreamProxyResponse extends NodeJS.WritableStream {
  statusCode: number;
  readonly headersSent: boolean;
  setHeader(name: string, value: string | number): void;
}
