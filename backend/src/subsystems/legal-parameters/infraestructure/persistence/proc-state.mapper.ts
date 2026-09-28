import {
  Jurisdiction as PrismaJurisdiction,
  ProceduralState as PrismaProceduralState,
} from '../../../../generated/prisma/client';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
import { JurisdictionMapper } from './jurisdiction.mapper';

/** A `procedural_states` row loaded with its jurisdiction (`include: { jurisdiction: true }`). */
type ProceduralStateRow = PrismaProceduralState & { jurisdiction: PrismaJurisdiction };

export class ProceduralStateMapper {
  static toDomain(row: ProceduralStateRow): ProceduralState {
    return ProceduralState.hydrate({
      id: row.stateId,
      name: row.name,
      position: row.position,
      timeLimitDays: row.timeLimitDays,
      dayType: row.dayType as DayType | null,
      terminal: row.terminal,
      isActive: row.isActive,
      jurisdiction: JurisdictionMapper.toDomain(row.jurisdiction),
      createdAt: row.createdAt,
    });
  }
}
