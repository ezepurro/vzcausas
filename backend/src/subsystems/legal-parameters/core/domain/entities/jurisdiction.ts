import { DayType } from './day-types';

export class Jurisdiction {
  private constructor(
    private readonly _id: number,
    private readonly _name: String,
    private readonly _dayTypeDefault: DayType,
    private _isActive: boolean,
  ) {}
}
