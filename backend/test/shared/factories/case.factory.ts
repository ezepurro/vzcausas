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
  // Datos propios de cada fuero (D-67).
  clientDetained?: boolean;
  injunctionGranted?: boolean;
  harmfulActDate?: string;
  harmfulActRenews?: boolean;
  harmfulActRenewalDays?: number;
  harmfulActTermDays?: number;
  harmfulActTermDayType?: string;
  administrativeRemedyExhaustedOn?: string;
  courtFeePaid?: boolean;
  createFolder?: boolean;
  copyTemplates?: boolean;
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
  jurisdiction?: 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO';
  /** Acto lesivo de un amparo (D-67). Ignorado en los otros fueros. */
  harmfulAct?: {
    date: string;
    renews?: { everyDays: number };
    termDays: number;
    termDayType: 'BUSINESS' | 'CONSECUTIVE';
  };
  /**
   * Estado en el que está la causa. Por defecto, el inicial de su fuero. Con un
   * estado terminal queda cerrada; para un estado escrito a mano usar
   * `currentCustomState`.
   */
  currentStateId?: number;
  currentCustomState?: string;
  /**
   * Una causa ya marcada como prescripta (HU33), como la deja la marca: las cinco
   * columnas juntas (CHECK de la base). Combinarlo con `currentStateId` del estado
   * "Prescripta".
   */
  prescriptionDeclaration?: {
    prescriptionDate: string;
    resolution: string;
    registeredByUserId: number;
    registeredAt: Date;
  };
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
  const isAmparo = jurisdiction === 'AMPARO';
  const harmfulAct = isAmparo ? overrides.harmfulAct : undefined;
  const inCustomState = overrides.currentCustomState !== undefined;

  return getPrisma().case.create({
    data: {
      sacNumber: overrides.sacNumber ?? null,
      caption: overrides.caption ?? 'CAUSA PREVIA',
      jurisdictionId: initialState.jurisdictionId,
      proceduralRole: isAdministrative ? 'RECURRENTE' : isAmparo ? 'ACTORA' : 'DEFENSA',
      subjectMatter: isAdministrative
        ? 'Se impugna la resolución que deniega la cobertura.'
        : isAmparo
          ? 'Que se ordene la cobertura integral del tratamiento.'
          : null,
      // Datos propios del fuero (D-67), como los deja el alta.
      clientDetained: jurisdiction === 'CRIMINAL' ? false : null,
      injunctionGranted: isAmparo ? false : null,
      harmfulActRenews: isAmparo ? harmfulAct?.renews !== undefined : null,
      harmfulActRenewalDays: harmfulAct?.renews?.everyDays ?? null,
      harmfulActDate: harmfulAct ? new Date(`${harmfulAct.date}T00:00:00.000Z`) : null,
      harmfulActTermDays: harmfulAct?.termDays ?? null,
      harmfulActTermDayType: harmfulAct?.termDayType ?? null,
      clientId: overrides.clientId,
      responsibleLawyerId: overrides.responsibleLawyerId,
      startDate: new Date('2021-03-12T00:00:00.000Z'),
      // Exactamente uno de los dos (CHECK de la base).
      currentStateId: inCustomState ? null : (overrides.currentStateId ?? initialState.stateId),
      currentCustomState: overrides.currentCustomState ?? null,
      createdByUserId: overrides.createdByUserId,
      prescriptionDate: overrides.prescriptionDeclaration
        ? new Date(`${overrides.prescriptionDeclaration.prescriptionDate}T00:00:00.000Z`)
        : null,
      prescriptionResolution: overrides.prescriptionDeclaration?.resolution ?? null,
      prescriptionRegisteredByUserId: overrides.prescriptionDeclaration?.registeredByUserId ?? null,
      prescriptionRegisteredAt: overrides.prescriptionDeclaration?.registeredAt ?? null,
    },
  });
}
