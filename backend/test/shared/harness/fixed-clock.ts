import { TestingModuleBuilder } from '@nestjs/testing';
import { CLOCK, ClockPort } from '../../../src/shared/domain/clock.port';

/**
 * Reloj fijo para los specs cuyo resultado depende del día: vencimientos,
 * días hábiles que restan, fecha del registro.
 *
 * "Hoy" es el martes 6/10/2026 en Córdoba (las 12:30). Es un reemplazo del
 * reloj, no de la base: los datos siguen saliendo de PostgreSQL.
 */
export const FIXED_NOW = new Date('2026-10-06T15:30:00.000Z');

/** Fecha civil del estudio: medianoche UTC, como se lee una columna `date`. */
export const FIXED_TODAY = new Date('2026-10-06T00:00:00.000Z');

export const fixedClock: ClockPort = {
  now: () => FIXED_NOW,
  today: () => FIXED_TODAY,
};

/** Para `startTestApp(withFixedClock)`. */
export function withFixedClock(builder: TestingModuleBuilder): TestingModuleBuilder {
  return builder.overrideProvider(CLOCK).useValue(fixedClock);
}

/** Una fecha civil, como la guarda una columna `date`: `civil('2026-10-05')`. */
export function civil(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
