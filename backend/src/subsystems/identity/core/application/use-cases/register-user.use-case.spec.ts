import {
  EmailAlreadyExistsError,
  InvalidRoleError,
  LawyerAlreadyLinkedError,
  LawyerLinkNotAllowedError,
  LawyerLinkRequiredError,
  LawyerNotFoundError,
  UsernameAlreadyExistsError,
} from "../../domain/errors/identity.errors";
import { RegisterUserUseCase } from "./register-user.use-case";
import {
  FakeHasher,
  FakeLawyerLookup,
  FakeLawyerRegistrar,
  FakeRoleRepository,
  FakeTransactionManager,
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

  function build(lawyerIds: readonly number[] = [], registrarFails?: Error) {
    const users = new FakeUserRepository();
    const roles = new FakeRoleRepository();
    const lawyerLookup = new FakeLawyerLookup(lawyerIds);
    const registrar = new FakeLawyerRegistrar(registrarFails);
    const transactions = new FakeTransactionManager(users, registrar);
    const useCase = new RegisterUserUseCase(
      users,
      roles,
      lawyerLookup,
      registrar,
      hasher,
      transactions,
    );
    return { useCase, users, roles, lawyerLookup, registrar, transactions };
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

  // A lawyer holds at most one live account.
  describe("one active account per lawyer", () => {
    const asLawyer = { ...baseCommand, roles: ["LAWYER"], lawyerId: 4 };

    it("rejects linking a lawyer that already has an active user", async () => {
      const { useCase } = build([4]);
      await useCase.execute(asLawyer);

      await expect(
        useCase.execute({
          ...asLawyer,
          username: "otro",
          email: "otro@vazquezzarate.com",
        }),
      ).rejects.toBeInstanceOf(LawyerAlreadyLinkedError);
    });

    /**
     * Deactivating an account frees the matrícula: the lawyer is still
     * practising, only the account changed. A plain UNIQUE would leave
     * them unable to ever hold an account again.
     */
    it("frees the lawyer once the account is deactivated", async () => {
      const { useCase, users } = build([4]);
      const first = await useCase.execute(asLawyer);
      first.user.deactivate();
      await users.save(first.user);

      const second = await useCase.execute({
        ...asLawyer,
        username: "otro",
        email: "otro@vazquezzarate.com",
      });

      expect(second.user.lawyerId).toBe(4);
    });
  });

  // Contract §3.2: sending `lawyer` registers the professional record
  // together with the user, in a single transaction.
  describe("registering the lawyer inline", () => {
    const withNewLawyer = {
      ...baseCommand,
      roles: ["LAWYER"],
      lawyer: { fullName: "Dr. Ignacio Peralta", registrationNumber: "1-35207" },
    };

    it("creates the lawyer and links the user to it", async () => {
      const { useCase, registrar } = build();

      const result = await useCase.execute(withNewLawyer);

      expect(registrar.registered).toHaveLength(1);
      expect(result.lawyer?.registrationNumber).toBe("1-35207");
      expect(result.user.lawyerId).toBe(result.lawyer?.id);
    });

    it("does both writes inside one transaction", async () => {
      const { useCase, transactions } = build();

      await useCase.execute(withNewLawyer);

      expect(transactions.calls).toBe(1);
    });

    /**
     * The reason the transaction exists: a lawyer left behind by a
     * failed registration cannot be deleted from the app, and its
     * matrícula would then reject the retry.
     */
    it("persists no user when registering the lawyer fails", async () => {
      const { useCase, users } = build([], new Error("matrícula repetida"));

      await expect(useCase.execute(withNewLawyer)).rejects.toThrow(
        "matrícula repetida",
      );
      expect(users.created).toHaveLength(0);
    });

    it("leaves no lawyer behind when the user cannot be created", async () => {
      const { useCase, users, registrar } = build();
      // Fails at the insert, past every up-front validation — the only
      // point where a lawyer has already been written and the rollback
      // is what has to undo it.
      users.failNextCreate = new Error("insert falló");

      await expect(useCase.execute(withNewLawyer)).rejects.toThrow(
        "insert falló",
      );
      expect(registrar.registered).toHaveLength(0);
    });

    it("rejects a lawyer for a user that does not hold the role", async () => {
      const { useCase } = build();

      await expect(
        useCase.execute({ ...withNewLawyer, roles: ["SECRETARY"] }),
      ).rejects.toBeInstanceOf(LawyerLinkNotAllowedError);
    });

    it("accepts the LAWYER role when the link comes as a new lawyer", async () => {
      const { useCase } = build();

      await expect(useCase.execute(withNewLawyer)).resolves.toBeDefined();
    });
  });
});
