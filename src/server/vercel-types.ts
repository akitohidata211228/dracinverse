import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Minimal Vercel function request/response types.
 *
 * These mirror the shape `@vercel/node` exports, but are declared locally so
 * the real package is not needed as a dependency. `@vercel/node` pulls in a
 * large toolchain (ts-morph, undici, fast-glob) whose advisories account for
 * every `npm audit` finding in this project, and none of it ships at runtime.
 *
 * Only the members actually used by the handlers under `api/` are declared.
 */

export interface VercelRequest extends IncomingMessage {
  /** Route/query parameters. Values may repeat as arrays, hence `unknown`. */
  query: Record<string, unknown>;
  /** Parsed JSON body for POST handlers. */
  body: unknown;
  cookies: Record<string, string>;
}

export interface VercelResponse extends ServerResponse {
  /** Express-compatible status chaining, e.g. `res.status(404).json(...)`. */
  status(code: number): VercelResponse;
  /** Serialises the payload and ends the response. */
  json(body: unknown): VercelResponse;
  /** Sends a string or buffer payload and ends the response. */
  send(body: unknown): VercelResponse;
}
