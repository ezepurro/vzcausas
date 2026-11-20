import { HelpManual } from '../value-objects/help-manual.vo';

export const HELP_PROFILE = Symbol('HELP_PROFILE');

/**
 * One configuration of the assistant service (plan §3): what model it uses,
 * how long it may answer and what it is told. The help assistant is one
 * profile; the drafting assistant will be another, next to it in this folder.
 */
export interface AssistantProfile {
  readonly model: string;
  readonly maxOutputTokens: number;
  instructions(manual: HelpManual): string;
}
