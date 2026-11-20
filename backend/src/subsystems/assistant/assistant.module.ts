import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ClockModule } from '@shared/infrastructure/clock/clock.module';
import { AskHelpAssistant } from './core/application/use-cases/ask-help-assistant.use-case';
import { ASSISTANT_QUOTA } from './core/domain/ports/assistant-quota.port';
import { HELP_MANUAL, HelpManualPort } from './core/domain/ports/help-manual.port';
import { LLM_PORT } from './core/domain/ports/llm.port';
import { HELP_PROFILE } from './core/domain/profiles/assistant-profile';
import { createHelpProfile } from './infrastructure/config/help-profile.factory';
import { HelpAssistantController } from './infrastructure/http/controllers/help-assistant.controller';
import { createLlmProvider } from './infrastructure/llm/llm-provider.factory';
import { FileHelpManual } from './infrastructure/manual/file-help-manual.adapter';
import { InMemoryAssistantQuota } from './infrastructure/persistence/in-memory/in-memory-assistant-quota';

/**
 * The assistant subsystem (plan §3). `AppModule` loads it only when
 * `ASSISTANT_LLM_PROVIDER` is set: without it the app runs exactly as before
 * and `/help/assistant` does not exist.
 *
 * Composition only: which implementation goes behind each port. Each adapter
 * reads its own configuration (`ARQUITECTURA_BACKEND_V1.md` §7.6). Talks to no
 * other subsystem: the help assistant reads no data of the firm.
 */
@Module({
  imports: [ClockModule],
  controllers: [HelpAssistantController],
  providers: [
    AskHelpAssistant,
    { provide: LLM_PORT, useFactory: createLlmProvider, inject: [ConfigService] },
    { provide: HELP_MANUAL, useFactory: () => new FileHelpManual() },
    { provide: HELP_PROFILE, useFactory: createHelpProfile, inject: [ConfigService] },
    {
      provide: ASSISTANT_QUOTA,
      useFactory: (clock: ClockPort, config: ConfigService) => InMemoryAssistantQuota.fromConfig(clock, config),
      inject: [CLOCK, ConfigService],
    },
  ],
})
export class AssistantModule implements OnModuleInit {
  constructor(@Inject(HELP_MANUAL) private readonly manual: HelpManualPort) {}

  /** A broken manual stops the app here, not on the first question. */
  async onModuleInit(): Promise<void> {
    await this.manual.load();
  }
}
