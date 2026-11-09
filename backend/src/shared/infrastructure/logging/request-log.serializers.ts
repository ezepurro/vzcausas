/**
 * The request as the request logger hands it to its serializer: already
 * flattened by `pino-std-serializers`, so it carries headers, query and
 * remote address alongside the fields kept here.
 */
type SerializedRequest = { id?: unknown; method?: string; url?: string };
type SerializedResponse = { statusCode?: number };

/**
 * What a request log line says about the request: its id, its method
 * and its path, and nothing else (`ARQUITECTURA_BACKEND_V1.md` §7.9).
 *
 * - **No query string**: `?search=` on `/cases`, `/clients` and
 *   `/lawyers` carries clients' and lawyers' surnames, and the logs may
 *   end up in a third-party service (Ley 25.326).
 * - **No headers**: `Authorization` and `Cookie` carry the session.
 *   The logger's `redact` list covers them too, as a second line.
 * - **No body**: never read here, so it cannot leak.
 *
 * Path parameters stay: they are identifiers, which §7.9 allows.
 */
export function serializeRequest(req: SerializedRequest): {
  id: unknown;
  method: string | undefined;
  path: string | undefined;
} {
  return { id: req.id, method: req.method, path: req.url?.split("?")[0] };
}

/** Only the status: response headers carry `Set-Cookie`. */
export function serializeResponse(res: SerializedResponse): {
  statusCode: number | undefined;
} {
  return { statusCode: res.statusCode };
}
