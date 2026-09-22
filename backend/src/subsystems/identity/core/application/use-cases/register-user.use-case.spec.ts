import { Role } from "../../domain/entities/role.entity";
import { User } from "../../domain/entities/user.entity";
import {
  EmailAlreadyExistsError,
  InvalidRoleError,
  LawyerLinkNotAllowedError,
  LawyerLinkRequiredError,
  LawyerNotFoundError,
  UsernameAlreadyExistsError,
} from "../../domain/errors/identity.errors";
import { LawyerLookupPort } from "../../domain/ports/lawyer-lookup.port";
import { PasswordHasher } from "../../domain/ports/password-hasher.port";
import { RoleRepository } from "../../domain/ports/role.repository";
import { UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import { Permission } from "../../domain/value-objects/permission.vo";
import { Username } from "../../domain/value-objects/username.vo";
import { RegisterUserUseCase } from "./register-user.use-case";

class FakeHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

class FakeUserRepository implements UserRepository {
  private nextIdValue = 1;
  readonly byUsername = new Map<string, User>();
  readonly byEmail = new Map<string, User>();
  readonly created: User[] = [];

  async findByUsername(username: Username): Promise<User | null> {
    return this.byUsername.get(username.toString()) ?? null;
  }
  async findById(): Promise<User | null> {
    return null;
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
    this.byUsername.set(user.username.toString(), user);
    this.byEmail.set(user.email.toString(), user);
  }
}

class FakeRoleRepository implements RoleRepository {
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

class FakeLawyerLookup implements LawyerLookupPort {
  constructor(private readonly existingIds: readonly number[] = []) {}
  async existsById(lawyerId: number): Promise<boolean> {
    return this.existingIds.includes(lawyerId);
  }
}

describe("RegisterUserUseCase", () => {
  const hasher = new FakeHasher();
  const baseCommand = {
    username: "iperalta",
    fullName: "Ignacio Peralta",
    email: "iperalta@vazquezzarate.com",
    plainPassword: "password1",
    roles: ["SECRETARY"],
  };

  function build(lawyerIds: readonly number[] = []) {
    const users = new FakeUserRepository();
    const roles = new FakeRoleRepository();
    const lawyerLookup = new FakeLawyerLookup(lawyerIds);
    const useCase = new RegisterUserUseCase(
      users,
      roles,
      lawyerLookup,
      hasher,
    );
    return { useCase, users, roles, lawyerLookup };
  }

  it("registers a user without a lawyer link", async () => {
    const { useCase, users } = build();

    const result = await useCase.execute(baseCommand);

    expect(result.user.username.toString()).toBe("iperalta");
    expect(result.roles.map((r) => r.getName())).toEqual(["SECRETARY"]);
    expect(users.created).toHaveLength(1);
  });

  it("rejects a duplicate username", async () => {
    const { useCase } = build();
    await useCase.execute(baseCommand);

    await expect(
      useCase.execute({ ...baseCommand, email: "other@vazquezzarate.com" }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsError);
  });

  it("rejects a duplicate email", async () => {
    const { useCase } = build();
    await useCase.execute(baseCommand);

    await expect(
      useCase.execute({ ...baseCommand, username: "other" }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it("rejects an unknown role code", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, roles: ["NOT_A_ROLE"] }),
    ).rejects.toBeInstanceOf(InvalidRoleError);
  });

  it("rejects LAWYER role without a lawyerId", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, roles: ["LAWYER"] }),
    ).rejects.toBeInstanceOf(LawyerLinkRequiredError);
  });

  it("rejects a lawyerId without the LAWYER role", async () => {
    const { useCase } = build([4]);

    await expect(
      useCase.execute({ ...baseCommand, roles: ["SECRETARY"], lawyerId: 4 }),
    ).rejects.toBeInstanceOf(LawyerLinkNotAllowedError);
  });

  it("rejects a lawyerId that the lookup cannot find (today: always, via the stub)", async () => {
    const { useCase } = build([]);

    await expect(
      useCase.execute({ ...baseCommand, roles: ["LAWYER"], lawyerId: 4 }),
    ).rejects.toBeInstanceOf(LawyerNotFoundError);
  });

  it("registers a LAWYER user once the lookup confirms the lawyer exists", async () => {
    const { useCase } = build([4]);

    const result = await useCase.execute({
      ...baseCommand,
      roles: ["LAWYER"],
      lawyerId: 4,
    });

    expect(result.user.lawyerId).toBe(4);
  });
});
