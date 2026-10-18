import { getPrisma } from '../harness/test-app';

/**
 * Factory de actos procesales.
 *
 * - `createProceduralAct()` → PERSISTE un acto ya registrado (historial previo)
 *                             y, con `asCurrent`, lo deja como el vigente de
 *                             su causa, igual que lo deja el registro.
 *
 * Sirve para preparar "dado que la causa ya tiene un acto de tal fecha…" sin
 * pasar por la API que se está probando.
 */
export interface CreateProceduralActOverrides {
  caseId: number;
  registeredByUserId: number;
  registeredByLawyerId: number;
  /** Estado de la tabla. Excluyente con `customState`. */
  proceduralStateId?: number;
  customState?: string;
  /** Fecha civil `YYYY-MM-DD`. */
  actDate?: string;
  /** Si el acto pasa a ser el vigente de la causa (estado y acto vigente). */
  asCurrent?: boolean;
}

function civil(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export async function createProceduralAct(overrides: CreateProceduralActOverrides) {
  const prisma = getPrisma();
  const actDate = civil(overrides.actDate ?? '2026-09-30');
  const isCustom = overrides.customState !== undefined;

  const act = await prisma.proceduralAct.create({
    data: {
      caseId: overrides.caseId,
      proceduralStateId: isCustom ? null : (overrides.proceduralStateId ?? null),
      customState: overrides.customState ?? null,
      actDate,
      // Un acto previo sin plazo: no abre vencimiento.
      deadlineTimeLimitDays: 0,
      deadlineDayType: 'NONE',
      deadlineCountsFrom: actDate,
      registeredByUserId: overrides.registeredByUserId,
      registeredByLawyerId: overrides.registeredByLawyerId,
    },
  });

  if (overrides.asCurrent) {
    await prisma.case.update({
      where: { id: overrides.caseId },
      data: {
        currentStateId: act.proceduralStateId,
        currentCustomState: act.customState,
        currentProceduralActId: act.id,
      },
    });
  }
  return act;
}
