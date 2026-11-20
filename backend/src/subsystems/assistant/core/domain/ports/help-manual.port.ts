import { HelpManual } from '../value-objects/help-manual.vo';

export const HELP_MANUAL = Symbol('HELP_MANUAL');

/** Where the manual comes from: files today, maybe Drive or a table later (plan §9). */
export interface HelpManualPort {
  load(): Promise<HelpManual>;
}
