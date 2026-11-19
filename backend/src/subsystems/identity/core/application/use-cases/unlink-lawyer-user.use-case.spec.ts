import { ClockPort } from "@shared/domain/clock.port";
import { User } from "../../domain/entities/user.entity";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";
import { UnlinkLawyerUserUseCase } from "./unlink-lawyer-user.use-case";
import {
  FAKE_ROLE_IDS_BY_NAME,
  FakeHasher,
  FakeRefreshTokenStore,
  FakeRoleRepository,
  FakeUserRepository,
} from "./test-support/identity-fakes";

/*
 * HU15, D-133 · El usuario vinculado a un abogado dado de baja pierde la ficha. Solo lo que es del
 * caso de uso: a quién busca, qué guarda y cuándo cierra sesiones. La regla de qué le pasa al
 * usuario está en `user.entity.spec.ts`.
 */

const ADMIN = FAKE_ROLE_IDS_BY_NAME.ADMINISTRATOR;
const LAWYER = FAKE_ROLE_IDS_BY_NAME.LAWYER;
const NOW = new Date("2026-11-17T15:30:00-03:00");
const LAWYER_ID = 3;

const clock: ClockPort = {
  now: () => NOW,
  today: () => new Date(Date.UTC(2026, 10, 17)),
};

async function seedUser(
  users: FakeUserRepository,
  overrides: { id?: number; roleIds?: number[]; lawyerId?: number | null; active?: boolean } = {},
): Promise<User> {
  const id = overrides.id ?? 1;
  const user = await User.create(
    {
      id,
      username: Username.create(`user${id}`),
      plainPassword: "password1",
      lastName: "Ríos",
      firstName: "Malena",
      email: Email.create(`user${id}@vazquezzarate.com`),
      roleIds: overrides.roleIds ?? [LAWYER],
      lawyerId: overrides.lawyerId === undefined ? LAWYER_ID : overrides.lawyerId,
      active: overrides.active ?? true,
    },
    new FakeHasher(),
  );
  await users.create(user);
  return user;
}

function build() {
  const users = new FakeUserRepository();
  const refreshTokens = new FakeRefreshTokenStore();
  const useCase = new UnlinkLawyerUserUseCase(users, new FakeRoleRepository(), refreshTokens, clock);
  return { useCase, users, refreshTokens };
}

describe("UnlinkLawyerUserUseCase", () => {
  it("si LAWYER era su único rol, da de baja al usuario, lo desvincula y cierra sus sesiones", async () => {
    const { useCase, users, refreshTokens } = build();
    const user = await seedUser(users);

    await useCase.execute({ lawyerId: LAWYER_ID });

    expect(user.isActive()).toBe(false);
    expect(user.deletedAt).toEqual(NOW);
    expect(user.lawyerId).toBeNull();
    expect(users.saved).toHaveLength(1);
    expect(refreshTokens.revokedForUsers).toEqual([user.id]);
  });

  it("si tiene otros roles, sigue vigente con ellos, sin la ficha ni el rol LAWYER, y sus sesiones siguen", async () => {
    const { useCase, users, refreshTokens } = build();
    const user = await seedUser(users, { roleIds: [LAWYER, ADMIN] });

    await useCase.execute({ lawyerId: LAWYER_ID });

    expect(user.isActive()).toBe(true);
    expect(user.roleIds).toEqual([ADMIN]);
    expect(user.lawyerId).toBeNull();
    expect(users.saved).toHaveLength(1);
    expect(refreshTokens.revokedForUsers).toEqual([]);
  });

  it("un abogado sin usuario vinculado no hace nada", async () => {
    const { useCase, users, refreshTokens } = build();
    await seedUser(users, { lawyerId: 99 });

    await expect(useCase.execute({ lawyerId: LAWYER_ID })).resolves.toBeUndefined();

    expect(users.saved).toHaveLength(0);
    expect(refreshTokens.revokedForUsers).toEqual([]);
  });

  it("un usuario ya dado de baja no se vuelve a tocar", async () => {
    const { useCase, users } = build();
    await seedUser(users, { active: false });

    await useCase.execute({ lawyerId: LAWYER_ID });

    expect(users.saved).toHaveLength(0);
  });
});
