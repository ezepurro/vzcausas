import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '../../../../../generated/prisma/client';
import {
  CriminalCasePrescriptionRow,
  CriminalPrescriptionQueryPort,
} from '../../../core/domain/ports/prescription/criminal-prescription-query.port';
import { JurisdictionCode } from '../../../core/domain/value-objects/case/jurisdiction-code';
import { ACTIVE_CASE } from './prisma-case.repository';

/** Only the columns the prescription is computed from, plus what the notice shows. */
const PRESCRIPTION_SELECT = {
  id: true,
  caption: true,
  sacNumber: true,
  responsibleLawyerId: true,
  offenses: {
    select: {
      offenseDate: true,
      // D-113: a declared offense no longer governs, and no later act restarts it.
      prescriptionDeclaredOn: true,
      legalQualification: { select: { id: true, name: true, prescriptionMonths: true } },
    },
  },
  // Every act, by its date (CA-31.4): whether one restarts an offense depends on
  // the ones before it (D-113). Same order as `CASE_INCLUDE` in
  // `prisma-case.repository.ts`, so both reads compute the same.
  interruptiveActs: {
    select: { actDate: true },
    orderBy: [{ actDate: 'asc' }, { id: 'asc' }],
  },
} as const satisfies Prisma.CaseSelect;

/**
 * Prisma-backed {@link CriminalPrescriptionQueryPort} (HU52).
 *
 * The definition of an active case is **not** written here: it is
 * {@link ACTIVE_CASE}, the same one every `activeCases` of the contract and the
 * dashboards use, so the daily check reviews exactly the cases they count.
 * This only adds the two conditions of the port: the `CRIMINAL` jurisdiction
 * and at least one offense.
 *
 * One query for all the cases, with their interruptive acts as a relation: the
 * number of queries does not grow with the number of cases.
 * The qualification is read whether it is active or not — a deactivated one
 * still governs the prescription of the cases that registered it (RN12).
 */
@Injectable()
export class CriminalPrescriptionQueryPrismaAdapter implements CriminalPrescriptionQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveWithQualifications(): Promise<CriminalCasePrescriptionRow[]> {
    const rows = await this.prisma.db.case.findMany({
      where: {
        ...ACTIVE_CASE,
        jurisdiction: { name: JurisdictionCode.CRIMINAL },
        offenses: { some: {} },
      },
      select: PRESCRIPTION_SELECT,
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({
      caseId: row.id,
      caption: row.caption,
      sacNumber: row.sacNumber,
      responsibleLawyerId: row.responsibleLawyerId,
      offenses: row.offenses.map((offense) => ({
        legalQualificationId: offense.legalQualification.id,
        legalQualificationName: offense.legalQualification.name,
        prescriptionMonths: offense.legalQualification.prescriptionMonths,
        offenseDate: offense.offenseDate,
        prescriptionDeclaredOn: offense.prescriptionDeclaredOn,
      })),
      interruptiveActDates: row.interruptiveActs.map((act) => act.actDate),
    }));
  }
}
