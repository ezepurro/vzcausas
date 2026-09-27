import { DayType } from './day-types';
import { ProceduralState } from './procedural-states';

export interface JurisdictionProps {
  id: number;
  name: string;
  dayTypeDefault: DayType;
  isActive: boolean;
}

export class Jurisdiction {
  private constructor(private readonly props: JurisdictionProps) {}

  static create(props: JurisdictionProps): Jurisdiction {
    return new Jurisdiction(props);
  }
}
