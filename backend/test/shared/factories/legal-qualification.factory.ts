import { getPrisma } from '../harness/test-app';

/**
 * Factory de calificaciones legales.
 *
 * - `createLegalQualification()` → PERSISTE una calificación vigente. El
 *   nombre es único entre las vigentes, por eso lleva un contador.
 */
export interface CreateLegalQualificationOverrides {
  name?: string;
  prescriptionMonths?: number;
  active?: boolean;
}

let sequence = 0;

export async function createLegalQualification(overrides: CreateLegalQualificationOverrides = {}) {
  sequence += 1;
  return getPrisma().legalQualification.create({
    data: {
      name: overrides.name ?? `Robo calificado ${sequence} — art. 167 inc. 2 CP`,
      prescriptionMonths: overrides.prescriptionMonths ?? 96,
      active: overrides.active ?? true,
    },
  });
}
