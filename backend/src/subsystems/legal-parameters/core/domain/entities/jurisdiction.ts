import { DayType } from './day-types';

export class Jurisdiction {
  private constructor(
    private readonly _id: number,
    private readonly _name: String,
    private readonly _dayTypeDefault: DayType,
    private _isActive: boolean,
  ) {}

  static create(props: { id: number; name: String; dayTypeDefault: DayType; active?: boolean }): Jurisdiction {
    return new Jurisdiction(props.id, props.name, props.dayTypeDefault, props.active ?? true);
  }
}
