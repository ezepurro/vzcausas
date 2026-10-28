import {
  Case as PrismaCase,
  Jurisdiction as PrismaJurisdiction,
  LegalQualification as PrismaLegalQualification,
  Offense as PrismaOffense,
  ProceduralAct as PrismaProceduralAct,
  ProceduralState as PrismaProceduralState,
} from '../../../../../generated/prisma/client';
import { AdministrativeCase } from '../../../core/domain/entities/administrative';
import { Amparo } from '../../../core/domain/entities/amparo';
import { Case, CaseProps } from '../../../core/domain/entities/cases';
import { CriminalCase } from '../../../core/domain/entities/criminal';
import { Offense } from '../../../core/domain/entities/offense';
import { ProceduralActPrismaMapper } from './procedural-act-prisma.mapper';
import { DayType } from '../../../core/domain/value-objects/day-type';
import { JurisdictionCode } from '../../../core/domain/value-objects/jurisdiction-code';
import { PrescriptionDeclaration } from '../../../core/domain/value-objects/prescription-declaration.vo';
import { ProceduralRole } from '../../../core/domain/value-objects/procedural-role';

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
    });
  }
}
