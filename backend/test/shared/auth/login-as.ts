import { JwtService } from '@nestjs/jwt';
import { TEST_ACTOR_CLAIM, TestActorClaim } from './test-access-token-verifier';

/**
 * Genera el header `Authorization` para un usuario de test, sin pasar
 * por `POST /auth/login`. Así cada test de un endpoint protegido prepara
 * su actor en una línea y no depende del flujo de login.
 *
 * Firma con el mismo secreto que la app (`JWT_ACCESS_SECRET`, definido en
 * `global-setup.ts`). El verificador real lee usuario, sesión y roles de
 * la base, así que el token lleva el actor en el claim `testActor` y el
 * harness lo resuelve con `TestAccessTokenVerifier` (ver
 * `test-access-token-verifier.ts`), sin filas en la base.
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
  const claim: TestActorClaim = {
    roles: actor.roles ?? ['ADMINISTRATOR'],
    lawyerId: actor.lawyerId ?? null,
    permissions: actor.permissions ?? [],
  };
  const token = jwt.sign(
    { sub: actor.userId ?? 1, [TEST_ACTOR_CLAIM]: claim },
    { expiresIn: '15m' },
  );
  return { Authorization: `Bearer ${token}` };
}

/** Atajos para los actores más comunes. */
export const asAdmin = () => loginAs({ roles: ['ADMINISTRATOR'] });
export const asSecretary = () => loginAs({ roles: ['SECRETARY'] });
