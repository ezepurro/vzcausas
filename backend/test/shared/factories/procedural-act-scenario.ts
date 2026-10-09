import { getPrisma } from '../harness/test-app';
import { loginAs } from '../auth/login-as';
import { createCase } from './case.factory';
import { createClient } from './client.factory';
import { createLawyer } from './lawyer.factory';
import { createInitialState, createProceduralState } from './procedural-state.factory';
import { createUser } from './user.factory';

/**
 * Escenario común de los specs de actos procesales (HU26): los estados de la
 * tabla de los dos fueros que se usan, el abogado responsable con su usuario,
 * otro abogado, y una causa penal en el estado inicial.
 *
 * Los fueros y sus estados los siembra el seed, pero otros specs los borran:
 * este los recrea en cada `beforeEach`.
 */

/**
 * Borra todo lo que este escenario y los specs de actos procesales dejan.
 *
 * El orden importa por una referencia circular: `cases.current_procedural_act_id`
 * apunta al acto y `procedural_acts.case_id` apunta a la causa (ambas
 * `Restrict`). Primero se suelta el puntero de la causa, después se borran los
 * actos y recién entonces las causas. También se llama en `afterAll`: una
 * causa con acto vigente que quedara en la base rompería el `beforeEach` de
 * otros specs, que borran los actos antes que las causas.
 */
export async function resetProceduralActData(): Promise<void> {
  const prisma = getPrisma();
  await prisma.offense.deleteMany();
  await prisma.case.updateMany({ data: { currentProceduralActId: null } });
  await prisma.proceduralAct.deleteMany();
  await prisma.case.deleteMany();
  await prisma.proceduralState.deleteMany(); // hijos de jurisdictions
  await prisma.jurisdiction.deleteMany();
  await prisma.user.deleteMany(); // referencia a lawyers
  await prisma.lawyer.deleteMany();
  await prisma.client.deleteMany();
}

export async function setUpProceduralActScenario() {
  await resetProceduralActData();

  // Estados penales (el fuero de la causa del escenario).
  const initial = await createInitialState('CRIMINAL');
  const fiveBusinessDays = await createProceduralState({
    jurisdiction: 'CRIMINAL',
    name: 'Oposición al requerimiento de elevación',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
  });
  const tenConsecutiveDays = await createProceduralState({
    jurisdiction: 'CRIMINAL',
    name: 'Citación a juicio',
    timeLimitDays: 10,
    dayType: 'CONSECUTIVE',
  });
  const withoutTerm = await createProceduralState({
    jurisdiction: 'CRIMINAL',
    name: 'Con vista al fiscal',
    timeLimitDays: 0,
    dayType: 'NONE',
  });
  const terminal = await createProceduralState({
    jurisdiction: 'CRIMINAL',
    name: 'Archivada',
    timeLimitDays: 0,
    dayType: 'NONE',
    terminal: true,
  });
  const deactivated = await createProceduralState({
    jurisdiction: 'CRIMINAL',
    name: 'Estado dado de baja',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    isActive: false,
  });

  // Estados administrativos.
  const administrativeInitial = await createInitialState('ADMINISTRATIVE');
  const administrative = await createProceduralState({
    jurisdiction: 'ADMINISTRATIVE',
    name: 'Presentación de descargo',
    timeLimitDays: 10,
    dayType: 'BUSINESS',
  });
  const administrativeWithoutTerm = await createProceduralState({
    jurisdiction: 'ADMINISTRATIVE',
    name: 'Con vista al instructor',
    timeLimitDays: 0,
    dayType: 'NONE',
  });

  // Quién es el abogado responsable, y otro que no lo es. La causa guarda quién
  // registró cada acto (FK a users) y el responsable (FK a lawyers).
  const lawyer = await createLawyer({ fullName: 'Dra. Malena Ríos' });
  const user = await createUser({ roles: ['LAWYER'], lawyerId: lawyer.id });
  const otherLawyer = await createLawyer();
  const otherUser = await createUser({ roles: ['LAWYER'], lawyerId: otherLawyer.id });
  const client = await createClient();

  const caseRow = await createCase({ clientId: client.id, responsibleLawyerId: lawyer.id, createdByUserId: user.id });

  return {
    states: {
      initial,
      fiveBusinessDays,
      tenConsecutiveDays,
      withoutTerm,
      terminal,
      deactivated,
      administrativeInitial,
      administrative,
      administrativeWithoutTerm,
    },
    lawyer,
    user,
    otherLawyer,
    otherUser,
    client,
    caseRow,
    /** El abogado responsable de la causa. */
    responsible: loginAs({ userId: user.id, roles: ['LAWYER'], lawyerId: lawyer.id }),
    /** Un abogado que no es el responsable. */
    notResponsible: loginAs({ userId: otherUser.id, roles: ['LAWYER'], lawyerId: otherLawyer.id }),
    /** Administrador sin el rol de abogado, aunque su ficha sea la del responsable. */
    administrator: loginAs({ userId: user.id, roles: ['ADMINISTRATOR'], lawyerId: lawyer.id }),
  };
}

export type ProceduralActScenario = Awaited<ReturnType<typeof setUpProceduralActScenario>>;
