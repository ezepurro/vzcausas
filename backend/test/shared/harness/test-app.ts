import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { PrismaService } from '../../../src/shared/infrastructure/prisma/prisma.service';
import { useTestAccessTokenVerifier } from '../auth/test-access-token-verifier';

let app: INestApplication | undefined;

/**
 * Levanta la aplicación completa (AppModule) con la MISMA configuración
 * HTTP que producción (`configureApp`: prefijo `/api/v1`, ValidationPipe…).
 * Se llama en `beforeAll` de cada spec.
 *
 * @param customize opcional: permite reemplazar adaptadores EXTERNOS
 *        (correo, Google Drive…) por fakes con `overrideProvider`.
 *        La base de datos nunca se reemplaza: es real.
 *
 * El verificador de tokens se reemplaza siempre por uno que acepta los
 * tokens de `loginAs` y delega el resto en el real (ver
 * `test-access-token-verifier.ts`).
 */
export async function startTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<INestApplication> {
  const moduleRef = await customize(
    useTestAccessTokenVerifier(Test.createTestingModule({ imports: [AppModule] })),
  ).compile();

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
