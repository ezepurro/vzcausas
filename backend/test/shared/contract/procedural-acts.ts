/**
 * Verificación de la FORMA de los recursos de actos procesales según el API
 * contract (`docs/openapi/components/schemas/*.yaml`).
 *
 * Comprueban lo que `toEqual` con matchers sueltos deja pasar: que el
 * recurso tenga **exactamente** las claves del contrato (ni de más ni de
 * menos), con el tipo y el formato que define cada una. Si un `.yaml`
 * cambia, se cambia acá y no en cada spec.
 */

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
// `date-time` con el desplazamiento horario del estudio (D-53): 2026-09-09T11:42:00-03:00
const DATE_TIME_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/;
const DAY_TYPES = ['BUSINESS', 'CONSECUTIVE', 'NONE'];

function expectExactKeys(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  expect(value).toEqual(expect.any(Object));
  expect(Object.keys(value as object).sort()).toEqual([...keys].sort());
}

function expectCivilDate(value: unknown): void {
  expect(typeof value).toBe('string');
  expect(value).toMatch(CIVIL_DATE);
}

function expectCivilDateOrNull(value: unknown): void {
  if (value !== null) expectCivilDate(value);
}

/** `Deadline.yaml`: el plazo que abre un acto. */
export function expectDeadlineShape(deadline: unknown): void {
  expectExactKeys(deadline, [
    'timeLimitDays',
    'dayType',
    'countsFrom',
    'computedDueDate',
    'dueDate',
    'manuallyAdjusted',
    'manualTimeLimitDays',
  ]);
  expect(Number.isInteger(deadline.timeLimitDays)).toBe(true);
  expect(deadline.timeLimitDays as number).toBeGreaterThanOrEqual(0);
  expect(DAY_TYPES).toContain(deadline.dayType);
  expectCivilDate(deadline.countsFrom);
  expectCivilDateOrNull(deadline.computedDueDate);
  expectCivilDate(deadline.dueDate); // en `Deadline.yaml` el vencimiento vigente nunca es nulo
  expect(typeof deadline.manuallyAdjusted).toBe('boolean');
  // D-86: entero no negativo si se ajustó a mano con plazo de tabla; `null` en otro caso.
  if (deadline.manualTimeLimitDays !== null) {
    expect(deadline.manuallyAdjusted).toBe(true);
    expect(Number.isInteger(deadline.manualTimeLimitDays)).toBe(true);
    expect(deadline.manualTimeLimitDays as number).toBeGreaterThanOrEqual(0);
  }
}

/**
 * `ProceduralAct.yaml`: el acto registrado, con la forma exacta del
 * contrato. `expected` fija los valores que le importan al test; el resto
 * (`id`, `registeredBy`, `registeredAt`) se comprueba solo por tipo/formato
 * salvo que se pasen.
 */
export function expectProceduralAct(data: unknown, expected: Record<string, unknown> = {}): Record<string, any> {
  expectExactKeys(data, [
    'id',
    'caseId',
    'resultingState',
    'actDate',
    'notificationDate',
    'notes',
    'deadline',
    'registeredBy',
    'registeredAt',
  ]);
  expect(Number.isInteger(data.id)).toBe(true);
  expect(Number.isInteger(data.caseId)).toBe(true);

  // ResultingState.yaml
  expectExactKeys(data.resultingState, ['proceduralStateId', 'name', 'custom']);
  const state = data.resultingState;
  expect(state.proceduralStateId === null || Number.isInteger(state.proceduralStateId)).toBe(true);
  expect(typeof state.name).toBe('string');
  expect(typeof state.custom).toBe('boolean');
  // `custom` y `proceduralStateId` son excluyentes: un estado escrito a mano no tiene id de la tabla.
  expect(state.custom).toBe(state.proceduralStateId === null);

  expectCivilDate(data.actDate);
  expectCivilDateOrNull(data.notificationDate);
  expect(data.notes === null || typeof data.notes === 'string').toBe(true);

  // `deadline` es `null` u objeto de `Deadline.yaml`.
  if (data.deadline !== null) expectDeadlineShape(data.deadline);

  // UserSummary.yaml
  expectExactKeys(data.registeredBy, ['id', 'lastName', 'firstName']);
  expect(Number.isInteger(data.registeredBy.id)).toBe(true);
  expect(typeof data.registeredBy.lastName).toBe('string');
  expect(typeof data.registeredBy.firstName).toBe('string');

  expect(data.registeredAt).toMatch(DATE_TIME_WITH_OFFSET);

  expect(data).toMatchObject(expected);
  return data;
}

/** `DeadlinePreview.yaml`: el vencimiento calculado sin registrar el acto. */
export function expectDeadlinePreview(data: unknown, expected: Record<string, unknown> = {}): Record<string, any> {
  expectExactKeys(data, [
    'proceduralStateId',
    'timeLimitDays',
    'dayType',
    'countsFrom',
    'dueDate',
    'businessDaysRemaining',
  ]);
  expect(Number.isInteger(data.proceduralStateId)).toBe(true);
  expect(Number.isInteger(data.timeLimitDays)).toBe(true);
  expect(data.timeLimitDays as number).toBeGreaterThanOrEqual(0);
  expect(DAY_TYPES).toContain(data.dayType);
  expectCivilDate(data.countsFrom);
  expectCivilDateOrNull(data.dueDate);
  expect(data.businessDaysRemaining === null || Number.isInteger(data.businessDaysRemaining)).toBe(true);
  // Se calculan juntos: o hay vencimiento y días que restan, o ninguno de los dos.
  expect(data.dueDate === null).toBe(data.businessDaysRemaining === null);

  expect(data).toMatchObject(expected);
  return data;
}
