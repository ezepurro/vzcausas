import { ValidationError } from '@shared/domain/domain-error';
import { InterruptiveAct } from '../../../domain/entities/interruptive-act.entity';
import {
  CaseInTerminalStateError,
  CaseNotFoundError,
  NotResponsibleLawyerError,
  PrescriptionNotApplicableError,
} from '../../../domain/errors/case.errors';
import { InterruptiveActView } from '../../../domain/ports/interruptive-act/interruptive-act.repository';
import {
  FakeCaseRepository,
  FakeClock,
  FakePeopleLookup,
  UnusedInterruptiveActRepository,
} from '../../../test-support/case-fakes';
import {
  ARCHIVED,
  CLIENT,
  LAWYER,
  NOW,
  STATES_TABLE,
  TODAY,
  aCase,
  aCaseInState,
  anActor,
  anAdministrativeCase,
  anOrphanedCase,
  day,
} from '../../../test-support/case-fixtures';
import { RegisterInterruptiveAct, RegisterInterruptiveActCommand } from './register-interruptive-act.use-case';

class FakeInterruptiveActRepository extends UnusedInterruptiveActRepository {
  readonly saved: InterruptiveAct[] = [];
  private next = 1;

  async nextId(): Promise<number> {
    return this.next++;
  }

  async save(act: InterruptiveAct): Promise<void> {
    this.saved.push(act);
  }

  /** What persistence reads for an act with no lawyer: the name of the user who registered it. */
  async findViewById(id: number): Promise<InterruptiveActView | null> {
    const act = this.saved.find((saved) => saved.id === id);
    return act ? { act, registeredBy: { lastName: 'Peralta', firstName: 'Iván' } } : null;
  }
}

function command(overrides: Partial<RegisterInterruptiveActCommand> = {}): RegisterInterruptiveActCommand {
  return {
    caseId: 1,
    actor: anActor(),
    name: 'Citación a juicio',
    actDate: day('2026-09-15'),
    notes: 'Decreto de fs. 212.',
    ...overrides,
  };
}

describe('RegisterInterruptiveAct', () => {
  let cases: FakeCaseRepository;
  let acts: FakeInterruptiveActRepository;
  let useCase: RegisterInterruptiveAct;

  beforeEach(() => {
    cases = new FakeCaseRepository(STATES_TABLE);
    acts = new FakeInterruptiveActRepository();
    useCase = new RegisterInterruptiveAct(
      cases,
      acts,
      new FakePeopleLookup([LAWYER], [CLIENT]),
      new FakeClock(NOW, TODAY),
    );
  });

  // CA-31.1
  it('registra el acto y lo devuelve con el abogado que lo cargó', async () => {
    cases.add(aCase());

    const view = await useCase.execute(command());

    expect(acts.saved).toHaveLength(1);
    expect(view.act).toBe(acts.saved[0]);
    expect(view.act).toMatchObject({ caseId: 1, name: 'Citación a juicio', registeredByUserId: 5 });
    expect(view.act.registeredByLawyerId).toBe(LAWYER.id);
    expect(view.registeredBy).toEqual({ lastName: 'Ríos', firstName: 'Malena' });
  });

  // CA-31.6: nada de la causa se escribe.
  it('no toca la causa: ni su estado ni su acto vigente', async () => {
    cases.add(aCase());

    await useCase.execute(command());

    expect(cases.currentActUpdates).toEqual([]);
  });

  // CA-31.14
  it('una causa inexistente lanza CaseNotFoundError', async () => {
    await expect(useCase.execute(command({ caseId: 99 }))).rejects.toBeInstanceOf(CaseNotFoundError);
    expect(acts.saved).toEqual([]);
  });

  // CA-31.11
  it.each([
    ['otro abogado', anActor({ lawyerId: 99 })],
    ['un administrador con la ficha del responsable', anActor({ roleNames: ['ADMINISTRATOR'] })],
    ['un usuario sin ficha de abogado', anActor({ lawyerId: null })],
  ])('rechaza a %s con el mensaje de los actos interruptivos', async (_caso, actor) => {
    cases.add(aCase());

    const error = await useCase.execute(command({ actor })).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotResponsibleLawyerError);
    expect((error as Error).message).toBe('Solo el abogado responsable de la causa puede registrar actos interruptivos.');
    expect(acts.saved).toEqual([]);
  });

  // D-143, D-144: una huérfana no tiene responsable; sus actos son del administrador, a su nombre.
  describe('causa huérfana', () => {
    it('el administrador registra el acto a su nombre, sin ficha de abogado', async () => {
      cases.add(anOrphanedCase());
      const admin = anActor({ userId: 7, roleNames: ['ADMINISTRATOR'], lawyerId: null });

      const view = await useCase.execute(command({ actor: admin }));

      expect(acts.saved).toEqual([view.act]);
      expect(view.act.registeredByUserId).toBe(7);
      expect(view.act.registeredByLawyerId).toBeNull();
      expect(view.registeredBy).toEqual({ lastName: 'Peralta', firstName: 'Iván' });
    });

    it.each([
      ['el abogado que era el responsable', anActor()],
      ['otro abogado', anActor({ lawyerId: 99 })],
      ['la secretaría', anActor({ roleNames: ['SECRETARY'], lawyerId: null })],
    ])('rechaza a %s con el mensaje de los actos interruptivos', async (_caso, actor) => {
      cases.add(anOrphanedCase());

      const error = await useCase.execute(command({ actor })).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotResponsibleLawyerError);
      expect(acts.saved).toEqual([]);
    });
  });

  // CA-31.9
  it('rechaza una causa que no es penal', async () => {
    cases.add(anAdministrativeCase());

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(PrescriptionNotApplicableError);
    expect(acts.saved).toEqual([]);
  });

  // CA-31.10
  it('rechaza una causa en estado terminal con el mensaje del contrato', async () => {
    cases.add(aCaseInState({ currentStateId: ARCHIVED.id }));

    const error = await useCase.execute(command()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CaseInTerminalStateError);
    expect((error as Error).message).toBe('La causa se encuentra en un estado terminal y no admite esta operación.');
    expect(acts.saved).toEqual([]);
  });

  // CA-31.8
  it('rechaza una fecha posterior a hoy sin guardar nada', async () => {
    cases.add(aCase());

    await expect(useCase.execute(command({ actDate: day('2026-10-07') }))).rejects.toBeInstanceOf(ValidationError);
    expect(acts.saved).toEqual([]);
  });

  /**
   * El orden de los controles importa: el 404, el 403 y los 422 se resuelven
   * antes que los datos, igual que en HU26. Un pedido con todo mal de una
   * causa ajena dice "no es tuya", no "faltan datos".
   */
  it('el responsable se verifica antes que los datos', async () => {
    cases.add(aCase());

    await expect(
      useCase.execute(command({ actor: anActor({ lawyerId: 99 }), name: '', actDate: day('2027-01-01') })),
    ).rejects.toBeInstanceOf(NotResponsibleLawyerError);
  });

  it('el fuero se verifica antes que los datos', async () => {
    cases.add(anAdministrativeCase());

    await expect(useCase.execute(command({ name: '' }))).rejects.toBeInstanceOf(PrescriptionNotApplicableError);
  });
});
