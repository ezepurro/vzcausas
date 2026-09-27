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

/**
 * Procedural state of a jurisdiction's lifecycle (RN4). Holds the
 * {@link Jurisdiction} it belongs to as an object, not as a name.
 */
export class ProceduralState {
  private constructor(private readonly props: ProceduralStateProps) {}

  /** Rebuilds a {@link ProceduralState} from persisted data, without validation. */
  static hydrate(props: ProceduralStateProps): ProceduralState {
    return new ProceduralState(props);
  }

  static create(props: ProceduralStateProps): ProceduralState {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError('INVALID_PROCEDURAL_STATE', 'El identificador del estado procesal debe ser un entero positivo.');
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('INVALID_PROCEDURAL_STATE', 'El estado procesal debe tener una denominación.');
    }

    return new ProceduralState(props);
  }

  get id(): number {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get position(): number {
    return this.props.position;
  }

  get timeLimitDays(): number {
    return this.props.timeLimitDays;
  }

  get dayType(): DayType | null {
    return this.props.dayType;
  }

  get terminal(): boolean {
    return this.props.terminal;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get jurisdiction(): Jurisdiction {
    return this.props.jurisdiction;
  }

  get createdAt(): Date | null {
    return this.props.createdAt;
  }
}
