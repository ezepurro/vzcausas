import { ConfigService } from '@nestjs/config';
import { HelpAssistantProfile } from '../../core/domain/profiles/help-assistant.profile';
import { positiveIntFromConfig } from './positive-int';

/** Default model of the help profile: the cheapest stable Flash on Gemini's free tier (20/11/2026). */
export const DEFAULT_HELP_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_HELP_MAX_OUTPUT_TOKENS = 2048;

/**
 * The help profile with its configurable parts: `ASSISTANT_HELP_MODEL` and
 * `ASSISTANT_HELP_MAX_OUTPUT_TOKENS`. The rules stay in the domain
 * (`help-assistant.profile.ts`); only what changes per deploy is read here.
 */
export function createHelpProfile(config: ConfigService): HelpAssistantProfile {
  return HelpAssistantProfile.create({
    model: config.get<string>('ASSISTANT_HELP_MODEL')?.trim() || DEFAULT_HELP_MODEL,
    maxOutputTokens: positiveIntFromConfig(config, 'ASSISTANT_HELP_MAX_OUTPUT_TOKENS', DEFAULT_HELP_MAX_OUTPUT_TOKENS),
  });
}
