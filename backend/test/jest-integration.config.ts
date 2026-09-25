import type { Config } from 'jest';

/**
 * Configuración de la suite de integración.
 *
 * Cada spec levanta la app NestJS completa contra un PostgreSQL real
 * (Testcontainers) y, en el mismo test, verifica el contrato de la API
 * (`docs/Api-Contract/API_CONTRACT_V2.md`). Ver `test/README.md`.
 */
const config: Config = {
  displayName: 'integration',
  rootDir: process.cwd(),
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.int.spec.ts'],
  testTimeout: 30000,
  // Todos los specs comparten una sola base: se ejecutan en serie.
  maxWorkers: 1,
  globalSetup: '<rootDir>/test/shared/harness/global-setup.ts',
  globalTeardown: '<rootDir>/test/shared/harness/global-teardown.ts',
  clearMocks: true,
  verbose: true,
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Mismos alias que tsconfig.json (D-09).
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@subsystems/(.*)$': '<rootDir>/src/subsystems/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/test/tsconfig.json' }],
  },
};

export default config;
