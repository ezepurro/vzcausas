import { getPrisma } from '../harness/test-app';
import { createInitialState } from './procedural-state.factory';

/**
 * Factory de causas.
 *
 * - `aCaseBody()`  → arma el CUERPO de `POST /cases` (no toca la base). Una
 *                    causa penal válida; el test fija con `overrides` lo que
 *                    le importa. Los ids del cliente y del abogado no tienen
 *                    valor por defecto: los crea quien llama.
 * - `createCase()` → PERSISTE una causa penal en el estado inicial del fuero.
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
  /** Fuero de la causa. Por defecto, penal. */
  jurisdiction?: 'CRIMINAL' | 'ADMINISTRATIVE';
  /**
   * Estado en el que está la causa. Por defecto, el inicial de su fuero. Con un
   * estado terminal queda cerrada; para un estado escrito a mano usar
   * `currentCustomState`.
   */
  currentStateId?: number;
  currentCustomState?: string;
}

/**
 * PERSISTE una causa. Sin overrides, una causa penal en el estado inicial
 * ("Iniciada"). Una causa administrativa lleva el objeto del reclamo, que ese
 * fuero exige. Un acto vigente no se pasa acá: se crea con `createProceduralAct`,
 * que además lo deja apuntado desde la causa.
 */
export async function createCase(overrides: CreateCaseOverrides) {
  const jurisdiction = overrides.jurisdiction ?? 'CRIMINAL';
  const initialState = await createInitialState(jurisdiction);
  const isAdministrative = jurisdiction === 'ADMINISTRATIVE';
  const inCustomState = overrides.currentCustomState !== undefined;

  return getPrisma().case.create({
    data: {
      sacNumber: overrides.sacNumber ?? null,
      caption: overrides.caption ?? 'CAUSA PREVIA',
      jurisdictionId: initialState.jurisdictionId,
      proceduralRole: isAdministrative ? 'RECURRENTE' : 'DEFENSA',
      subjectMatter: isAdministrative ? 'Se impugna la resolución que deniega la cobertura.' : null,
      clientId: overrides.clientId,
      responsibleLawyerId: overrides.responsibleLawyerId,
      startDate: new Date('2021-03-12T00:00:00.000Z'),
      // Exactamente uno de los dos (CHECK de la base).
      currentStateId: inCustomState ? null : (overrides.currentStateId ?? initialState.stateId),
      currentCustomState: overrides.currentCustomState ?? null,
      createdByUserId: overrides.createdByUserId,
    },
  });
}
