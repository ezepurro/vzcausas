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
}

export async function createCase(overrides: CreateCaseOverrides) {
  const initialState = await createInitialState('CRIMINAL');
  return getPrisma().case.create({
    data: {
      sacNumber: overrides.sacNumber ?? null,
      caption: overrides.caption ?? 'CAUSA PREVIA',
      jurisdictionId: initialState.jurisdictionId,
      proceduralRole: 'DEFENSA',
      clientId: overrides.clientId,
      responsibleLawyerId: overrides.responsibleLawyerId,
      startDate: new Date('2021-03-12T00:00:00.000Z'),
      currentStateId: initialState.stateId,
      createdByUserId: overrides.createdByUserId,
    },
  });
}
