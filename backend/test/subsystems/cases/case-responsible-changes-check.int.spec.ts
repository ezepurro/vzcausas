import { INestApplication } from '@nestjs/common';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU27 · Cambios de responsable (D-147): lo que solo la base puede probar.
 *
 * `ck_case_responsible_changes_differs` exige que el abogado anterior y el nuevo sean distintos
 * (`previous_lawyer_id IS DISTINCT FROM new_lawyer_id`): nunca los dos nulos ni el mismo. Se prueba
 * con SQL directo porque la entidad ya los rechaza antes de llegar a la base (plan
 * `tests-historial-responsable.md`, fila 2).
 */
describe('ck_case_responsible_changes_differs', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const CONSTRAINT = /ck_case_responsible_changes_differs|check constraint|23514/i;

  const insert = (previous: number | null, next: number | null) =>
    getPrisma().$executeRawUnsafe(
      `INSERT INTO case_responsible_changes (case_id, previous_lawyer_id, new_lawyer_id, changed_by_user_id, origin, changed_at)
       VALUES (${s.caseRow.id}, ${previous ?? 'NULL'}, ${next ?? 'NULL'}, ${s.user.id}, 'MANUAL', now())`,
    );
  const count = () => getPrisma().caseResponsibleChange.count({ where: { caseId: s.caseRow.id } });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await resetProceduralActData();
    await stopTestApp();
  });

  beforeEach(async () => {
    s = await setUpProceduralActScenario();
  });

  it('rechaza los dos abogados nulos, y no guarda nada', async () => {
    await expect(insert(null, null)).rejects.toThrow(CONSTRAINT);

    expect(await count()).toBe(0);
  });

  it('rechaza el mismo abogado antes y después, y no guarda nada', async () => {
    await expect(insert(s.lawyer.id, s.lawyer.id)).rejects.toThrow(CONSTRAINT);

    expect(await count()).toBe(0);
  });

  it.each<[string, (s: ProceduralActScenario) => [number | null, number | null]]>([
    ['de un abogado a otro', (sc) => [sc.lawyer.id, sc.otherLawyer.id]],
    ['de un abogado a ninguno (huérfana)', (sc) => [sc.lawyer.id, null]],
    ['de ninguno a un abogado (huérfana que recibe)', (sc) => [null, sc.otherLawyer.id]],
  ])('acepta %s', async (_name, lawyers) => {
    await insert(...lawyers(s));

    expect(await count()).toBe(1);
  });
});
