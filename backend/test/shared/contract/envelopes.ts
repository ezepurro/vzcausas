import type { Response } from 'supertest';

/**
 * Helpers de verificación del CONTRATO de la API
 * (`docs/Api-Contract/API_CONTRACT_V2.md` §5 y §6).
 *
 * Se usan dentro de los tests de integración: el test comprueba el
 * comportamiento (qué se persistió) y, con estos helpers, que la
 * respuesta HTTP respeta el contrato (status + forma del sobre).
 * Si el contrato cambia, se cambia acá y no en cada spec.
 */

/** `{ "data": { ... } }` — recurso individual (POST / PATCH / GET por id). */
export function expectData<T = Record<string, unknown>>(res: Response, status: number): T {
  expect(res.status).toBe(status);
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(res.body).toEqual({ data: expect.any(Object) });
  expect(Array.isArray(res.body.data)).toBe(false);
  return res.body.data as T;
}

/** `{ "data": [], "pagination": { page, limit, totalItems, totalPages } }` */
export function expectPaginated<T = Record<string, unknown>>(
  res: Response,
  expected?: Partial<{ page: number; limit: number; totalItems: number; totalPages: number }>,
): T[] {
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(res.body).toEqual({
    data: expect.any(Array),
    pagination: {
      page: expect.any(Number),
      limit: expect.any(Number),
      totalItems: expect.any(Number),
      totalPages: expect.any(Number),
    },
  });
  if (expected) expect(res.body.pagination).toMatchObject(expected);
  return res.body.data as T[];
}

/**
 * `{ "error": { code, message, details } }` — TODAS las respuestas de error.
 *
 * @param detailFields campos que deben aparecer en `details` (solo en
 *        `VALIDATION_ERROR`). Si se omite, se exige `details: null`.
 */
export function expectError(
  res: Response,
  status: number,
  code: string,
  detailFields?: string[],
): void {
  expect(res.status).toBe(status);
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(res.body).toEqual({
    error: {
      code,
      message: expect.any(String),
      details: detailFields ? expect.any(Object) : null,
    },
  });
  for (const field of detailFields ?? []) {
    expect(res.body.error.details).toHaveProperty([field], expect.any(String));
  }
}

/** `204 No Content`: sin cuerpo. */
export function expectNoContent(res: Response): void {
  expect(res.status).toBe(204);
  expect(res.text).toBe('');
}
