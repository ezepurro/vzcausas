import { getPrisma } from '../harness/test-app';
import { createInitialState } from './procedural-state.factory';

/**
 * Factory de causas.
 *
 * - `aCaseBody()`  → arma el CUERPO de `POST /cases` (no toca la base). Una
 *                    causa penal válida; el test fija con `overrides` lo que
 *                    le importa. Los ids del cliente y del abogado no tienen
 *                    valor por defecto: los crea quien llama.
 * - `createCase()` → PERSISTE una causa penal; por defecto en el estado
 *                    inicial del fuero.
 * - `createProceduralAct()` → PERSISTE un acto procesal de una causa y lo
 *                    deja como su acto vigente (de él sale el vencimiento).
 */
export interface CaseBody {
  jurisdiction: 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO';
  sacNumber?: string;
  caption: string;
  court?: string;
  instructorName?: string;
  tribunalPhone?: string;
  instructorExtension?: string;
  clientId: number;
  proceduralRole: string;
  legalQualifications?: { legalQualificationId: number; offenseDate?: string }[];
  counterparty?: string;
  subjectMatter?: string;
  responsibleLawyerId: number;
  startDate?: string;
}

export function aCaseBody(
  required: { clientId: number; responsibleLawyerId: number },
  overrides: Partial<CaseBody> = {},
): CaseBody {
  return {
    jurisdiction: 'CRIMINAL',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    proceduralRole: 'DEFENSA',
    ...required,
    ...overrides,
  };
}

export interface CreateCaseOverrides {
  clientId: number;
  responsibleLawyerId: number;
  createdByUserId: number;
  sacNumber?: string | null;
  caption?: string;
  /** Estado procesal actual (penal). Por defecto, el inicial "Iniciada". */
  currentStateId?: number;
  /** Estado escrito a mano. Excluye a `currentStateId` (CHECK de la base). */
  currentCustomState?: string;
  active?: boolean;
}

export async function createCase(overrides: CreateCaseOverrides) {
  const initialState = await createInitialState('CRIMINAL');
  const customState = overrides.currentCustomState ?? null;
  return getPrisma().case.create({
    data: {
      sacNumber: overrides.sacNumber ?? null,
      caption: overrides.caption ?? 'CAUSA PREVIA',
      jurisdictionId: initialState.jurisdictionId,
      proceduralRole: 'DEFENSA',
      clientId: overrides.clientId,
      responsibleLawyerId: overrides.responsibleLawyerId,
      startDate: new Date('2021-03-12T00:00:00.000Z'),
      // La base exige exactamente uno de los dos (`num_nonnulls = 1`).
      currentStateId: customState === null ? (overrides.currentStateId ?? initialState.stateId) : null,
      currentCustomState: customState,
      active: overrides.active ?? true,
      createdByUserId: overrides.createdByUserId,
    },
  });
}

export interface CreateProceduralActOverrides {
  caseId: number;
  proceduralStateId: number;
  registeredByUserId: number;
  registeredByLawyerId: number;
  /** Copia del plazo del estado al momento del registro. */
  deadlineTimeLimitDays?: number;
  deadlineDayType?: 'BUSINESS' | 'CONSECUTIVE' | 'NONE';
  /** Fecha civil `YYYY-MM-DD`. */
  actDate?: string;
  deadlineComputedDueDate?: string | null;
}

/**
 * Por defecto, un acto del 01/09/2026 que abrió 5 días hábiles con
 * vencimiento el 08/09/2026. Los valores del plazo no se calculan: se
 * guardan tal cual, que es lo que hace falta para verificar que nada los
 * recalcule después.
 */
export async function createProceduralAct(overrides: CreateProceduralActOverrides) {
  const actDate = new Date(`${overrides.actDate ?? '2026-09-01'}T00:00:00.000Z`);
  const dueDate = overrides.deadlineComputedDueDate === undefined ? '2026-09-08' : overrides.deadlineComputedDueDate;

  const act = await getPrisma().proceduralAct.create({
    data: {
      caseId: overrides.caseId,
      proceduralStateId: overrides.proceduralStateId,
      actDate,
      deadlineTimeLimitDays: overrides.deadlineTimeLimitDays ?? 5,
      deadlineDayType: overrides.deadlineDayType ?? 'BUSINESS',
      deadlineCountsFrom: actDate,
      deadlineComputedDueDate: dueDate === null ? null : new Date(`${dueDate}T00:00:00.000Z`),
      registeredByUserId: overrides.registeredByUserId,
      registeredByLawyerId: overrides.registeredByLawyerId,
    },
  });

  // Lo deja como acto vigente y lleva la causa a su estado, como lo haría
  // el registro de un acto.
  await getPrisma().case.update({
    where: { id: overrides.caseId },
    data: { currentProceduralActId: act.id, currentStateId: overrides.proceduralStateId, currentCustomState: null },
  });

  return act;
}
