import {
  Case as PrismaCase,
  Jurisdiction as PrismaJurisdiction,
  LegalQualification as PrismaLegalQualification,
  Offense as PrismaOffense,
  ProceduralAct as PrismaProceduralAct,
  ProceduralState as PrismaProceduralState,
} from '../../../../../generated/prisma/client';
import { AdministrativeCase } from '../../../core/domain/entities/case/administrative-case.entity';
import { Amparo } from '../../../core/domain/entities/case/amparo.entity';
import { Case, CaseProps } from '../../../core/domain/entities/case/case.entity';
import { CriminalCase } from '../../../core/domain/entities/case/criminal-case.entity';
import { Offense } from '../../../core/domain/entities/case/offense.entity';
import { ProceduralActPrismaMapper } from './procedural-act-prisma.mapper';
import { CaseDeactivation } from '../../../core/domain/value-objects/case/case-deactivation.vo';
import { DayType } from '../../../core/domain/value-objects/deadline/day-type';
import { JurisdictionCode } from '../../../core/domain/value-objects/case/jurisdiction-code';
import { PrescriptionDeclaration } from '../../../core/domain/value-objects/prescription/prescription-declaration.vo';
import { ProceduralRole } from '../../../core/domain/value-objects/case/procedural-role';

export type OffenseRow = PrismaOffense & { legalQualification: PrismaLegalQualification };

export type CaseRow = PrismaCase & {
  jurisdiction: PrismaJurisdiction;
  offenses: OffenseRow[];
  // The state the case is in; `null` for a hand-written state.
  currentState: PrismaProceduralState | null;
  // The act that led the case to its current state; the rest of the timeline is not loaded.
  currentProceduralAct: PrismaProceduralAct | null;
};

export class CasePrismaMapper {
  /**
   * The declaration of HU33 from its columns, or `null` while the case was not
   * marked. HU33 writes them all at once and the `ck_cases_prescription_*` CHECKs
   * keep them together, so a date without the rest is corrupt data.
   */
  private static toPrescriptionDeclaration(row: PrismaCase): PrescriptionDeclaration | null {
    if (row.prescriptionDate === null) {
      return null;
    }
    if (row.prescriptionResolution === null || row.prescriptionRegisteredByUserId === null || row.prescriptionRegisteredAt === null) {
      throw new Error(`Case ${row.id} has a prescription date but an incomplete prescription declaration.`);
    }
    return PrescriptionDeclaration.hydrate({
      prescriptionDate: row.prescriptionDate,
      resolution: row.prescriptionResolution,
      grounds: row.prescriptionGrounds,
      registeredByUserId: row.prescriptionRegisteredByUserId,
      registeredAt: row.prescriptionRegisteredAt,
    });
  }

  /**
   * The record of the baja from its columns, or `null` while the case is in
   * force. `ck_cases_deactivation_coherent` keeps them together with `active`.
   */
  private static toDeactivation(row: PrismaCase): CaseDeactivation | null {
    if (row.active) {
      return null;
    }
    if (row.deactivatedAt === null || row.deactivatedByUserId === null) {
      throw new Error(`Case ${row.id} is given de baja but its deactivation record is incomplete.`);
    }
    return CaseDeactivation.hydrate({
      reason: row.deactivationReason,
      deactivatedByUserId: row.deactivatedByUserId,
      deactivatedAt: row.deactivatedAt,
    });
  }

  static toDomain(row: CaseRow): Case {
    const props: CaseProps = {
      id: row.id,
      sacNumber: row.sacNumber,
      caption: row.caption,
      court: row.court,
      jurisdictionId: row.jurisdictionId,
      proceduralRole: row.proceduralRole as ProceduralRole,
      instructor: { name: row.instructorName, phone: row.instructorPhone, extension: row.instructorExtension },
      clientId: row.clientId,
      responsibleLawyerId: row.responsibleLawyerId,
      startDate: row.startDate,
      courtFeePaid: row.courtFeePaid,
      currentStateId: row.currentStateId,
      currentCustomState: row.currentCustomState,
      currentProceduralActId: row.currentProceduralActId,
      // A hand-written state has no row in the table, and never closes the case.
      currentStateTerminal: row.currentState?.terminal ?? false,
      // Only the current act is loaded: registering an act needs it to tell whether the new one is older.
      proceduralActs: row.currentProceduralAct ? [ProceduralActPrismaMapper.toDomain(row.currentProceduralAct)] : [],
      active: row.active,
      deactivation: CasePrismaMapper.toDeactivation(row),
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    switch (row.jurisdiction.name as JurisdictionCode) {
      case JurisdictionCode.ADMINISTRATIVE:
        return AdministrativeCase.hydrate({
          ...props,
          counterparty: row.counterparty,
          subjectMatter: row.subjectMatter ?? '',
          administrativeRemedyExhaustedOn: row.administrativeRemedyExhaustedOn,
        });
      case JurisdictionCode.AMPARO:
        return Amparo.hydrate({
          ...props,
          counterparty: row.counterparty,
          subjectMatter: row.subjectMatter ?? '',
          injunctionGranted: row.injunctionGranted ?? false,
          harmfulActDate: row.harmfulActDate,
          harmfulActRenews: row.harmfulActRenews ?? false,
          harmfulActRenewalDays: row.harmfulActRenewalDays,
          harmfulActTermDays: row.harmfulActTermDays,
          harmfulActTermDayType: row.harmfulActTermDayType as DayType | null,
        });
      default:
        return CriminalCase.hydrate({
          ...props,
          offenses: row.offenses.map(CasePrismaMapper.toOffense),
          clientDetained: row.clientDetained ?? false,
          prescriptionDeclaration: CasePrismaMapper.toPrescriptionDeclaration(row),
        });
    }
  }

  private static toOffense(row: OffenseRow): Offense {
    return Offense.hydrate({
      legalQualification: {
        id: row.legalQualification.id,
        name: row.legalQualification.name,
        prescriptionMonths: row.legalQualification.prescriptionMonths,
      },
      offenseDate: row.offenseDate,
      prescriptionExpiresOn: row.prescriptionDate,
      prescriptionDeclaration: CasePrismaMapper.toOffensePrescriptionDeclaration(row),
    });
  }

  /**
   * The declaration that the offense prescribed (D-113), or `null` while it was
   * not declared. The `ck_offenses_prescription_*` CHECKs keep the columns
   * together, as in `cases`, so a date without the rest is corrupt data.
   */
  private static toOffensePrescriptionDeclaration(row: OffenseRow): PrescriptionDeclaration | null {
    if (row.prescriptionDeclaredOn === null) {
      return null;
    }
    if (row.prescriptionResolution === null || row.prescriptionRegisteredByUserId === null || row.prescriptionRegisteredAt === null) {
      throw new Error(
        `The offense ${row.legalQualificationId} of case ${row.caseId} has a declared date but an incomplete prescription declaration.`,
      );
    }
    return PrescriptionDeclaration.hydrate({
      prescriptionDate: row.prescriptionDeclaredOn,
      resolution: row.prescriptionResolution,
      grounds: row.prescriptionGrounds,
      registeredByUserId: row.prescriptionRegisteredByUserId,
      registeredAt: row.prescriptionRegisteredAt,
    });
  }
}
