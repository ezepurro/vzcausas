// infrastructure/persistence/mappers/procedural-state.mapper.ts
import { ProceduralState as PrismaProceduralState } from '../../../../generated/prisma/client';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';

export class ProceduralStateMapper {
  static toDomain(row: PrismaProceduralState): ProceduralState {
    return ProceduralState.construct({
      id: row.stateId,
      name: row.name,
      position: row.position,
      timeLimitDays: row.timeLimitDays,
      dayType: row.dayType as DayType | null,
      terminal: row.terminal,
      isActive: row.isActive,
      jurisdictionId: row.jurisdictionId,
      createdAt: row.createdAt,
    });
  }
}
