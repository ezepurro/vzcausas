import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { setContainer } from './container-registry';

/**
 * Variables de entorno de la suite. Se aplican solo si no vienen definidas,
 * para que la app arranque sin depender del `.env` de desarrollo.
 */
const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'test-access-secret-with-at-least-32-bytes!!',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  BCRYPT_COST: '4', // bajo a propósito: acelera los tests
  COOKIE_REFRESH_NAME: 'refresh_token',
  COOKIE_REFRESH_PATH: '/api/v1/auth',
  COOKIE_REFRESH_SAMESITE: 'Lax',
  COOKIE_SECURE: 'false',
  APP_TIMEZONE: 'America/Argentina/Cordoba',

  /*
   * Bloqueo progresivo (Q-03). Umbrales bajos y escalones cortos a
   * propósito: un test que tenga que fallar 5 veces para ver el
   * bloqueo paga 5 hashes de bcrypt, y uno que tenga que esperar 90
   * segundos reales no es un test. Con umbral 3 y escalera 1s/2s, un
   * spec de integración ejercita el bloqueo Y su liberación en
   * milisegundos.
   *
   * Un spec que quiera otros valores los define antes de levantar su
   * app: estas solo se aplican si no vienen ya definidas.
   */
  LOGIN_LOCK_THRESHOLD: '3',
  LOGIN_LOCK_WINDOW: '15m',
  LOGIN_LOCK_LADDER: '1s,2s',
  LOGIN_LOCK_USER_THRESHOLD: '25',
  LOGIN_LOCK_USER_WINDOW: '1h',
  LOGIN_LOCK_USER_LADDER: '1s',

  /*
   * Generoso (igual al recomendado de producción) y NO corto como el
   * bloqueo de arriba: a diferencia de LOGIN_LOCK_*, casi ningún test
   * quiere ejercitar esto, y un valor corto por defecto haría que
   * cualquier spec de integración algo lento (arranque, round-trips a
   * la base) fallara al azar con un 401 de "sesión inactiva" que no
   * tiene nada que ver con lo que ese test prueba. El spec que sí
   * quiera probar CA-1.6 define su propio valor antes de levantar su
   * app, igual que ya se documenta arriba para LOGIN_LOCK_*.
   */
  SESSION_INACTIVITY_TTL: '30m',

  /*
   * Per-IP throttle (Q-03). Deliberately generous, same reasoning as
   * SESSION_INACTIVITY_TTL above: the suite's own request volume
   * against a single shared app instance must never be mistaken for
   * abuse. `supertest` also has no real socket IP the way a browser
   * would, so every request in a run likely shares one bucket anyway
   * — another reason these need headroom, not tightness.
   */
  THROTTLE_DEFAULT_LIMIT: '100000',
  THROTTLE_DEFAULT_WINDOW: '1m',
  THROTTLE_AUTH_LIMIT: '100000',
  THROTTLE_AUTH_WINDOW: '1m',

  /*
   * `DeadlinesModule` (HU30/HU32) solo se importa a `AppModule` si estas 5
   * variables están presentes (`app.module.ts:37-55`) — sin ellas, la
   * suite de integración arrancaría sin el endpoint
   * `/internal/deadlines/daily-run` y `daily-run.int.spec.ts` no tendría
   * nada que probar. Los valores son inventados: `GoogleOAuthClientService`
   * (`shared/infrastructure/google/google-oauth-client.service.ts`) solo
   * los guarda en memoria al construirse, sin pegarle a Google — y el spec
   * de integración reemplaza `EMAIL_SENDER` por `InMemoryEmailSender`
   * (`test/shared/fakes/email-sender.fake.ts`), así que `GmailApiEmailAdapter`
   * nunca llega a usarlos de verdad.
   */
  GOOGLE_OAUTH_CLIENT_ID: 'test-client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_OAUTH_REFRESH_TOKEN: 'test-refresh-token',
  MANAGEMENT_MAILBOX: 'gestion@test.vzcausas.local',
  INTERNAL_TRIGGER_SECRET: 'test-internal-trigger-secret',
};

/**
 * Se ejecuta UNA vez por corrida, antes de cualquier spec:
 * levanta un PostgreSQL efímero, aplica las migraciones y deja
 * `DATABASE_URL` apuntando a él.
 */
export default async function globalSetup(): Promise<void> {
  // Misma versión que docker/postgres/Dockerfile.
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  setContainer(container);

  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] ??= value;
  }
  // Siempre se pisa: nunca se corre contra la base de desarrollo.
  process.env.DATABASE_URL = container.getConnectionUri();

  const backendRoot = join(__dirname, '..', '..', '..');

  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  });

  // Los roles son datos de referencia: no los crea ningún endpoint, así
  // que sin esto la base de test queda con el catálogo vacío y cualquier
  // login termina en 500 al no poder resolver los roles del usuario.
  execSync('npx prisma db seed', {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  });
}
