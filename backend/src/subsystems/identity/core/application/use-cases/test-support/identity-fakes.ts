import { Role } from "../../../domain/entities/role.entity";
import { User } from "../../../domain/entities/user.entity";
import { LawyerLookupPort } from "../../../domain/ports/lawyer-lookup.port";
import { PasswordHasher } from "../../../domain/ports/password-hasher.port";
import { RoleRepository } from "../../../domain/ports/role.repository";
import { UserRepository } from "../../../domain/ports/user.repository";
import { Email } from "../../../domain/value-objects/email.vo";
import { Permission } from "../../../domain/value-objects/permission.vo";
import { Username } from "../../../domain/value-objects/username.vo";

/**
 * In-memory fakes shared by `identity`'s use-case specs (no NestJS,
 * no database — see EJEMPLO_CASO_DE_USO.md's testing guidance).
 */
export class FakeHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

export class FakeUserRepository implements UserRepository {
  private nextIdValue = 1;
  readonly byId = new Map<number, User>();
  readonly byUsername = new Map<string, User>();
  readonly byEmail = new Map<string, User>();
  readonly created: User[] = [];

  async findByUsername(username: Username): Promise<User | null> {
    return this.byUsername.get(username.toString()) ?? null;
  }
  async findById(id: number): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
  async save(): Promise<void> {}
  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }
  async existsByUsername(username: Username): Promise<boolean> {
    return this.byUsername.has(username.toString());
  }
  async existsByEmail(email: Email): Promise<boolean> {
    return this.byEmail.has(email.toString());
  }
  async create(user: User): Promise<void> {
    this.created.push(user);
    this.byId.set(user.id, user);
    this.byUsername.set(user.username.toString(), user);
    this.byEmail.set(user.email.toString(), user);
  }
}

export class FakeRoleRepository implements RoleRepository {
  private readonly roles = [
    Role.create({ id: 1, name: "ADMINISTRATOR", permissions: [] }),
    Role.create({ id: 2, name: "LAWYER", permissions: [] }),
    Role.create({
      id: 3,
      name: "SECRETARY",
      permissions: [Permission.create("case:read")],
    }),
  ];

  async findByIds(ids: readonly number[]): Promise<Role[]> {
    return this.roles.filter((role) => ids.includes(role.getId()));
  }
  async findByNames(names: readonly string[]): Promise<Role[]> {
    return this.roles.filter((role) => names.includes(role.getName()));
  }
}

export class FakeLawyerLookup implements LawyerLookupPort {
  constructor(private readonly existingIds: readonly number[] = []) {}
  async existsById(lawyerId: number): Promise<boolean> {
    return this.existingIds.includes(lawyerId);
  }
}
