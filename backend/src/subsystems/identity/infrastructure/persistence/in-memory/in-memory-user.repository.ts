import { Injectable } from "@nestjs/common";
import { User } from "@subsystems/identity/core/domain/entities/user.entity";
import { UserRepository } from "@subsystems/identity/core/domain/ports/user.repository";
import { Username } from "@subsystems/identity/core/domain/value-objects/username.vo";

/**
 * Transitional {@link UserRepository} implementation backed by a
 * `Map`. Ships as a production adapter — not a test fake (D-48) — so
 * the HTTP layer can be exercised end to end before the Prisma schema
 * exists. P-15 replaces it with `PrismaUserRepository`.
 *
 * State lives in process memory: it is lost on restart and not shared
 * between instances. That is acceptable precisely because the
 * replacement is already scheduled.
 *
 * The store starts empty (D-44). No user is hardcoded, so nobody can
 * authenticate until {@link InMemoryUserRepository.seed} is called at
 * bootstrap or HU4's `POST /users` lands. The initial data seed is
 * deliberately out of this scope and coordinated with HU4.
 */
@Injectable()
export class InMemoryUserRepository implements UserRepository {
  /**
   * Single source of truth, keyed by id. The username index below
   * points into this same set of aggregates.
   */
  private readonly byId = new Map<number, User>();

  /**
   * Secondary index for the login lookup. Keys are the *normalized*
   * username (D-17: trimmed and lowercased by the value object), so
   * `Admin` and `admin` resolve to the same entry.
   */
  private readonly byUsername = new Map<string, User>();

  /**
   * Bootstrap hook, deliberately outside the {@link UserRepository}
   * contract (D-44): the port describes what the use cases need, and
   * no use case seeds data. Intended for dev bootstrap and E2E
   * fixtures. The Prisma adapter will not have an equivalent — its
   * data comes from migrations and HU4's endpoints.
   */
  seed(user: User): void {
    this.index(user);
  }

  async findByUsername(username: Username): Promise<User | null> {
    return this.byUsername.get(username.toString()) ?? null;
  }

  async findById(id: number): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    // Re-indexing on every save keeps the username index consistent
    // even though the current aggregate cannot change its username.
    // HU4 may add that capability; this way the repository does not
    // silently rot when it does.
    this.index(user);
  }

  private index(user: User): void {
    this.byId.set(user.id, user);
    this.byUsername.set(user.username.toString(), user);
  }
}
