import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '@shared/shared.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { IdentityModule } from './subsystems/identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    SharedModule,
    IdentityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
