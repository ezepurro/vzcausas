import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError } from '@shared/domain/domain-error';

/** Profiles that manage formal templates (matrix §5.1). */
const ALLOWED_ROLES = ['ADMINISTRATOR', 'LAWYER'];

/**
 * Formal templates are for administrators and lawyers, to read as much as to
 * register (CA-34.8, CA-35.7): the first resource whose **reading** is not
 * open to the three profiles. A user with several roles passes if one of them
 * is allowed.
 *
 * @throws {ForbiddenActionError} 403 `FORBIDDEN`.
 */
export function assertCanManageTemplates(actor: AuthenticatedUser): void {
  if (!actor.roleNames.some((role) => ALLOWED_ROLES.includes(role))) {
    throw new ForbiddenActionError(
      'FORBIDDEN',
      'Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.',
    );
  }
}
