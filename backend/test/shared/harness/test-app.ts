import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { PrismaService } from '../../../src/shared/infrastructure/prisma/prisma.service';

let app: INestApplication | undefined;

/**
 * Levanta la aplicación completa (AppModule) con la MISMA configuración
 * HTTP que producción (`configureApp`: prefijo `/api/v1`, ValidationPipe…).
 * Se llama en `beforeAll` de cada spec.
 *
 * @param customize opcional: permite reemplazar adaptadores EXTERNOS
 *        (correo, Google Drive…) por fakes con `overrideProvider`.
 *        La base de datos nunca se reemplaza: es real.
 */
export async function startTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<INestApplication> {
  const moduleRef = await customize(Test.createTestingModule({ imports: [AppModule] })).compile();

  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return app;
}

/** Cierra la app y la conexión a la base. Se llama en `afterAll`. */
export async function stopTestApp(): Promise<void> {
  await app?.close();
  app = undefined;
}

/** Acceso directo a la base, para preparar datos y verificar lo persistido. */
export function getPrisma(): PrismaService {
  if (!app) throw new Error('La app de test no está iniciada: llamá a startTestApp() en beforeAll.');
  return app.get(PrismaService);
}
