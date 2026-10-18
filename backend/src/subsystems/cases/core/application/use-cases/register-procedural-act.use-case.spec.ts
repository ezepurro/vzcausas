import { ValidationError } from '@shared/domain/domain-error';
import { ProceduralStateRef } from '../../domain/ports/legal-parameters-lookup.port';
import { Case } from '../../domain/entities/cases';
import {
  CaseInTerminalStateError,
  CaseNotFoundError,
  NotResponsibleLawyerError,
} from '../../domain/errors/case.errors';
import { DayType } from '../../domain/value-objects/day-type';
import {
  FakeCaseRepository,
  FakeClock,
  FakeDeadlineCalculator,
  FakeLegalParametersLookup,
  FakePeopleLookup,
  FakeProceduralActRepository,
  FakeTransactionManager,
} from '../../test-support/case-fakes';
import {
  aCase,
  aCaseInState,
  anAct,
  anActor,
  anAdministrativeCase,
  aProceduralState,
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
} from '../../test-support/case-fixtures';
import {
  PreviewProceduralActDeadlineQuery,
  RegisterProceduralActCommand,
} from '../common/register-procedural-act.interfaces';
import { RegisterProceduralAct } from './register-procedural-act.use-case';

/**
 * Specs of the use case in isolation: every port is an in-memory fake, so
 * nothing touches a database, HTTP or another subsystem.
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
    it('asienta el acto con su estado, su fecha y sus observaciones', async () => {
      const { useCase, acts } = build();

      const { act } = await useCase.execute(command({ notes: 'Con acusación, pero con oposición.' }));

      expect(acts.saved).toEqual([act]);
      expect(act.id).toBe(1);
      expect(act.caseId).toBe(1);
      expect(act.proceduralStateId).toBe(OPPOSITION.id);
      expect(act.actDate).toEqual(day('2026-10-05'));
      expect(act.notes).toBe('Con acusación, pero con oposición.');
    });

    it('la causa pasa al estado del acto y toma como vigente el vencimiento que abre', async () => {
      const { useCase, existing } = build();

      const { act, becameCurrent } = await useCase.execute(command());

      expect(becameCurrent).toBe(true);
      expect(existing.currentStateId).toBe(OPPOSITION.id);
      expect(existing.currentProceduralActId).toBe(act.id);
      expect(act.deadline.dueDate).toEqual(day('2026-10-10'));
      expect(existing.updatedAt).toBe(NOW);
    });

    it('guarda en la causa el estado y el acto vigente', async () => {
      const { useCase, cases } = build();

      const { act } = await useCase.execute(command());

      expect(cases.currentActUpdates).toEqual([
        { currentProceduralActId: act.id, currentStateId: OPPOSITION.id, currentCustomState: null },
      ]);
    });

    it('guarda el acto y la causa en una única transacción', async () => {
      const { useCase, transactions } = build();

      await useCase.execute(command());

      expect(transactions.calls).toBe(1);
    });

    it('devuelve el nombre del estado y la ficha del abogado que lo registró', async () => {
      const { useCase } = build();

      const result = await useCase.execute(command());

      expect(result.resultingStateName).toBe(OPPOSITION.name);
      expect(result.registeredBy).toEqual(LAWYER);
    });

    it('el acto lleva el usuario que lo registró y el abogado responsable', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(command({ actor: anActor({ userId: 41 }) }));

      expect(act.registeredByUserId).toBe(41);
      expect(act.registeredByLawyerId).toBe(LAWYER.id);
      expect(act.registeredAt).toBe(NOW);
    });
  });

  describe('solo el abogado responsable (CA-26.2)', () => {
    it.each([
      ['otro abogado', anActor({ userId: 6, lawyerId: 99 })],
      ['un administrador sin ficha de abogado', anActor({ roleNames: ['ADMINISTRATOR'], lawyerId: null })],
      ['un administrador que no es abogado, aunque su ficha sea la del responsable', anActor({ roleNames: ['ADMINISTRATOR'] })],
      ['un abogado sin ficha', anActor({ lawyerId: null })],
    ])('deniega la operación a %s', async (_name, actor) => {
      const { useCase, acts, cases, calculator, existing } = build();

      await expect(useCase.execute(command({ actor }))).rejects.toBeInstanceOf(NotResponsibleLawyerError);

      expect(acts.saved).toEqual([]);
      expect(cases.currentActUpdates).toEqual([]);
      expect(calculator.calls).toEqual([]);
      expect(existing.currentProceduralActId).toBeNull();
    });

    it('lo permite a quien es administrador y abogado a la vez, si es el responsable', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(command({ actor: anActor({ roleNames: ['ADMINISTRATOR', 'LAWYER'] }) }));

      expect(act.id).toBe(1);
    });
  });

  describe('cómputo del vencimiento (CA-26.3, RN5)', () => {
    it('usa los días y el tipo de día que la tabla tiene para el estado', async () => {
      const { useCase, calculator } = build();

      await useCase.execute(command({ proceduralStateId: OPPOSITION.id, actDate: day('2026-10-05') }));

      expect(calculator.calls).toEqual([{ countsFrom: day('2026-10-05'), days: 5, dayType: DayType.BUSINESS }]);
    });

    it('un plazo en días corridos se calcula con el tipo de día de la tabla', async () => {
      const { useCase, calculator } = build();

      const { act } = await useCase.execute(command({ proceduralStateId: SUMMONS.id }));

      expect(calculator.calls).toEqual([{ countsFrom: day('2026-10-05'), days: 10, dayType: DayType.CONSECUTIVE }]);
      expect(act.deadline.timeLimitDays).toBe(10);
      expect(act.deadline.dayType).toBe(DayType.CONSECUTIVE);
      expect(act.deadline.computedDueDate).toEqual(day('2026-10-15'));
    });

    it('el plazo corre desde la fecha del acto en el fuero penal', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(command({ actDate: day('2026-10-02') }));

      expect(act.deadline.countsFrom).toEqual(day('2026-10-02'));
    });
  });

  describe('fuero administrativo (CA-26.4, RN6)', () => {
    const administrative = () => build({ existing: anAdministrativeCase() });
    const administrativeCommand = (overrides: Partial<RegisterProceduralActCommand> = {}) =>
      command({ proceduralStateId: ADMINISTRATIVE_STATE.id, actDate: day('2026-10-02'), ...overrides });

    it('exige la fecha de notificación si el estado abre plazo', async () => {
      const { useCase, acts } = administrative();

      const details = await validationDetailsOf(() => useCase.execute(administrativeCommand()));

      expect(details).toEqual({
        notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).',
      });
      expect(acts.saved).toEqual([]);
    });

    it('computa el plazo desde la notificación y no desde la fecha del acto', async () => {
      const { useCase, calculator } = administrative();

      const { act } = await useCase.execute(administrativeCommand({ notificationDate: day('2026-10-05') }));

      expect(calculator.calls).toEqual([{ countsFrom: day('2026-10-05'), days: 10, dayType: DayType.BUSINESS }]);
      expect(act.deadline.countsFrom).toEqual(day('2026-10-05'));
      expect(act.notificationDate).toEqual(day('2026-10-05'));
    });

    it('no exige la notificación si el estado no abre plazo', async () => {
      const withoutTerm = aProceduralState({
        id: 32,
        name: 'Con vista',
        jurisdictionId: 2,
        timeLimitDays: 0,
        dayType: DayType.NONE,
      });
      const { useCase, calculator } = build({
        existing: anAdministrativeCase(),
        states: [...STATES_TABLE, withoutTerm],
      });

      const { act } = await useCase.execute(command({ proceduralStateId: withoutTerm.id }));

      expect(act.deadline.dueDate).toBeNull();
      expect(calculator.calls).toEqual([]);
    });

    it('rechaza una notificación anterior al acto o posterior a hoy', async () => {
      const { useCase } = administrative();

      const before = await validationDetailsOf(() =>
        useCase.execute(administrativeCommand({ notificationDate: day('2026-10-01') })),
      );
      const after = await validationDetailsOf(() =>
        useCase.execute(administrativeCommand({ notificationDate: day('2026-10-07') })),
      );

      expect(before).toEqual({ notificationDate: 'Debe estar entre la fecha del acto y hoy.' });
      expect(after).toEqual({ notificationDate: 'Debe estar entre la fecha del acto y hoy.' });
    });

    it('en los otros fueros no se informa la notificación', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() => useCase.execute(command({ notificationDate: day('2026-10-05') })));

      expect(details).toEqual({ notificationDate: 'Solo se informa en el fuero administrativo.' });
    });
  });

  describe('ajuste manual del vencimiento (CA-26.5)', () => {
    it('el vencimiento ajustado pasa a ser el vigente y se conserva el calculado', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(command({ manualDueDate: day('2026-10-20') }));

      expect(act.deadline.dueDate).toEqual(day('2026-10-20'));
      expect(act.deadline.manualDueDate).toEqual(day('2026-10-20'));
      expect(act.deadline.computedDueDate).toEqual(day('2026-10-10'));
    });

    it('deja constancia de que fue ajustado y de quién lo registró', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(
        command({ manualDueDate: day('2026-10-20'), actor: anActor({ userId: 41 }) }),
      );

      expect(act.deadline.manuallyAdjusted).toBe(true);
      expect(act.registeredByUserId).toBe(41);
    });

    it('sin ajuste, el vencimiento no figura como ajustado', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(command());

      expect(act.deadline.manuallyAdjusted).toBe(false);
    });

    it('rechaza un ajuste anterior a la fecha desde la que corre el plazo', async () => {
      const { useCase, acts } = build();

      const details = await validationDetailsOf(() => useCase.execute(command({ manualDueDate: day('2026-10-04') })));

      expect(details).toEqual({ manualDueDate: 'No puede ser anterior a la fecha desde la que corre el plazo.' });
      expect(acts.saved).toEqual([]);
    });
  });

  describe('plazo copiado al acto (CA-26.6)', () => {
    it('el acto guarda los días y el tipo de día de la tabla al momento del registro', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(command());

      expect(act.deadline.timeLimitDays).toBe(OPPOSITION.timeLimitDays);
      expect(act.deadline.dayType).toBe(OPPOSITION.dayType);
    });

    it('si luego cambia el plazo del estado en la tabla, el vencimiento del acto no cambia', async () => {
      const table = [...STATES_TABLE];
      const { useCase, acts } = build({ states: table });
      const { act } = await useCase.execute(command());
      const dueDate = act.deadline.dueDate;

      table[table.indexOf(OPPOSITION)] = { ...OPPOSITION, timeLimitDays: 30, dayType: DayType.CONSECUTIVE };

      expect(acts.saved[0]).toBe(act);
      expect(act.deadline.dueDate).toEqual(dueDate);
      expect(act.deadline.timeLimitDays).toBe(5);
      expect(act.deadline.dayType).toBe(DayType.BUSINESS);
    });
  });

  describe('estado escrito a mano (CA-26.7)', () => {
    const custom = (overrides: Partial<RegisterProceduralActCommand> = {}) =>
      command({ proceduralStateId: null, customState: 'Pedido de informes al Registro Nacional', ...overrides });

    it('queda guardado solo en esa causa, sin estado de la tabla', async () => {
      const { useCase, existing, cases } = build();

      const { act, resultingStateName } = await useCase.execute(custom());

      expect(act.proceduralStateId).toBeNull();
      expect(act.customState).toBe('Pedido de informes al Registro Nacional');
      expect(resultingStateName).toBe('Pedido de informes al Registro Nacional');
      expect(existing.currentStateId).toBeNull();
      expect(existing.currentCustomState).toBe('Pedido de informes al Registro Nacional');
      expect(cases.currentActUpdates[0]).toMatchObject({ currentStateId: null });
    });

    it('no abre plazo: no usa el calculador y el plazo es de cero días', async () => {
      const { useCase, calculator } = build();

      const { act } = await useCase.execute(custom());

      expect(calculator.calls).toEqual([]);
      expect(act.deadline.opensTerm()).toBe(false);
      expect(act.deadline.timeLimitDays).toBe(0);
      expect(act.deadline.dayType).toBe(DayType.NONE);
      expect(act.deadline.computedDueDate).toBeNull();
      expect(act.deadline.dueDate).toBeNull();
    });

    it('tiene vencimiento únicamente si se carga a mano', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(custom({ manualDueDate: day('2026-10-25') }));

      expect(act.deadline.dueDate).toEqual(day('2026-10-25'));
      expect(act.deadline.manuallyAdjusted).toBe(true);
      expect(act.deadline.computedDueDate).toBeNull();
    });

    it('recorta los espacios del texto', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(custom({ customState: '  Pedido de informes  ' }));

      expect(act.customState).toBe('Pedido de informes');
    });

    it('no puede coincidir con un estado de la tabla del fuero, sin distinguir mayúsculas', async () => {
      const { useCase, acts } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(custom({ customState: 'OPOSICIÓN AL REQUERIMIENTO DE ELEVACIÓN' })),
      );

      expect(details).toEqual({ customState: 'Coincide con un estado de la tabla del fuero: elegilo de la lista.' });
      expect(acts.saved).toEqual([]);
    });

    it('no puede llamarse como el estado inicial', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() => useCase.execute(custom({ customState: 'iniciada' })));

      expect(Object.keys(details ?? {})).toEqual(['customState']);
    });

    it('puede repetir el nombre de un estado de otro fuero', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(custom({ customState: ADMINISTRATIVE_STATE.name }));

      expect(act.customState).toBe(ADMINISTRATIVE_STATE.name);
    });

    it('puede repetir el nombre de un estado dado de baja', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(custom({ customState: DEACTIVATED.name }));

      expect(act.customState).toBe(DEACTIVATED.name);
    });

    it('rechaza un texto de más de 255 caracteres', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() => useCase.execute(custom({ customState: 'a'.repeat(256) })));

      expect(details).toEqual({ customState: 'Debe tener hasta 255 caracteres.' });
    });
  });

  describe('un acto puede cerrar la causa en un estado terminal (D-69)', () => {
    it('lleva la causa a "Archivada": queda en el estado terminal y sin vencimiento', async () => {
      const { useCase, existing, acts } = build();

      const { act, becameCurrent } = await useCase.execute(command({ proceduralStateId: ARCHIVED.id }));

      expect(becameCurrent).toBe(true);
      expect(acts.saved).toEqual([act]);
      expect(existing.currentStateId).toBe(ARCHIVED.id);
      expect(act.deadline.dueDate).toBeNull();
    });

    it('cerrada la causa, ya no admite actos nuevos', async () => {
      const { useCase } = build();
      await useCase.execute(command({ proceduralStateId: ARCHIVED.id }));

      await expect(useCase.execute(command({ actDate: day('2026-10-06') }))).rejects.toBeInstanceOf(
        CaseInTerminalStateError,
      );
    });

    it('un estado terminal no admite vencimiento manual', async () => {
      const { useCase, acts } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(command({ proceduralStateId: ARCHIVED.id, manualDueDate: day('2026-10-20') })),
      );

      expect(details).toEqual({ manualDueDate: 'Un estado terminal cierra la causa y no admite vencimiento.' });
      expect(acts.saved).toEqual([]);
    });
  });

  describe('estados que no se ofrecen como destino (CA-26.8)', () => {
    it('rechaza "Prescripta": tiene su propio formulario (HU33)', async () => {
      const { useCase, acts } = build();

      const details = await validationDetailsOf(() => useCase.execute(command({ proceduralStateId: PRESCRIBED.id })));

      expect(details).toEqual({
        proceduralStateId: 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.',
      });
      expect(acts.saved).toEqual([]);
    });

    it('rechaza el estado inicial: no es destino de un acto', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(command({ proceduralStateId: INITIAL_STATES.CRIMINAL.id })),
      );

      expect(Object.keys(details ?? {})).toEqual(['proceduralStateId']);
    });

    it('rechaza un estado de otro fuero', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(command({ proceduralStateId: ADMINISTRATIVE_STATE.id })),
      );

      expect(details).toEqual({
        proceduralStateId: 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.',
      });
    });

    it('rechaza un estado dado de baja o inexistente', async () => {
      const { useCase } = build();

      const deactivated = await validationDetailsOf(() => useCase.execute(command({ proceduralStateId: DEACTIVATED.id })));
      const missing = await validationDetailsOf(() => useCase.execute(command({ proceduralStateId: 999 })));

      const expected = { proceduralStateId: 'No existe un estado procesal vigente con ese identificador.' };
      expect(deactivated).toEqual(expected);
      expect(missing).toEqual(expected);
    });

    it('exige indicar el estado de la tabla o uno escrito a mano, y no ambos', async () => {
      const { useCase } = build();
      const expected = {
        proceduralStateId: 'Indicá un estado procesal de la tabla o un estado escrito a mano, no ambos.',
      };

      const both = await validationDetailsOf(() => useCase.execute(command({ customState: 'Otro' })));
      const none = await validationDetailsOf(() => useCase.execute(command({ proceduralStateId: null })));

      expect(both).toEqual(expected);
      expect(none).toEqual(expected);
    });
  });

  describe('primer acto de la causa (CA-26.9)', () => {
    it('saca a la causa del estado inicial y la lleva a cualquier estado no terminal', async () => {
      const { useCase, existing } = build();
      expect(existing.currentStateId).toBe(INITIAL_STATES.CRIMINAL.id);

      await useCase.execute(command({ proceduralStateId: SUMMONS.id }));

      expect(existing.currentStateId).toBe(SUMMONS.id);
      expect(existing.currentProceduralActId).not.toBeNull();
    });

    it('también puede llevarla a un estado escrito a mano', async () => {
      const { useCase, existing } = build();

      await useCase.execute(command({ proceduralStateId: null, customState: 'Pedido de informes' }));

      expect(existing.currentStateId).toBeNull();
      expect(existing.currentCustomState).toBe('Pedido de informes');
    });

    it('puede llevarla a un estado sin plazo', async () => {
      const { useCase, existing } = build();

      await useCase.execute(command({ proceduralStateId: WITHOUT_TERM.id }));

      expect(existing.currentStateId).toBe(WITHOUT_TERM.id);
    });
  });

  describe('acto con fecha anterior al último (CA-26.10)', () => {
    function withCurrentAct() {
      const current = anAct({ id: 1, proceduralStateId: SUMMONS.id, actDate: day('2026-10-05') });
      return build({ existing: aCaseInState({ currentAct: current }) });
    }

    it('queda asentado pero no retrocede el estado actual ni reemplaza el vencimiento vigente', async () => {
      const { useCase, acts, existing } = withCurrentAct();

      const { act, becameCurrent } = await useCase.execute(command({ actDate: day('2026-10-01') }));

      expect(becameCurrent).toBe(false);
      expect(acts.saved).toEqual([act]);
      expect(existing.currentStateId).toBe(SUMMONS.id);
      expect(existing.currentProceduralActId).toBe(1);
    });

    it('no vuelve a guardar la causa', async () => {
      const { useCase, cases } = withCurrentAct();

      await useCase.execute(command({ actDate: day('2026-10-01') }));

      expect(cases.currentActUpdates).toEqual([]);
    });

    it('un acto posterior sí reemplaza el estado y el vencimiento vigentes', async () => {
      const { useCase, cases, existing } = withCurrentAct();

      const { act, becameCurrent } = await useCase.execute(command({ actDate: day('2026-10-06') }));

      expect(becameCurrent).toBe(true);
      expect(existing.currentStateId).toBe(OPPOSITION.id);
      expect(cases.currentActUpdates).toHaveLength(1);
      expect(existing.currentProceduralActId).toBe(act.id);
    });
  });

  describe('fecha del acto (CA-26.11)', () => {
    it('rechaza una fecha posterior a hoy y no guarda nada', async () => {
      const { useCase, acts, cases } = build();

      const details = await validationDetailsOf(() => useCase.execute(command({ actDate: day('2026-10-07') })));

      expect(details).toEqual({ actDate: 'No puede ser posterior a la fecha de hoy.' });
      expect(acts.saved).toEqual([]);
      expect(cases.currentActUpdates).toEqual([]);
    });

    it('acepta un acto de hoy', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(command({ actDate: TODAY }));

      expect(act.actDate).toEqual(TODAY);
    });

    it('rechaza una fecha inválida', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(command({ actDate: new Date('no es una fecha') })),
      );

      expect(details).toEqual({ actDate: 'Debe ser una fecha válida (AAAA-MM-DD).' });
    });
  });

  describe('estado sin plazo (CA-26.12)', () => {
    it('si no se carga un vencimiento manual, la causa queda sin vencimiento vigente', async () => {
      const { useCase, calculator, existing } = build();

      const { act } = await useCase.execute(command({ proceduralStateId: WITHOUT_TERM.id }));

      expect(act.deadline.opensTerm()).toBe(false);
      expect(act.deadline.dueDate).toBeNull();
      expect(calculator.calls).toEqual([]);
      const current = existing.proceduralActs.find((candidate) => candidate.id === existing.currentProceduralActId);
      expect(current?.deadline.dueDate).toBeNull();
    });

    it('si se carga a mano, ese es el vencimiento vigente', async () => {
      const { useCase } = build();

      const { act } = await useCase.execute(
        command({ proceduralStateId: WITHOUT_TERM.id, manualDueDate: day('2026-10-12') }),
      );

      expect(act.deadline.dueDate).toEqual(day('2026-10-12'));
      expect(act.deadline.manuallyAdjusted).toBe(true);
    });
  });

  describe('errores y orden de los controles', () => {
    it('una causa que no existe responde causa no encontrada', async () => {
      const { useCase } = build();

      const error = await useCase.execute(command({ caseId: 999 })).catch((caught) => caught);

      expect(error).toBeInstanceOf(CaseNotFoundError);
      expect(error.code).toBe('CASE_NOT_FOUND');
    });

    it('una causa en estado terminal no admite actos', async () => {
      const { useCase, acts } = build({ existing: aCaseInState({ currentStateId: ARCHIVED.id }) });

      const error = await useCase.execute(command()).catch((caught) => caught);

      expect(error).toBeInstanceOf(CaseInTerminalStateError);
      expect(error.code).toBe('CASE_IN_TERMINAL_STATE');
      expect(acts.saved).toEqual([]);
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

    it('un estado que no abre plazo no tiene vencimiento ni días que restan', async () => {
      const { useCase, calculator } = build();

      const preview = await useCase.previewDeadline(query({ proceduralStateId: WITHOUT_TERM.id }));

      expect(preview).toEqual({
        proceduralStateId: WITHOUT_TERM.id,
        timeLimitDays: 0,
        dayType: DayType.NONE,
        countsFrom: day('2026-10-05'),
        dueDate: null,
        businessDaysRemaining: null,
      });
      expect(calculator.calls).toEqual([]);
      expect(calculator.businessDaysCalls).toEqual([]);
    });

    describe('fuero administrativo (RN6)', () => {
      const administrative = () => build({ existing: anAdministrativeCase() });
      const administrativeQuery = (overrides: Partial<PreviewProceduralActDeadlineQuery> = {}) =>
        query({ proceduralStateId: ADMINISTRATIVE_STATE.id, actDate: day('2026-10-02'), ...overrides });

      it('el plazo corre desde la notificación y no desde la fecha del acto', async () => {
        const { useCase, calculator } = administrative();

        const preview = await useCase.previewDeadline(administrativeQuery({ notificationDate: day('2026-10-05') }));

        expect(preview.countsFrom).toEqual(day('2026-10-05'));
        expect(calculator.calls).toEqual([{ countsFrom: day('2026-10-05'), days: 10, dayType: DayType.BUSINESS }]);
      });

      it('exige la notificación si el estado abre plazo', async () => {
        const { useCase } = administrative();

        const details = await invalidRequestOf(() => useCase.previewDeadline(administrativeQuery()));

        expect(details).toEqual({
          notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).',
        });
      });

      it('en los otros fueros no se informa la notificación', async () => {
        const { useCase } = build();

        const details = await invalidRequestOf(() =>
          useCase.previewDeadline(query({ notificationDate: day('2026-10-05') })),
        );

        expect(details).toEqual({ notificationDate: 'Solo se informa en el fuero administrativo.' });
      });
    });

    describe('las mismas restricciones que el registro, con el código de la query', () => {
      it.each([
        ['el estado Prescripta', PRESCRIBED.id],
        ['el estado inicial', INITIAL_STATES.CRIMINAL.id],
        ['un estado de otro fuero', ADMINISTRATIVE_STATE.id],
      ])('rechaza %s', async (_name, proceduralStateId) => {
        const { useCase } = build();

        const details = await invalidRequestOf(() => useCase.previewDeadline(query({ proceduralStateId })));

        expect(details).toEqual({
          proceduralStateId: 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.',
        });
      });

      it('acepta un estado terminal: no abre plazo, no hay vencimiento', async () => {
        const { useCase } = build();

        const preview = await useCase.previewDeadline(query({ proceduralStateId: ARCHIVED.id }));

        expect(preview).toMatchObject({ proceduralStateId: ARCHIVED.id, dueDate: null, businessDaysRemaining: null });
      });

      it('rechaza un estado dado de baja o inexistente', async () => {
        const { useCase } = build();

        const deactivated = await invalidRequestOf(() => useCase.previewDeadline(query({ proceduralStateId: DEACTIVATED.id })));
        const missing = await invalidRequestOf(() => useCase.previewDeadline(query({ proceduralStateId: 999 })));

        const expected = { proceduralStateId: 'No existe un estado procesal vigente con ese identificador.' };
        expect(deactivated).toEqual(expected);
        expect(missing).toEqual(expected);
      });

      it('el estado es obligatorio: no hay previsualización de un estado escrito a mano', async () => {
        const { useCase } = build();

        const details = await invalidRequestOf(() => useCase.previewDeadline(query({ proceduralStateId: null })));

        expect(details).toEqual({ proceduralStateId: 'Es obligatorio.' });
      });

      it('rechaza una fecha del acto posterior a hoy (CA-26.11)', async () => {
        const { useCase } = build();

        const details = await invalidRequestOf(() => useCase.previewDeadline(query({ actDate: day('2026-10-07') })));

        expect(details).toEqual({ actDate: 'No puede ser posterior a la fecha de hoy.' });
      });

      it('acepta un acto de hoy', async () => {
        const { useCase } = build();

        const preview = await useCase.previewDeadline(query({ actDate: TODAY }));

        expect(preview.countsFrom).toEqual(TODAY);
      });
    });

    describe('quién puede previsualizar', () => {
      it('una causa que no existe responde causa no encontrada', async () => {
        const { useCase } = build();

        await expect(useCase.previewDeadline(query({ caseId: 999 }))).rejects.toBeInstanceOf(CaseNotFoundError);
      });

      it.each([
        ['otro abogado', anActor({ lawyerId: 99 })],
        ['un administrador que no es abogado', anActor({ roleNames: ['ADMINISTRATOR'] })],
        ['un usuario sin ficha de abogado', anActor({ lawyerId: null })],
      ])('se lo deniega a %s, igual que el registro (CA-26.2)', async (_name, actor) => {
        const { useCase, calculator } = build();

        await expect(useCase.previewDeadline(query({ actor }))).rejects.toBeInstanceOf(NotResponsibleLawyerError);
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
