import {
  EmailAlreadyExistsError,
  InvalidRoleError,
  LawyerLinkNotAllowedError,
  LawyerLinkRequiredError,
  LawyerNotFoundError,
  UsernameAlreadyExistsError,
} from "../../domain/errors/identity.errors";
import { RegisterUserUseCase } from "./register-user.use-case";
import {
  FakeHasher,
  FakeLawyerLookup,
  FakeRoleRepository,
  FakeUserRepository,
} from "./test-support/identity-fakes";

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
