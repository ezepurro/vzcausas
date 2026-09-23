import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '@shared/shared.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { IdentityModule } from './subsystems/identity/identity.module';
import { PeopleModule } from './subsystems/people/people.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    SharedModule,
    PeopleModule,
    IdentityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
