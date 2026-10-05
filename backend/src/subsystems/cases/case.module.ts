import { Module } from '@nestjs/common';

/**
 * Composition root of `cases`. It declares nothing yet: the repository and
 * the lookups of `people` and `legal-parameters` are bound here once their
 * adapters exist, together with the use cases and the controller.
 */
@Module({})
export class CasesModule {}
