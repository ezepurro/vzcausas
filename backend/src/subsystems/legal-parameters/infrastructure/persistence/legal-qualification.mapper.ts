import { LegalQualification as PrismaLegalQualification } from '../../../../generated/prisma/client';
import { LegalQualification } from '@subsystems/legal-parameters/core/domain/entities/legal-qualification';

export class LegalQualificationMapper {
  static toDomain(row: PrismaLegalQualification): LegalQualification {
    return LegalQualification.hydrate({
      id: row.id,
      name: row.name,
      prescriptionMonths: row.prescriptionMonths,
      isActive: row.active,
      createdAt: row.createdAt,
    });
  }
}
