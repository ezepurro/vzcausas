/** How a failed Drive call should be treated. */
export interface DriveFailure {
  /** Worth trying again: a passing problem. */
  retryable: boolean;
  /** The provider refuses our credentials or permissions. */
  authorization: boolean;
  /** The file or folder asked for does not exist (404). */
  notFound: boolean;
  /**
   * Short, non-sensitive text for the log: the status and, when Google gives one,
   * its reason (`status 400 (badRequest)`), never a response body. The reason is
   * what tells a refused conversion from a size limit (`exportSizeLimitExceeded`).
   */
  detail: string;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RATE_LIMIT_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded']);
const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
]);

interface GoogleLikeError {
  code?: number | string;
  status?: number;
  name?: string;
  message?: string;
  errors?: Array<{ reason?: string }>;
  response?: {
    status?: number;
    data?: { error?: string | { errors?: Array<{ reason?: string }> } };
  };
}

/**
 * Reads what `@googleapis/drive` (gaxios) puts in a failed call and decides how to
 * treat it. Understands the three shapes it uses: an HTTP status, a Node
 * network code (`ECONNRESET`…) and the OAuth `invalid_grant` answer.
 */
export function classifyDriveError(error: unknown): DriveFailure {
  const e = (typeof error === 'object' && error !== null ? error : {}) as GoogleLikeError;
  const status = extractStatus(e);
  const reason = extractReason(e);
  const networkCode = typeof e.code === 'string' && NETWORK_ERROR_CODES.has(e.code) ? e.code : undefined;

  if (isInvalidGrant(e)) {
    return { retryable: false, authorization: true, notFound: false, detail: 'invalid_grant' };
  }
  if (networkCode || isTimeout(e)) {
    return { retryable: true, authorization: false, notFound: false, detail: networkCode ?? 'timeout' };
  }
  if (status === 404) {
    return { retryable: false, authorization: false, notFound: true, detail: 'status 404' };
  }
  if (status === 401) {
    return { retryable: false, authorization: true, notFound: false, detail: describe(401, reason) };
  }
  if (status === 403) {
    if (reason && RATE_LIMIT_REASONS.has(reason)) {
      return { retryable: true, authorization: false, notFound: false, detail: describe(403, reason) };
    }
    return { retryable: false, authorization: true, notFound: false, detail: describe(403, reason) };
  }
  if (status !== undefined && RETRYABLE_STATUS.has(status)) {
    return { retryable: true, authorization: false, notFound: false, detail: describe(status, reason) };
  }
  return {
    retryable: false,
    authorization: false,
    notFound: false,
    detail: status !== undefined ? describe(status, reason) : 'unexpected error',
  };
}

/** `status 400`, or `status 400 (badRequest)` when Google says why. */
function describe(status: number, reason: string | undefined): string {
  return reason ? `status ${status} (${reason})` : `status ${status}`;
}

function extractStatus(e: GoogleLikeError): number | undefined {
  if (typeof e.response?.status === 'number') {
    return e.response.status;
  }
  if (typeof e.status === 'number') {
    return e.status;
  }
  if (e.code !== undefined) {
    const parsed = Number(e.code);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function extractReason(e: GoogleLikeError): string | undefined {
  const fromError = e.errors?.[0]?.reason;
  if (fromError) {
    return fromError;
  }
  const body = e.response?.data?.error;
  return typeof body === 'object' ? body?.errors?.[0]?.reason : undefined;
}

function isInvalidGrant(e: GoogleLikeError): boolean {
  return e.response?.data?.error === 'invalid_grant' || /invalid_grant/.test(e.message ?? '');
}

function isTimeout(e: GoogleLikeError): boolean {
  return e.name === 'AbortError' || /timeout|timed out/i.test(e.message ?? '');
}
