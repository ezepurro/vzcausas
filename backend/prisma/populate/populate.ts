// This script runs outside Nest, so nothing has loaded `.env` on its
// behalf. Without this the connection fails with a SASL error that says
// nothing about the actual cause.
import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { seedPresentationCases } from './cases';
import { PROCEDURAL_STATES } from './legal-parameters';
import { DEV_USERS } from './people';
import { SYSTEM_STATES, upsertProceduralState } from '../procedural-states';

/*
 * Populates a development database with sample data: procedural states,
 * the presentation accounts and lawyers, clients, legal qualifications and
 * cases (the modules next to this one). Run with `npm run prisma:populate` (`make populate`),
 * after the essential seed (`prisma db seed`, `../seed.ts`), which provides the
 * roles, jurisdictions and system states this script builds on.
 *
 * Development only: a database holding accounts with a known password is
 * precisely what must never exist anywhere else. The gate is the entire
 * security argument for this fixture.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check backend/.env (or the container environment).');
}

/**
 * Accounts and professional records of the presentation fixture
 * (`populate/people.ts`). Each lawyer record is keyed by its registration
 * number and takes the account's name.
 */
async function seedDevPeople(prisma: PrismaClient): Promise<void> {
  const defaultPassword = process.env.DEV_SEED_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(defaultPassword, Number(process.env.BCRYPT_COST ?? 12));

  for (const user of DEV_USERS) {
    // D-25 / Q-07: ADMINISTRATOR or LAWYER needs a professional record, and an
    // account with neither role (a secretary) must not have one.
    const needsLawyer = user.roles.includes('ADMINISTRATOR') || user.roles.includes('LAWYER');
    if (needsLawyer !== (user.registrationNumber !== undefined)) {
      throw new Error(
        `User ${user.username} has roles [${user.roles.join(', ')}]: ` +
          (needsLawyer ? 'it needs a registrationNumber.' : 'it must not have a registrationNumber.'),
      );
    }

    let lawyerId: number | null = null;
    if (user.registrationNumber !== undefined) {
      const lawyer = await prisma.lawyer.upsert({
        where: { registrationNumber: user.registrationNumber },
        update: { lastName: user.lastName, firstName: user.firstName, active: true },
        create: { lastName: user.lastName, firstName: user.firstName, registrationNumber: user.registrationNumber },
      });
      lawyerId = lawyer.id;
    }

    const row = await prisma.user.upsert({
      where: { username: user.username },
      // The password is refreshed so that editing the variable takes
      // effect without wiping the volume.
      update: { passwordHash, lastName: user.lastName, firstName: user.firstName, email: user.email, lawyerId, active: true, deletedAt: null },
      create: { username: user.username, lastName: user.lastName, firstName: user.firstName, email: user.email, passwordHash, lawyerId },
    });

    const roles = await prisma.role.findMany({ where: { name: { in: [...user.roles] } } });
    // Replaced rather than merged, for the same reason as
    // `role_permissions`: the constants are the source of truth.
    // Note this discards roles assigned through the API in development.
    await prisma.userRole.deleteMany({ where: { userId: row.id } });
    await prisma.userRole.createMany({
      data: roles.map((role) => ({ userId: row.id, roleId: role.id })),
    });
  }

  console.log(`Development fixture: ${DEV_USERS.length} users (password in DEV_SEED_PASSWORD, admin123 by default).`);
}

/**
 * Fails instead of half-populating a database the essential seed has not
 * prepared: without roles the accounts get none, and without the system
 * states the cases have nowhere to start.
 */
async function assertSeeded(prisma: PrismaClient): Promise<void> {
  const roles = await prisma.role.count();
  const systemStates = await prisma.proceduralState.count({
    where: { isActive: true, OR: [{ isInitial: true }, { isPrescribed: true }] },
  });
  if (roles === 0 || systemStates < SYSTEM_STATES.length) {
    throw new Error('Populate: the essential seed has not run. Run `npx prisma db seed` (make seed) first.');
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(`Populate runs only with NODE_ENV=development (current: ${process.env.NODE_ENV ?? 'unset'}).`);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await assertSeeded(prisma);

    // Sample table of procedural states. The system ones are the essential
    // seed's; they are in `PROCEDURAL_STATES` only so the fixture can look
    // them up by name.
    const samples = PROCEDURAL_STATES.filter((state) => !state.isInitial && !state.isPrescribed);
    for (const state of samples) {
      await upsertProceduralState(prisma, state);
    }
    console.log(`Populate: ${samples.length} sample procedural states.`);

    await seedDevPeople(prisma);
    await seedPresentationCases(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
