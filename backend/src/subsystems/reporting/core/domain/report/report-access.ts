import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError } from '@shared/domain/domain-error';

const ADMINISTRATOR_ROLE = 'ADMINISTRATOR';

/** Who may read the monthly report (§3.13): only the `ADMINISTRATOR`. Checked before anything is read, so a 403 comes before a 404. */
export class ReportAccess {
  /** @throws ForbiddenActionError `FORBIDDEN` */
  static assertAdministrator(actor: AuthenticatedUser): void {
    if (!actor.roleNames.includes(ADMINISTRATOR_ROLE)) {
      throw new ForbiddenActionError('FORBIDDEN', 'Se requiere el rol ADMINISTRATOR para realizar esta operación.');
    }
  }
}
