import { ConfigService } from '@nestjs/config';

/**
 * An optional numeric variable of the assistant: `fallback` when it is absent
 * or empty, and a startup error when it is not a positive integer. Each
 * adapter reads its own variables with it (`ARQUITECTURA_BACKEND_V1.md` §7.6).
 */
export function positiveIntFromConfig(config: ConfigService, name: string, fallback: number): number {
  const raw = config.get<string>(name);
  const value = raw === undefined || String(raw).trim() === '' ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} debe ser un entero positivo, llegó "${raw}".`);
  }
  return value;
}
