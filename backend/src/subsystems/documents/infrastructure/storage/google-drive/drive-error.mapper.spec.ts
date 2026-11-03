import { classifyDriveError } from './drive-error.mapper';

const httpError = (status: number, reason?: string) => ({
  response: { status },
  errors: reason ? [{ reason }] : undefined,
});

describe('classifyDriveError', () => {
  it.each([500, 502, 503, 504, 429])('el estado %i es transitorio y se reintenta', (status) => {
    expect(classifyDriveError(httpError(status))).toMatchObject({
      retryable: true,
      authorization: false,
      notFound: false,
    });
  });

  it.each(['rateLimitExceeded', 'userRateLimitExceeded'])(
    'un 403 por %s es transitorio y se reintenta',
    (reason) => {
      expect(classifyDriveError(httpError(403, reason))).toMatchObject({ retryable: true, authorization: false });
    },
  );

  it('un 403 por permisos es de autorización y no se reintenta', () => {
    expect(classifyDriveError(httpError(403, 'insufficientPermissions'))).toMatchObject({
      retryable: false,
      authorization: true,
    });
  });

  it('lee el motivo también desde el cuerpo de la respuesta', () => {
    const error = { response: { status: 403, data: { error: { errors: [{ reason: 'rateLimitExceeded' }] } } } };

    expect(classifyDriveError(error).retryable).toBe(true);
  });

  it('un 401 es de autorización', () => {
    expect(classifyDriveError(httpError(401))).toMatchObject({ retryable: false, authorization: true });
  });

  it('invalid_grant es de autorización, venga en el cuerpo o en el mensaje', () => {
    expect(
      classifyDriveError({ response: { status: 400, data: { error: 'invalid_grant' } } }),
    ).toMatchObject({ authorization: true, retryable: false, detail: 'invalid_grant' });
    expect(classifyDriveError(new Error('invalid_grant: Token has been expired or revoked'))).toMatchObject({
      authorization: true,
    });
  });

  it('un 404 se informa como no encontrado y no se reintenta', () => {
    expect(classifyDriveError(httpError(404))).toMatchObject({ notFound: true, retryable: false });
  });

  it.each(['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'])(
    'el error de red %s es transitorio',
    (code) => {
      expect(classifyDriveError({ code })).toMatchObject({ retryable: true, detail: code });
    },
  );

  it('un tiempo de espera agotado es transitorio', () => {
    expect(classifyDriveError(new Error('network timeout at: https://www.googleapis.com'))).toMatchObject({
      retryable: true,
      detail: 'timeout',
    });
  });

  it('un 400 u otro error inesperado no se reintenta', () => {
    expect(classifyDriveError(httpError(400))).toMatchObject({ retryable: false, authorization: false });
    expect(classifyDriveError(new TypeError('boom'))).toMatchObject({ retryable: false, authorization: false });
  });

  it.each([
    [{ response: { status: 400 }, errors: [{ reason: 'badRequest' }] }, 'status 400 (badRequest)'],
    [
      { response: { status: 403, data: { error: { errors: [{ reason: 'exportSizeLimitExceeded' }] } } } },
      'status 403 (exportSizeLimitExceeded)',
    ],
    [{ response: { status: 503 } }, 'status 503'],
  ])('el detalle lleva el motivo de Google cuando lo hay: %j → %s', (error, detail) => {
    expect(classifyDriveError(error).detail).toBe(detail);
  });

  it('no filtra el cuerpo de la respuesta en el detalle', () => {
    const error = { response: { status: 500, data: { secret: 'token-123' } } };

    expect(classifyDriveError(error).detail).toBe('status 500');
  });
});
