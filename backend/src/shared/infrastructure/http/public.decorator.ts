import { CustomDecorator, SetMetadata } from "@nestjs/common";

/** Metadata key read by `JwtAuthGuard`. */
export const IS_PUBLIC_KEY = "auth:isPublic";

/**
 * Marks a route as reachable without authentication.
 *
 * Authentication is enforced globally (D-56), so this decorator is the
 * only way out. That direction is deliberate: forgetting it leaves a
 * new route protected and the mistake surfaces on the first call,
 * whereas an opt-in scheme would leave a forgotten route wide open and
 * silent.
 *
 * Applies to `POST /auth/login` and `POST /auth/refresh`, the two
 * endpoints the contract marks as "Autenticación requerida: No"
 * (§3.1). Refresh is public because the access token is expected to be
 * expired by the time it is called — the credential is the cookie, and
 * the use case authorizes it.
 */
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC_KEY, true);
