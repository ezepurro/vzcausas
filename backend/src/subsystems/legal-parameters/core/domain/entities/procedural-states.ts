import { DayType } from './day-types';
import { Jurisdiction } from './jurisdiction';
import { ValidationError } from '@shared/domain/domain-error';

export interface ProceduralStateProps {
  id: number;
  name: string;
  position: number;
  timeLimitDays: number;
  dayType: DayType | null;
  terminal: boolean;
  isActive: boolean;
  jurisdiction: Jurisdiction;
  createdAt: Date | null;
}

export class ProceduralState {
  private constructor(private readonly props: ProceduralStateProps) {}

  static construct(props: ProceduralStateProps): ProceduralState {
    return new ProceduralState(props);
  }

  static create(props: ProceduralStateProps): ProceduralState {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError('INVALID_PROCEDURAL_STATE', 'Procedural State id must be a positive integer.');
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('INVALID_PROCEDURAL_STATE', 'Procedural State must have a non-empty name.');
    }

    return new ProceduralState(props);
  }
}
