import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
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
 * @param extraImports opcional: módulos que `AppModule` no registra por sí solo.
 *
 * El almacenamiento documental es SIEMPRE el de memoria: nunca se le pega a
 * Google Drive desde un test, aunque el `.env` de la máquina tenga las
 * credenciales. Un spec puede reemplazarlo de nuevo en `customize`.
 *
 * El verificador de tokens se reemplaza siempre por uno que acepta los
 * tokens de `loginAs` y delega el resto en el real (ver
 * `test-access-token-verifier.ts`).
 */
export async function startTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
  extraImports: ModuleMetadata['imports'] = [],
): Promise<INestApplication> {
  const moduleRef = await customize(
    // Never Google Drive in a test, even on a machine whose `.env` has the
    // credentials: the storage is always the in-memory one unless the spec
    // replaces it again in `customize`.
    useTestAccessTokenVerifier(
      Test.createTestingModule({ imports: [AppModule, ...extraImports] }),
    )
      .overrideProvider(DOCUMENT_STORAGE)
      .useClass(InMemoryDocumentStorage),
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
