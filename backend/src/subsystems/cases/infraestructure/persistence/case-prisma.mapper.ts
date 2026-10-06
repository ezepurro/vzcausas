import {
  Case as PrismaCase,
  CaseLegalQualification as PrismaCaseLegalQualification,
  Jurisdiction as PrismaJurisdiction,
  LegalQualification as PrismaLegalQualification,
} from '../../../../generated/prisma/client';
import { AdministrativeCase } from '../../core/domain/entities/administrative';
import { Amparo } from '../../core/domain/entities/amparo';
import { Case, CaseProps } from '../../core/domain/entities/cases';
import { CriminalCase } from '../../core/domain/entities/criminal';
import { Offense } from '../../core/domain/entities/offense';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../core/domain/value-objects/procedural-role';

export type OffenseRow = PrismaCaseLegalQualification & { legalQualification: PrismaLegalQualification };

export type CaseRow = PrismaCase & {
  jurisdiction: PrismaJurisdiction;
  legalQualifications: OffenseRow[];
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
      currentStateId: row.currentStateId,
      currentCustomState: row.currentCustomState,
      currentProceduralActId: row.currentProceduralActId,
      // The timeline is not loaded here: registering a case never needs it.
      proceduralActs: [],
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
        });
      case JurisdictionCode.AMPARO:
        return Amparo.hydrate({ ...props, counterparty: row.counterparty, subjectMatter: row.subjectMatter ?? '' });
      default:
        return CriminalCase.hydrate({ ...props, offenses: row.legalQualifications.map(CasePrismaMapper.toOffense) });
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
    });
  }
}
