import { Gaxios } from 'gaxios';

/**
 * Un Google falso, en proceso, para probar la pila REAL de Google (`googleapis`
 * + `OAuth2Client` + `gaxios`) sin red ni credenciales.
 *
 * No reemplaza ninguna clase nuestra ni de Google: solo hace de "internet". Se
 * le entrega al `OAuth2Client` como transporte (`client.transporter =
 * fake.transporter`), así que tanto el canje del refresh token como cada
 * llamada a Drive pasan por acá y reciben respuestas con la forma de las de
 * Google. De esa forma los errores que ve nuestro adaptador son los que arma la
 * librería de verdad (`GaxiosError`), no unos escritos a mano.
 *
 * Simula:
 * - `POST oauth2.googleapis.com/token` con `grant_type=refresh_token`.
 * - Drive v3: `files.list`, `files.create` (carpeta y subida multipart),
 *   `files.get` (metadatos y `alt=media`) y `files.delete`, sobre un árbol en
 *   memoria. Un pedido sin un access token vigente recibe `401`.
 * - Fallas a pedido (`failNext`), demoras y cortes de red.
 *
 * Guarda todos los pedidos (`requests`) para afirmar cuántos hubo, con qué
 * token y que no hubo ninguno a `permissions`.
 */

export interface FakeGoogleOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Vida de cada access token, en segundos. Con menos de 300 el cliente lo considera por vencer y refresca en cada pedido. */
  accessTokenLifetimeSeconds?: number;
}

export interface RecordedRequest {
  method: string;
  host: string;
  path: string;
  query: Record<string, string>;
  authorization: string | null;
  /** JSON o formulario ya interpretado; para una subida multipart, solo sus metadatos. */
  body: unknown;
}

/** Una falla programada: se aplica a los próximos pedidos que cumplan `match`. */
export interface FailureRule {
  /** Por defecto, cualquier pedido a Drive (no al canje del token). */
  match?: (request: RecordedRequest) => boolean;
  /** Estado HTTP a responder. */
  status?: number;
  /** `reason` del primer error del cuerpo (`rateLimitExceeded`, `insufficientPermissions`…). */
  reason?: string;
  /** En vez de responder, cortar la conexión con este código de red. */
  networkError?: string;
  /** Cuántos pedidos afecta. Por defecto, 1. */
  times?: number;
}

interface DriveNode {
  id: string;
  name: string;
  mimeType: string;
  parentId: string | null;
  content?: Buffer;
  webViewLink: string;
}

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const DRIVE_HOST = 'www.googleapis.com';
const TOKEN_HOST = 'oauth2.googleapis.com';

export class FakeGoogle {
  readonly requests: RecordedRequest[] = [];
  /** Cuántas veces se canjeó el refresh token con éxito. */
  tokenExchanges = 0;
  /** Demora (ms) que se aplica a cada pedido a Drive; para probar el tiempo de espera. */
  driveDelayMs = 0;

  private refreshToken: string;
  private readonly clientId: string;
  private clientSecret: string;
  private readonly lifetime: number;
  private readonly validAccessTokens = new Set<string>();
  private readonly nodes = new Map<string, DriveNode>();
  private rules: Array<FailureRule & { remaining: number }> = [];
  private sequence = 0;

  /** El transporte a asignar a `oauthClient.transporter`. */
  readonly transporter: Gaxios;

  constructor(options: FakeGoogleOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.refreshToken = options.refreshToken;
    this.lifetime = options.accessTokenLifetimeSeconds ?? 3599;
    this.transporter = new Gaxios({ fetchImplementation: this.fetch as typeof fetch });
  }

  // ───────────── controles de la prueba ─────────────

  /** Programa una falla para los próximos pedidos. */
  failNext(rule: FailureRule): void {
    this.rules.push({ ...rule, remaining: rule.times ?? 1 });
  }

  /** Cancela las fallas programadas que todavía no se aplicaron. */
  clearFailures(): void {
    this.rules = [];
  }

  /** El refresh token deja de valer (lo revocaron): el canje responde `invalid_grant`. */
  revokeRefreshToken(): void {
    this.refreshToken = `${this.refreshToken}-revoked`;
  }

  /** El usuario reautoriza: el refresh token original vuelve a valer. */
  restoreRefreshToken(original: string): void {
    this.refreshToken = original;
  }

  /** Google deja de reconocer el secreto del cliente (lo rotaron): el canje responde `invalid_client`. */
  rotateClientSecret(): void {
    this.clientSecret = `${this.clientSecret}-rotated`;
  }

  /** Todos los access tokens ya emitidos dejan de valer (Drive responde 401 hasta que se canjee otro). */
  expireAccessTokens(): void {
    this.validAccessTokens.clear();
  }

  /** Crea una carpeta ya existente en el Drive falso (p. ej. la estructura base). */
  seedFolder(name: string, parentId: string | null): { id: string; url: string } {
    const node = this.addNode(name, FOLDER_MIME_TYPE, parentId);
    return { id: node.id, url: node.webViewLink };
  }

  /** Borra una carpeta o archivo "a mano" (con todo lo que tiene adentro), sin pasar por la API. */
  deleteNode(id: string): void {
    this.remove(id);
  }

  /** El id que tendrá el `offset`-ésimo próximo nodo creado (0 = el siguiente). Sirve para provocar un choque de ids. */
  nextNodeId(kind: 'folder' | 'file', offset = 0): string {
    return `fake-${kind}-${this.sequence + 1 + offset}`;
  }

  // ───────────── consultas para afirmar ─────────────

  /** Pedidos al canje del token, salgan bien o mal. */
  get tokenRequests(): RecordedRequest[] {
    return this.requests.filter((r) => r.host === TOKEN_HOST);
  }

  /** Pedidos a Drive (no al canje del token). */
  get driveRequests(): RecordedRequest[] {
    return this.requests.filter((r) => r.host === DRIVE_HOST);
  }

  /** Pedidos que crean carpetas o archivos. */
  get createRequests(): RecordedRequest[] {
    return this.driveRequests.filter((r) => r.method === 'POST');
  }

  /** Pedidos a cualquier ruta de `permissions` (compartir). Tiene que ser vacío (CA-39.8). */
  get permissionsRequests(): RecordedRequest[] {
    return this.driveRequests.filter((r) => r.path.includes('/permissions'));
  }

  /** Carpetas del árbol, con su ruta completa desde la raíz de la cuenta. */
  folderPaths(): string[] {
    return [...this.nodes.values()]
      .filter((n) => n.mimeType === FOLDER_MIME_TYPE)
      .map((n) => this.pathOf(n));
  }

  /** Los hijos (carpetas y archivos) de una carpeta, por nombre. */
  childrenNames(parentId: string | null): string[] {
    return [...this.nodes.values()].filter((n) => n.parentId === parentId).map((n) => n.name);
  }

  foldersNamed(name: string): DriveNode[] {
    return [...this.nodes.values()].filter((n) => n.mimeType === FOLDER_MIME_TYPE && n.name === name);
  }

  get files(): DriveNode[] {
    return [...this.nodes.values()].filter((n) => n.mimeType !== FOLDER_MIME_TYPE);
  }

  // ───────────── el "internet" falso ─────────────

  private readonly fetch = async (input: unknown, init?: Record<string, unknown>): Promise<Response> => {
    const url = new URL(String(input));
    const headers = new Headers((init?.headers as HeadersInit) ?? {});
    const method = String(init?.method ?? 'GET').toUpperCase();
    const raw = await readBody(init?.body);
    // `fetch` pone solo el tipo de un formulario cuando el cuerpo es un `URLSearchParams`.
    const contentType =
      headers.get('content-type') ??
      (init?.body instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : null);
    const query = Object.fromEntries(url.searchParams.entries());

    const request: RecordedRequest = {
      method,
      host: url.host,
      path: url.pathname,
      query,
      authorization: headers.get('authorization'),
      body: parseBody(raw, contentType),
    };
    this.requests.push(request);

    if (url.host === TOKEN_HOST) {
      return this.handleToken(request);
    }

    const injected = this.takeFailure(request);
    if (injected?.networkError) {
      throw Object.assign(new Error(`request to ${url.href} failed, reason: ${injected.networkError}`), {
        code: injected.networkError,
      });
    }
    if (this.driveDelayMs > 0) {
      await abortableDelay(this.driveDelayMs, init?.signal as AbortSignal | undefined);
    }
    if (injected) {
      return jsonError(injected.status ?? 500, injected.reason);
    }
    return this.handleDrive(request, raw, contentType);
  };

  private handleToken(request: RecordedRequest): Response {
    const form = request.body as Record<string, string>;
    if (form.client_id !== this.clientId || form.client_secret !== this.clientSecret) {
      return json(401, { error: 'invalid_client', error_description: 'Unauthorized' });
    }
    if (form.grant_type !== 'refresh_token' || form.refresh_token !== this.refreshToken) {
      return json(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' });
    }
    this.tokenExchanges += 1;
    const accessToken = `ya29.fake-access-token-${this.tokenExchanges}`;
    this.validAccessTokens.add(accessToken);
    return json(200, {
      access_token: accessToken,
      expires_in: this.lifetime,
      scope: 'https://www.googleapis.com/auth/drive.file',
      token_type: 'Bearer',
    });
  }

  private handleDrive(request: RecordedRequest, raw: Buffer, contentType: string | null): Response {
    const bearer = request.authorization?.replace(/^Bearer /i, '');
    if (!bearer || !this.validAccessTokens.has(bearer)) {
      return jsonError(401, 'authError', 'Invalid Credentials');
    }

    const filesPath = /^\/(?:upload\/)?drive\/v3\/files(?:\/([^/]+))?$/.exec(request.path);
    if (!filesPath) {
      return jsonError(404, 'notFound', `Unknown route ${request.path}`);
    }
    const fileId = filesPath[1];

    if (request.method === 'GET' && !fileId) {
      return this.list(request.query.q ?? '');
    }
    if (request.method === 'POST' && !fileId) {
      return request.path.startsWith('/upload/')
        ? this.createWithMedia(raw, contentType)
        : this.createFolder(request.body as { name: string; mimeType?: string; parents?: string[] });
    }
    if (request.method === 'GET' && fileId) {
      return this.get(fileId, request.query.alt === 'media');
    }
    if (request.method === 'DELETE' && fileId) {
      return this.remove(fileId);
    }
    return jsonError(400, 'badRequest', `Unsupported ${request.method} ${request.path}`);
  }

  private list(q: string): Response {
    const parent = /'((?:\\.|[^'\\])*)' in parents/.exec(q)?.[1];
    const name = /name = '((?:\\.|[^'\\])*)'/.exec(q)?.[1];
    const mimeType = /mimeType = '([^']*)'/.exec(q)?.[1];
    const parentId = parent === undefined ? undefined : unescapeQuery(parent);
    const wantedName = name === undefined ? undefined : unescapeQuery(name);

    const found = [...this.nodes.values()].filter(
      (n) =>
        (parentId === undefined || (parentId === 'root' ? n.parentId === null : n.parentId === parentId)) &&
        (wantedName === undefined || n.name === wantedName) &&
        (mimeType === undefined || n.mimeType === mimeType),
    );
    return json(200, { files: found.map((n) => ({ id: n.id, name: n.name, webViewLink: n.webViewLink })) });
  }

  private createFolder(body: { name: string; mimeType?: string; parents?: string[] }): Response {
    const parent = this.resolveParent(body.parents?.[0]);
    if (parent === 'missing') {
      return jsonError(404, 'notFound', `File not found: ${body.parents?.[0]}.`);
    }
    const node = this.addNode(body.name, body.mimeType ?? FOLDER_MIME_TYPE, parent);
    return json(200, { id: node.id, name: node.name, webViewLink: node.webViewLink });
  }

  private createWithMedia(raw: Buffer, contentType: string | null): Response {
    const boundary = /boundary=("?)([^";]+)\1/.exec(contentType ?? '')?.[2];
    if (!boundary) {
      return jsonError(400, 'badRequest', 'Missing multipart boundary');
    }
    const { metadata, content, mimeType } = parseMultipart(raw, boundary);
    const parent = this.resolveParent(metadata.parents?.[0]);
    if (parent === 'missing') {
      return jsonError(404, 'notFound', `File not found: ${metadata.parents?.[0]}.`);
    }
    const node = this.addNode(metadata.name, mimeType, parent, content);
    return json(200, { id: node.id, name: node.name, webViewLink: node.webViewLink });
  }

  private get(id: string, media: boolean): Response {
    const node = this.nodes.get(id);
    if (!node) {
      return jsonError(404, 'notFound', `File not found: ${id}.`);
    }
    if (media) {
      return new Response(new Uint8Array(node.content ?? Buffer.alloc(0)), {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      });
    }
    return json(200, { id: node.id, name: node.name, webViewLink: node.webViewLink, trashed: false });
  }

  private remove(id: string): Response {
    if (!this.nodes.has(id)) {
      return jsonError(404, 'notFound', `File not found: ${id}.`);
    }
    const doomed = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of this.nodes.values()) {
        if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
          doomed.add(n.id);
          grew = true;
        }
      }
    }
    doomed.forEach((d) => this.nodes.delete(d));
    return new Response(null, { status: 204 });
  }

  // ───────────── árbol ─────────────

  private resolveParent(parent: string | undefined): string | null | 'missing' {
    if (parent === undefined || parent === 'root') {
      return null;
    }
    return this.nodes.has(parent) ? parent : 'missing';
  }

  private addNode(name: string, mimeType: string, parentId: string | null, content?: Buffer): DriveNode {
    this.sequence += 1;
    const isFolder = mimeType === FOLDER_MIME_TYPE;
    const id = `${isFolder ? 'fake-folder' : 'fake-file'}-${this.sequence}`;
    const node: DriveNode = {
      id,
      name,
      mimeType,
      parentId,
      content,
      webViewLink: isFolder
        ? `https://drive.google.com/drive/folders/${id}`
        : `https://drive.google.com/file/d/${id}/view`,
    };
    this.nodes.set(id, node);
    return node;
  }

  private pathOf(node: DriveNode): string {
    const names: string[] = [];
    for (let current: DriveNode | undefined = node; current; current = current.parentId ? this.nodes.get(current.parentId) : undefined) {
      names.unshift(current.name);
    }
    return `/${names.join('/')}`;
  }

  private takeFailure(request: RecordedRequest): (FailureRule & { remaining: number }) | undefined {
    const rule = this.rules.find(
      (r) => r.remaining > 0 && (r.match ? r.match(request) : true),
    );
    if (!rule) {
      return undefined;
    }
    rule.remaining -= 1;
    return rule;
  }
}

// ───────────── utilidades ─────────────

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8' },
  });
}

/** Un error con la forma que usa la API de Drive. */
function jsonError(status: number, reason?: string, message = 'Error'): Response {
  return json(status, {
    error: {
      code: status,
      message,
      errors: reason ? [{ message, domain: 'global', reason }] : [],
    },
  });
}

function unescapeQuery(value: string): string {
  return value.replace(/\\(.)/g, '$1');
}

async function readBody(body: unknown): Promise<Buffer> {
  if (body === undefined || body === null) {
    return Buffer.alloc(0);
  }
  if (typeof body === 'string') {
    return Buffer.from(body);
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (body instanceof URLSearchParams) {
    return Buffer.from(body.toString());
  }
  const chunks: Buffer[] = [];
  // Una secuencia (Readable de Node o ReadableStream): se lee entera.
  for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseBody(raw: Buffer, contentType: string | null): unknown {
  if (raw.length === 0) {
    return null;
  }
  const type = contentType ?? '';
  if (type.includes('application/json')) {
    return JSON.parse(raw.toString('utf8'));
  }
  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw.toString('utf8')).entries());
  }
  if (type.includes('multipart/related')) {
    const boundary = /boundary=("?)([^";]+)\1/.exec(type)?.[2];
    return boundary ? { multipart: parseMultipart(raw, boundary).metadata } : null;
  }
  return null;
}

/** Interpreta un `multipart/related` de dos partes: metadatos JSON y contenido. */
function parseMultipart(
  raw: Buffer,
  boundary: string,
): { metadata: { name: string; parents?: string[] }; content: Buffer; mimeType: string } {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];
  let start = raw.indexOf(delimiter);
  while (start !== -1) {
    const next = raw.indexOf(delimiter, start + delimiter.length);
    if (next === -1) {
      break;
    }
    parts.push(raw.subarray(start + delimiter.length, next));
    start = next;
  }
  const split = (part: Buffer) => {
    const separator = part.indexOf('\r\n\r\n');
    const head = part.subarray(0, separator).toString('utf8');
    // Se descarta el CRLF que antecede al próximo delimitador.
    const body = part.subarray(separator + 4, part.length - 2);
    return { head, body };
  };
  const [metadataPart, contentPart] = parts.map(split);
  return {
    metadata: JSON.parse(metadataPart.body.toString('utf8')),
    content: contentPart.body,
    mimeType: /content-type:\s*([^\r\n]+)/i.exec(contentPart.head)?.[1]?.trim() ?? 'application/octet-stream',
  };
}

/** Espera `ms`, pero se corta con un error de tiempo agotado si la señal se aborta antes (como `fetch`). */
function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error('aborted'));
    });
  });
}
