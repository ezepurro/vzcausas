import { JwtService } from '@nestjs/jwt';

/**
 * Genera el header `Authorization` para un usuario de test, sin pasar
 * por `POST /auth/login`. Así cada test de un endpoint protegido prepara
 * su actor en una línea y no depende del flujo de login.
 *
 * Firma con el mismo secreto que la app (`JWT_ACCESS_SECRET`, definido en
 * `global-setup.ts`) y los mismos claims que emite `JwtTokenIssuerAdapter`
 * (`sub` numérico, `roles[]`, `lawyerId`, `permissions[]`).
 */
export type TestRole = 'ADMINISTRATOR' | 'LAWYER' | 'SECRETARY';

export interface TestActor {
  userId?: number;
  roles?: TestRole[];
  lawyerId?: number | null;
  permissions?: string[];
}

export function loginAs(actor: TestActor = {}): { Authorization: string } {
  const jwt = new JwtService({ secret: process.env.JWT_ACCESS_SECRET });
  const token = jwt.sign(
    {
      sub: actor.userId ?? 1,
      roles: actor.roles ?? ['ADMINISTRATOR'],
      lawyerId: actor.lawyerId ?? null,
      permissions: actor.permissions ?? [],
    },
    { expiresIn: '15m' },
  );
  return { Authorization: `Bearer ${token}` };
}

/** Atajos para los actores más comunes. */
export const asAdmin = () => loginAs({ roles: ['ADMINISTRATOR'] });
export const asSecretary = () => loginAs({ roles: ['SECRETARY'] });
