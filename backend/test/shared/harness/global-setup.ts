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
