// backend/scripts/documents-setup-storage.ts
// Herramienta a pedido (después de `npm run google:authorize`): crea la
// estructura de carpetas del estudio en Google Drive y la registra en la base:
// "VZ Causas", "VZ Causas/Modelos formales" (con una subcarpeta por fuero:
// "Penal", "Administrativo" y "Amparo") y "VZ Causas/Causas". Ya no es
// obligatoria: la app hace lo mismo sola al arrancar y cuando le falta la
// estructura (`StorageBootstrap`, `AssureSpace`, `RegisterDocumentTemplate`).
// Si el estudio ya tenía las tres carpetas base, solo agrega las subcarpetas.
//
// No tiene lógica propia: arranca la aplicación sin servidor HTTP y le pide al
// caso de uso `SetupCloudStorage` que haga el trabajo. Es idempotente, así que
// correrlo de nuevo no duplica nada.
//
// Usa la misma configuración (.env) y el mismo cliente OAuth que el servidor:
// con el permiso `drive.file` Drive solo muestra lo que creó ese mismo cliente.
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SetupCloudStorage } from '../src/subsystems/documents/core/application/use-cases/setup-cloud-storage.use-case';
import { DOCUMENT_STORAGE } from '../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    // Con el almacenamiento en memoria (sin GOOGLE_OAUTH_* en el .env) se
    // guardarían en la base ids de carpetas que no existen en ningún Drive.
    if (app.get(DOCUMENT_STORAGE) instanceof InMemoryDocumentStorage) {
      throw new Error(
        'Falta configurar Google Drive: cargá GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET y ' +
          'GOOGLE_OAUTH_REFRESH_TOKEN en el .env (ver `npm run google:authorize`).',
      );
    }
    const report = await app.get(SetupCloudStorage).execute();
    console.table(report.map(({ kind, name, outcome, cloudFolderId }) => ({ kind, name, outcome, cloudFolderId })));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
