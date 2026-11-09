import { ValidationError } from '@shared/domain/domain-error';
import { ProceduralStateRef } from '../../../domain/ports/case/legal-parameters-lookup.port';
import { Case } from '../../../domain/entities/case/case.entity';
import {
  CaseInTerminalStateError,
  CaseNotFoundError,
  NotResponsibleLawyerError,
} from '../../../domain/errors/case.errors';
import { DayType } from '../../../domain/value-objects/deadline/day-type';
import {
  FakeCaseRepository,
  FakeClock,
  FakeDeadlineCalculator,
  FakeLegalParametersLookup,
  FakePeopleLookup,
  FakeProceduralActRepository,
  FakeTransactionManager,
} from '../../../test-support/case-fakes';
import {
  aCase,
  aCaseInState,
  anAct,
  anActor,
  anAdministrativeCase,
  aRegisterProceduralActCommand,
  ADMINISTRATIVE_STATE,
  ARCHIVED,
  CLIENT,
  day,
  DEACTIVATED,
  INITIAL_STATES,
  LAWYER,
  NOW,
  OPPOSITION,
  PRESCRIBED,
  STATES_TABLE,
  SUMMONS,
  TODAY,
  validationDetailsOf,
  WITHOUT_TERM,
} from '../../../test-support/case-fixtures';
import {
  PreviewProceduralActDeadlineQuery,
  RegisterProceduralActCommand,
} from './register-procedural-act.interfaces';
import { RegisterProceduralAct } from './register-procedural-act.use-case';

/**
 * Specs of the use case in isolation: every port is an in-memory fake, so
 * nothing touches a database, HTTP or another subsystem.
 *
 * Lo que se prueba acá es la coordinación: el orden de los chequeos, los puertos,
 * la transacción y que un pedido rechazado no escriba nada. Las reglas tienen su
 * detalle en el dominio (`case.entity.spec.ts`, `procedural-act.entity.spec.ts`,
 * `deadline.vo.spec.ts`); acá queda un test por regla que prueba que está conectada.
 */
describe('RegisterProceduralAct', () => {
  function build(options: { existing?: Case; states?: ProceduralStateRef[]; lawyers?: (typeof LAWYER)[] } = {}) {
    const cases = new FakeCaseRepository([...Object.values(INITIAL_STATES), ...STATES_TABLE]);
    const existing = options.existing ?? aCase();
    cases.add(existing);
    const acts = new FakeProceduralActRepository();
    const legalParameters = new FakeLegalParametersLookup(INITIAL_STATES, [], options.states ?? STATES_TABLE);
    const people = new FakePeopleLookup(options.lawyers ?? [LAWYER], [CLIENT]);
    const calculator = new FakeDeadlineCalculator();
    const transactions = new FakeTransactionManager();
    const useCase = new RegisterProceduralAct(
      cases,
      acts,
      legalParameters,
      people,
      calculator,
      new FakeClock(NOW, TODAY),
      transactions,
    );
    return { useCase, cases, acts, calculator, transactions, existing };
  }

  const command = (overrides: Partial<RegisterProceduralActCommand> = {}) => aRegisterProceduralActCommand(overrides);

  describe('registro exitoso (CA-26.1)', () => {
    it('asienta el acto y mueve la causa a su estado, en una única transacción', async () => {
      const { useCase, acts, cases, transactions, existing } = build();

      const { act, becameCurrent } = await useCase.execute(command({ notes: 'Con acusación, pero con oposición.' }));

      expect(acts.saved).toEqual([act]);
      expect(act).toMatchObject({
        id: 1,
        caseId: 1,
        proceduralStateId: OPPOSITION.id,
        actDate: day('2026-10-05'),
        notes: 'Con acusación, pero con oposición.',
      });
      expect(becameCurrent).toBe(true);
      expect(existing.currentStateId).toBe(OPPOSITION.id);
      expect(existing.currentProceduralActId).toBe(act.id);
      expect(existing.updatedAt).toBe(NOW);
      expect(cases.currentActUpdates).toEqual([
        { currentProceduralActId: act.id, currentStateId: OPPOSITION.id, currentCustomState: null },
      ]);
      expect(transactions.calls).toBe(1);
    });

    it('devuelve el nombre del estado y la ficha del abogado; el acto lleva quién lo registró', async () => {
      const { useCase } = build();

      const result = await useCase.execute(command({ actor: anActor({ userId: 41 }) }));

      expect(result.resultingStateName).toBe(OPPOSITION.name);
      expect(result.registeredBy).toEqual(LAWYER);
      expect(result.act.registeredByUserId).toBe(41);
      expect(result.act.registeredByLawyerId).toBe(LAWYER.id);
      expect(result.act.registeredAt).toBe(NOW);
    });
  });

  // CA-26.2. Cada perfil está en `case.entity.spec.ts` ("quién registra actos").
  it('a quien no es el abogado responsable se lo deniega sin calcular ni escribir nada', async () => {
    const { useCase, acts, cases, calculator, existing } = build();

    await expect(useCase.execute(command({ actor: anActor({ userId: 6, lawyerId: 99 }) }))).rejects.toBeInstanceOf(
      NotResponsibleLawyerError,
    );

    expect(acts.saved).toEqual([]);
    expect(cases.currentActUpdates).toEqual([]);
    expect(calculator.calls).toEqual([]);
    expect(existing.currentProceduralActId).toBeNull();
  });

  describe('cómputo del vencimiento (CA-26.3, CA-26.4, CA-26.5, CA-26.6, RN5, RN6)', () => {
    it('calcula con los días y el tipo de día de la tabla, y los copia al acto', async () => {
      const { useCase, calculator } = build();

      const { act } = await useCase.execute(command({ proceduralStateId: SUMMONS.id }));

      expect(calculator.calls).toEqual([{ countsFrom: day('2026-10-05'), days: 10, dayType: DayType.CONSECUTIVE }]);
      expect(act.deadline).toMatchObject({
        timeLimitDays: 10,
        dayType: DayType.CONSECUTIVE,
        computedDueDate: day('2026-10-15'),
        manuallyAdjusted: false,
      });
    });

    it('en el fuero administrativo calcula desde la notificación', async () => {
      const { useCase, calculator } = build({ existing: anAdministrativeCase() });

      const { act } = await useCase.execute(
        command({ proceduralStateId: ADMINISTRATIVE_STATE.id, actDate: day('2026-10-02'), notificationDate: day('2026-10-05') }),
      );

      expect(calculator.calls).toEqual([{ countsFrom: day('2026-10-05'), days: 10, dayType: DayType.BUSINESS }]);
      expect(act.notificationDate).toEqual(day('2026-10-05'));
    });

    it('el vencimiento ajustado a mano pasa a ser el vigente y se conserva el calculado', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(command({ manualDueDate: day('2026-10-20') }));

      expect(act.deadline).toMatchObject({
        dueDate: day('2026-10-20'),
        manualDueDate: day('2026-10-20'),
        computedDueDate: day('2026-10-10'),
        manuallyAdjusted: true,
      });
    });

    // CA-26.12
    it('un estado sin plazo no usa el calculador y la causa queda sin vencimiento vigente', async () => {
      const { useCase, calculator, existing } = build();

      const { act } = await useCase.execute(command({ proceduralStateId: WITHOUT_TERM.id }));

      expect(calculator.calls).toEqual([]);
      expect(act.deadline.dueDate).toBeNull();
      expect(existing.currentStateId).toBe(WITHOUT_TERM.id);
    });
  });

  describe('estado escrito a mano (CA-26.7)', () => {
    const custom = (customState: string) => command({ proceduralStateId: null, customState });

    it('queda solo en esa causa, sin estado de la tabla ni calculador', async () => {
      const { useCase, existing, cases, calculator } = build();

      const { act, resultingStateName } = await useCase.execute(custom('Pedido de informes al Registro Nacional'));

      expect(act.proceduralStateId).toBeNull();
      expect(act.customState).toBe('Pedido de informes al Registro Nacional');
      expect(resultingStateName).toBe('Pedido de informes al Registro Nacional');
      expect(existing.currentCustomState).toBe('Pedido de informes al Registro Nacional');
      expect(cases.currentActUpdates[0]).toMatchObject({ currentStateId: null });
      expect(calculator.calls).toEqual([]);
    });

    /** La búsqueda por nombre se hace en la tabla del fuero de la causa, entre los vigentes. */
    it('no puede repetir un estado de la tabla del fuero, pero sí uno de otro fuero o dado de baja', async () => {
      const { useCase, acts } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(custom('OPOSICIÓN AL REQUERIMIENTO DE ELEVACIÓN')),
      );
      expect(details).toEqual({ customState: 'Coincide con un estado de la tabla del fuero: elegilo de la lista.' });
      expect(acts.saved).toEqual([]);

      await expect(useCase.execute(custom(ADMINISTRATIVE_STATE.name))).resolves.toBeDefined();
      await expect(useCase.execute(custom(DEACTIVATED.name))).resolves.toBeDefined();
    });
  });

  // D-69
  it('un acto puede llevar la causa a un estado terminal, y cerrada ya no admite actos', async () => {
    const { useCase, existing, acts } = build();

    const { act } = await useCase.execute(command({ proceduralStateId: ARCHIVED.id }));

    expect(existing.currentStateId).toBe(ARCHIVED.id);
    expect(act.deadline.dueDate).toBeNull();
    const error = await useCase.execute(command({ actDate: TODAY })).catch((caught) => caught);
    expect(error).toBeInstanceOf(CaseInTerminalStateError);
    expect(error.code).toBe('CASE_IN_TERMINAL_STATE');
    expect(acts.saved).toEqual([act]);
  });

  // CA-26.8
  it('rechaza un destino que no se ofrece y un estado que no existe, sin guardar nada', async () => {
    const { useCase, acts } = build();

    const prescribed = await validationDetailsOf(() => useCase.execute(command({ proceduralStateId: PRESCRIBED.id })));
    const missing = await validationDetailsOf(() => useCase.execute(command({ proceduralStateId: 999 })));

    expect(prescribed).toEqual({
      proceduralStateId: 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.',
    });
    expect(missing).toEqual({ proceduralStateId: 'No existe un estado procesal vigente con ese identificador.' });
    expect(acts.saved).toEqual([]);
  });

  // CA-26.10
  it('un acto con fecha anterior al vigente queda asentado, pero la causa no se mueve ni se vuelve a guardar', async () => {
    const current = anAct({ id: 1, proceduralStateId: SUMMONS.id, actDate: day('2026-10-05') });
    const { useCase, acts, cases, existing } = build({ existing: aCaseInState({ currentAct: current }) });

    const { act, becameCurrent } = await useCase.execute(command({ actDate: day('2026-10-01') }));

    expect(becameCurrent).toBe(false);
    expect(acts.saved).toEqual([act]);
    expect(existing.currentStateId).toBe(SUMMONS.id);
    expect(existing.currentProceduralActId).toBe(1);
    expect(cases.currentActUpdates).toEqual([]);
  });

  // CA-26.11. El dominio valida la fecha futura; la fecha inválida la frena el caso de uso.
  it('una fecha del acto futura o inválida responde 400 con su detalle y no guarda nada', async () => {
    const { useCase, acts, cases } = build();

    const future = await validationDetailsOf(() => useCase.execute(command({ actDate: day('2026-10-07') })));
    const invalid = await validationDetailsOf(() => useCase.execute(command({ actDate: new Date('no es una fecha') })));

    expect(future).toEqual({ actDate: 'No puede ser posterior a la fecha de hoy.' });
    expect(invalid).toEqual({ actDate: 'Debe ser una fecha válida (AAAA-MM-DD).' });
    expect(acts.saved).toEqual([]);
    expect(cases.currentActUpdates).toEqual([]);
  });

  describe('errores y orden de los controles', () => {
    it('una causa que no existe responde causa no encontrada', async () => {
      const { useCase } = build();

      const error = await useCase.execute(command({ caseId: 999 })).catch((caught) => caught);

      expect(error).toBeInstanceOf(CaseNotFoundError);
      expect(error.code).toBe('CASE_NOT_FOUND');
    });

    it('primero se controla la causa, después el responsable, después el estado de la causa y recién al final los datos', async () => {
      const closed = aCaseInState({ currentStateId: ARCHIVED.id });
      const invalid = { proceduralStateId: 999, actDate: day('2026-12-01') };

      const notFound = build({ existing: closed });
      await expect(
        notFound.useCase.execute(command({ caseId: 999, actor: anActor({ lawyerId: 99 }), ...invalid })),
      ).rejects.toBeInstanceOf(CaseNotFoundError);

      const forbidden = build({ existing: closed });
      await expect(
        forbidden.useCase.execute(command({ actor: anActor({ lawyerId: 99 }), ...invalid })),
      ).rejects.toBeInstanceOf(NotResponsibleLawyerError);

      const terminal = build({ existing: closed });
      await expect(terminal.useCase.execute(command(invalid))).rejects.toBeInstanceOf(CaseInTerminalStateError);
    });

    it('si la ficha del abogado responsable no está vigente es un error de integridad, no de usuario', async () => {
      const { useCase, acts } = build({ lawyers: [] });

      await expect(useCase.execute(command())).rejects.toThrow(/is not active/);
      expect(acts.saved).toEqual([]);
    });

    it('si falla al guardar el acto, la causa no se toca', async () => {
      const { useCase, acts, cases } = build();
      acts.failOnSaveWith = new Error('la base no responde');

      await expect(useCase.execute(command())).rejects.toThrow('la base no responde');

      expect(cases.currentActUpdates).toEqual([]);
    });

    it('si falla al guardar la causa, el error se propaga para que la transacción deshaga el acto', async () => {
      const { useCase, acts, cases } = build();
      cases.failOnSaveCurrentActWith = new Error('la base no responde');

      await expect(useCase.execute(command())).rejects.toThrow('la base no responde');

      // The act was written first (the case points to it); the real transaction rolls it back.
      expect(acts.saved).toHaveLength(1);
    });
  });

  describe('previsualización del vencimiento', () => {
    const query = (overrides: Partial<PreviewProceduralActDeadlineQuery> = {}): PreviewProceduralActDeadlineQuery => ({
      caseId: 1,
      actor: anActor(),
      proceduralStateId: OPPOSITION.id,
      actDate: day('2026-10-05'),
      ...overrides,
    });

    /** The details of a preview that must fail with the contract's own code. */
    async function invalidRequestOf(work: () => Promise<unknown>) {
      const error: unknown = await work().catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).code).toBe('INVALID_REQUEST');
      expect((error as ValidationError).message).toBe('Parámetros de query inválidos.');
      return (error as ValidationError).details;
    }

    it('calcula el vencimiento con los días y el tipo de día de la tabla, sin registrar nada', async () => {
      const { useCase, acts, cases, transactions, calculator, existing } = build();

      const preview = await useCase.previewDeadline(query());

      expect(preview).toEqual({
        proceduralStateId: OPPOSITION.id,
        timeLimitDays: 5,
        dayType: DayType.BUSINESS,
        countsFrom: day('2026-10-05'),
        dueDate: day('2026-10-10'),
        businessDaysRemaining: 3,
      });
      expect(calculator.calls).toEqual([{ countsFrom: day('2026-10-05'), days: 5, dayType: DayType.BUSINESS }]);
      expect(acts.saved).toEqual([]);
      expect(cases.currentActUpdates).toEqual([]);
      expect(transactions.calls).toBe(0);
      expect(existing.currentProceduralActId).toBeNull();
      expect(existing.currentStateId).toBe(INITIAL_STATES.CRIMINAL.id);
    });

    it('los días hábiles que restan se cuentan desde hoy hasta el vencimiento', async () => {
      const { useCase, calculator } = build();
      calculator.businessDaysRemaining = -2;

      const preview = await useCase.previewDeadline(query());

      expect(calculator.businessDaysCalls).toEqual([{ from: TODAY, to: day('2026-10-10') }]);
      expect(preview.businessDaysRemaining).toBe(-2);
    });

    it('da el mismo vencimiento que el registro con los mismos datos', async () => {
      const { useCase } = build();
      const preview = await useCase.previewDeadline(query({ proceduralStateId: SUMMONS.id }));
      const other = build();

      const { act } = await other.useCase.execute(command({ proceduralStateId: SUMMONS.id }));

      expect(preview.dueDate).toEqual(act.deadline.dueDate);
      expect(preview.countsFrom).toEqual(act.deadline.countsFrom);
      expect(preview.timeLimitDays).toBe(act.deadline.timeLimitDays);
      expect(preview.dayType).toBe(act.deadline.dayType);
    });

    it('un estado que no abre plazo o uno terminal no tienen vencimiento ni días que restan', async () => {
      const { useCase, calculator } = build();

      const withoutTerm = await useCase.previewDeadline(query({ proceduralStateId: WITHOUT_TERM.id }));
      const terminal = await useCase.previewDeadline(query({ proceduralStateId: ARCHIVED.id }));

      expect(withoutTerm).toEqual({
        proceduralStateId: WITHOUT_TERM.id,
        timeLimitDays: 0,
        dayType: DayType.NONE,
        countsFrom: day('2026-10-05'),
        dueDate: null,
        businessDaysRemaining: null,
      });
      expect(terminal).toMatchObject({ proceduralStateId: ARCHIVED.id, dueDate: null, businessDaysRemaining: null });
      expect(calculator.calls).toEqual([]);
      expect(calculator.businessDaysCalls).toEqual([]);
    });

    it('en el fuero administrativo el plazo corre desde la notificación', async () => {
      const { useCase, calculator } = build({ existing: anAdministrativeCase() });

      const preview = await useCase.previewDeadline(
        query({ proceduralStateId: ADMINISTRATIVE_STATE.id, actDate: day('2026-10-02'), notificationDate: day('2026-10-05') }),
      );

      expect(preview.countsFrom).toEqual(day('2026-10-05'));
      expect(calculator.calls).toEqual([{ countsFrom: day('2026-10-05'), days: 10, dayType: DayType.BUSINESS }]);
    });

    /** Las mismas restricciones que el registro, con el código de la query (§3.8). */
    it('los datos inválidos responden INVALID_REQUEST con el detalle del registro', async () => {
      const { useCase } = build();
      const administrative = build({ existing: anAdministrativeCase() });

      expect(await invalidRequestOf(() => useCase.previewDeadline(query({ proceduralStateId: PRESCRIBED.id })))).toEqual({
        proceduralStateId: 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.',
      });
      expect(await invalidRequestOf(() => useCase.previewDeadline(query({ proceduralStateId: 999 })))).toEqual({
        proceduralStateId: 'No existe un estado procesal vigente con ese identificador.',
      });
      // No hay previsualización de un estado escrito a mano.
      expect(await invalidRequestOf(() => useCase.previewDeadline(query({ proceduralStateId: null })))).toEqual({
        proceduralStateId: 'Es obligatorio.',
      });
      expect(await invalidRequestOf(() => useCase.previewDeadline(query({ actDate: day('2026-10-07') })))).toEqual({
        actDate: 'No puede ser posterior a la fecha de hoy.',
      });
      expect(
        await invalidRequestOf(() =>
          administrative.useCase.previewDeadline(query({ proceduralStateId: ADMINISTRATIVE_STATE.id, actDate: day('2026-10-02') })),
        ),
      ).toEqual({ notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).' });
    });

    describe('quién puede previsualizar', () => {
      it('una causa que no existe responde causa no encontrada', async () => {
        const { useCase } = build();

        await expect(useCase.previewDeadline(query({ caseId: 999 }))).rejects.toBeInstanceOf(CaseNotFoundError);
      });

      it('se lo deniega a quien no es el responsable, igual que el registro (CA-26.2)', async () => {
        const { useCase, calculator } = build();

        await expect(useCase.previewDeadline(query({ actor: anActor({ lawyerId: 99 }) }))).rejects.toBeInstanceOf(
          NotResponsibleLawyerError,
        );
        expect(calculator.calls).toEqual([]);
      });

      it('primero se controla la causa y el responsable, y recién después los datos', async () => {
        const { useCase } = build();
        const invalid = { proceduralStateId: 999, actDate: day('2026-12-01') };

        await expect(useCase.previewDeadline(query({ caseId: 999, ...invalid }))).rejects.toBeInstanceOf(CaseNotFoundError);
        await expect(
          useCase.previewDeadline(query({ actor: anActor({ lawyerId: 99 }), ...invalid })),
        ).rejects.toBeInstanceOf(NotResponsibleLawyerError);
      });

      it('sobre una causa en estado terminal responde igual: el 422 lo da el registro', async () => {
        const { useCase } = build({ existing: aCaseInState({ currentStateId: ARCHIVED.id }) });

        const preview = await useCase.previewDeadline(query());

        expect(preview.dueDate).toEqual(day('2026-10-10'));
      });
    });
  });
});
