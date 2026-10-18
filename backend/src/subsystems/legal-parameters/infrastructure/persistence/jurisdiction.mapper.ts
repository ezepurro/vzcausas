import { Jurisdiction as PrismaJurisdiction } from '../../../../generated/prisma/client';
import { Jurisdiction } from '@subsystems/legal-parameters/core/domain/entities/jurisdiction';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';

export class JurisdictionMapper {
  static toDomain(row: PrismaJurisdiction): Jurisdiction {
    return Jurisdiction.hydrate({
      id: row.jurisdictionId,
      code: row.name as JurisdictionCode,
      dayTypeDefault: row.dayTypeDefault as DayType,
      isActive: row.isActive,
    });
  }
}
