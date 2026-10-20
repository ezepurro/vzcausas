import {
  Case as PrismaCase,
  Jurisdiction as PrismaJurisdiction,
  LegalQualification as PrismaLegalQualification,
  Offense as PrismaOffense,
  ProceduralAct as PrismaProceduralAct,
} from '../../../../generated/prisma/client';
import { AdministrativeCase } from '../../core/domain/entities/administrative';
import { Amparo } from '../../core/domain/entities/amparo';
import { Case, CaseProps } from '../../core/domain/entities/cases';
import { CriminalCase } from '../../core/domain/entities/criminal';
import { Offense } from '../../core/domain/entities/offense';
import { ProceduralActPrismaMapper } from './procedural-act-prisma.mapper';
import { DayType } from '../../core/domain/value-objects/day-type';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../core/domain/value-objects/procedural-role';

export type OffenseRow = PrismaOffense & { legalQualification: PrismaLegalQualification };

export type CaseRow = PrismaCase & {
  jurisdiction: PrismaJurisdiction;
  offenses: OffenseRow[];
  // The act that led the case to its current state; the rest of the timeline is not loaded.
  currentProceduralAct: PrismaProceduralAct | null;
};

export class CasePrismaMapper {
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
