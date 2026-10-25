import { JwtService } from '@nestjs/jwt';
import { TestingModuleBuilder } from '@nestjs/testing';
import {
  ACCESS_TOKEN_VERIFIER,
  AccessTokenVerifier,
} from '@shared/domain/access-token-verifier.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK } from '@shared/domain/clock.port';
import { REFRESH_TOKEN_STORE } from '@subsystems/identity/core/domain/ports/refresh-token-store.port';
import { ROLE_REPOSITORY } from '@subsystems/identity/core/domain/ports/role.repository';
import { SESSION_INACTIVITY_SECONDS } from '@subsystems/identity/core/domain/ports/session-inactivity.port';
import { TOKEN_ISSUER } from '@subsystems/identity/core/domain/ports/token-issuer.port';
import { USER_REPOSITORY } from '@subsystems/identity/core/domain/ports/user.repository';
import { AccessTokenVerifierAdapter } from '@subsystems/identity/infrastructure/acl/access-token-verifier.adapter';

/** Claim que marca un token emitido por `loginAs` (y solo por él). */
export const TEST_ACTOR_CLAIM = 'testActor';

export interface TestActorClaim {
  roles: string[];
  lawyerId: number | null;
  permissions: string[];
}

/**
 * Verificador de tokens que usa el harness en lugar del real.
 *
 * El verificador de producción (`AccessTokenVerifierAdapter`) lee el
 * usuario, la sesión (`sid`) y los roles de la base en cada request.
 * `loginAs` existe justamente para NO depender de eso: arma un actor
 * con los roles y permisos que el test pide y prueba el guard, no la
 * matriz del seed (para eso los specs se loguean de verdad).
 *
 * Por eso este verificador tiene dos caminos:
 *
 * - Token de `loginAs` (firmado con el mismo secreto y con el claim
 *   {@link TEST_ACTOR_CLAIM}): el actor sale de los claims.
 * - Cualquier otro token (los que emite `POST /auth/login`): se delega
 *   en el verificador real, con todas sus validaciones (CA-1.6, CA-2.3,
 *   CA-6.2, CA-7.3). Los tests de sesión siguen probando lo de verdad.
 */
class TestAccessTokenVerifier implements AccessTokenVerifier {
  private readonly jwt = new JwtService({ secret: process.env.JWT_ACCESS_SECRET });

  constructor(private readonly real: AccessTokenVerifier) {}

  async verify(token: string): Promise<AuthenticatedUser> {
    let payload: { sub?: unknown; [TEST_ACTOR_CLAIM]?: TestActorClaim };
    try {
      payload = await this.jwt.verifyAsync(token, { algorithms: ['HS256'] });
    } catch {
      return this.real.verify(token); // rechaza con el 401 opaco de siempre
    }

    const actor = payload[TEST_ACTOR_CLAIM];
    if (!actor || typeof payload.sub !== 'number') return this.real.verify(token);

    return {
      userId: payload.sub,
      roleNames: actor.roles,
      lawyerId: actor.lawyerId,
      permissions: actor.permissions,
    };
  }
}

/** Reemplaza `ACCESS_TOKEN_VERIFIER` por {@link TestAccessTokenVerifier}. */
export function useTestAccessTokenVerifier(builder: TestingModuleBuilder): TestingModuleBuilder {
  return builder.overrideProvider(ACCESS_TOKEN_VERIFIER).useFactory({
    factory: (...deps: ConstructorParameters<typeof AccessTokenVerifierAdapter>) =>
      new TestAccessTokenVerifier(new AccessTokenVerifierAdapter(...deps)),
    inject: [
      TOKEN_ISSUER,
      USER_REPOSITORY,
      ROLE_REPOSITORY,
      REFRESH_TOKEN_STORE,
      CLOCK,
      SESSION_INACTIVITY_SECONDS,
    ],
  });
}
