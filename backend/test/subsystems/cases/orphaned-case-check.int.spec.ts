import { INestApplication } from '@nestjs/common';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU15 · Causa huérfana (D-143): lo que solo la base puede probar.
 *
 * `ck_cases_orphaned_coherent` exige las dos cosas juntas: responsable nulo si y solo
 * si hay `orphaned_at`. No hay endpoint que deje huérfana una causa todavía (llega con
 * `DELETE /lawyers/{lawyerId}`), así que el CHECK se prueba con SQL directo.
 */
describe('ck_cases_orphaned_coherent', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const ORPHANED_AT = '2026-11-17T12:00:00.000Z';
  const CONSTRAINT = /ck_cases_orphaned_coherent|check constraint|23514/i;

  const update = (set: string) =>
    getPrisma().$executeRawUnsafe(`UPDATE cases SET ${set} WHERE id = ${s.caseRow.id}`);
  const stored = () =>
    getPrisma().case.findUniqueOrThrow({
      where: { id: s.caseRow.id },
      select: { responsibleLawyerId: true, orphanedAt: true },
    });

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

  it('rechaza dejar la causa sin responsable si no se registra desde cuándo, y no cambia nada', async () => {
    await expect(update('responsible_lawyer_id = NULL')).rejects.toThrow(CONSTRAINT);

    expect(await stored()).toEqual({ responsibleLawyerId: s.lawyer.id, orphanedAt: null });
  });

  it('acepta dejarla sin responsable con orphaned_at, vigente y con su estado procesal intacto', async () => {
    await update(`responsible_lawyer_id = NULL, orphaned_at = '${ORPHANED_AT}'`);

    expect(await stored()).toEqual({ responsibleLawyerId: null, orphanedAt: new Date(ORPHANED_AT) });
    const row = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
    expect(row.active).toBe(true);
    expect(row.currentStateId).toBe(s.caseRow.currentStateId);
    expect(row.currentCustomState).toBe(s.caseRow.currentCustomState);
  });

  it('rechaza orphaned_at en una causa que conserva su responsable, y no cambia nada', async () => {
    await expect(update(`orphaned_at = '${ORPHANED_AT}'`)).rejects.toThrow(CONSTRAINT);

    expect(await stored()).toEqual({ responsibleLawyerId: s.lawyer.id, orphanedAt: null });
  });
});
