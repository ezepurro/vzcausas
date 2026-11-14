import type { Config } from 'jest';
import base from './jest-integration.config';

/**
 * Corrida completa de integración con el grafo de `AppModule` cargado una
 * sola vez.
 *
 * Es la misma configuración que `jest-integration.config.ts` (mismo harness,
 * misma base compartida, mismos alias); solo cambia QUÉ archivo de test
 * busca: la entrada `run-all.entry.ts`, que requiere todas las suites en un
 * único registro de módulos. Por qué y qué implica: `test/run-all.entry.ts`.
 *
 * Para correr una suite suelta o filtrar por ruta sigue sirviendo
 * `jest-integration.config.ts` (`npm run test:int -- <patrón>`).
 */
const config: Config = {
  ...base,
  displayName: 'integration-all',
  testMatch: ['<rootDir>/test/run-all.entry.ts'],
};

export default config;
