import { DayType } from './day-types';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';

export interface JurisdictionProps {
  id: number;
  code: JurisdictionCode;
  dayTypeDefault: DayType;
  isActive: boolean;
}

/**
 * Jurisdiction (fuero). Aggregate root of `legal-parameters`: procedural
 * states belong to one jurisdiction (RN4).
 */
export class Jurisdiction {
  private constructor(private readonly props: JurisdictionProps) {}

  /** Rebuilds a {@link Jurisdiction} from persisted data, without validation. */
  static hydrate(props: JurisdictionProps): Jurisdiction {
    return new Jurisdiction(props);
  }

  get id(): number {
    return this.props.id;
  }

  get code(): JurisdictionCode {
    return this.props.code;
  }

  get dayTypeDefault(): DayType {
    return this.props.dayTypeDefault;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
