import { DayType } from './day-types';
import { Jurisdiction } from './jurisdiction';
import { ValidationError } from '@shared/domain/domain-error';

export class ProceduralState {
  private constructor(
    private readonly _id: number,
    private _name: String,
    private _dayType: DayType,
    private _timeLimitDays: number,
    private _position: number,
    private _isActive: boolean,
    private jurisdiction: Jurisdiction,
  ) {}

  static create(props: {
    id: number;
    name: String;
    dayType: DayType;
    jurisdiction: Jurisdiction;
    active?: boolean;
    position: number;
    timeLimitDays: number;
  }): ProceduralState {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError('INVALID_PROCEDURAL_STATE', 'Procedural State id must be a positive integer.');
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('INVALID_PROCEDURAL_STATE', 'Procedural State must have a non-empty name.');
    }

    return new ProceduralState(
      props.id,
      props.name,
      props.dayType,
      props.timeLimitDays,
      props.position,
      props.active ?? true,
      props.jurisdiction,
    );
  }
}
