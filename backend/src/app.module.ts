import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '@shared/shared.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { HealthModule } from '@subsystems/health/health.module';
import { LegalParametersModule } from './subsystems/legal-parameters/legal-parameters.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    SharedModule,
    HealthModule,
    LegalParametersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
