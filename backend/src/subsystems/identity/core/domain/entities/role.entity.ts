import { ValidationError } from "@shared/domain/domain-error";
import { Permission } from "../value-objects/permission.vo";

/**
 * A role groups a set of {@link Permission}s under a name
 * (`ADMINISTRADOR`, `ABOGADO`, `SECRETARIA`). Roles are seeded and
 * effectively immutable at runtime for the auth scope; write
 * operations belong to HU4 and beyond.
 *
 * A role is loaded on login, on refresh, and on every subsequent
 * request (`AccessTokenVerifierAdapter`) so its permissions can be
 * resolved fresh each time — not embedded into the access token, which
 * would let a revoked role keep working until the token expired
 * (CA-6.2).
 */
export class Role {
  private constructor(
    private readonly _id: number,
    private readonly _name: string,
    private readonly _permissions: readonly Permission[],
  ) {}

  /**
   * Rehydration path used by the repository. Trusts the persisted
   * data and skips creation-time invariants.
   */
  static hydrate(props: {
    id: number;
    name: string;
    permissions: readonly Permission[];
  }): Role {
    return new Role(props.id, props.name, props.permissions);
  }

  /**
   * Creation-time factory that enforces basic invariants (positive
   * integer id, non-empty name). Intended for role administration
   * (out of the current auth scope) so new roles added later go
   * through the same checks.
   *
   * @throws {ValidationError} if the id is not a positive integer or
   *   the name is empty / whitespace-only.
   */
  static create(props: {
    id: number;
    name: string;
    permissions: readonly Permission[];
  }): Role {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError(
        "INVALID_ROLE",
        "Role id must be a positive integer.",
      );
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError("INVALID_ROLE", "Role must have a name.");
    }

    return new Role(props.id, props.name, props.permissions);
  }

  getId(): number {
    return this._id;
  }

  getName(): string {
    return this._name;
  }

  /** Returns the permission names as plain strings. */
  getPermissions(): string[] {
    return this._permissions.map((p) => p.getName());
  }
}
