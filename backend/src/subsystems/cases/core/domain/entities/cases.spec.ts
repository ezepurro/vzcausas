import { CaseInTerminalStateError, NotResponsibleLawyerError } from '../errors/case.errors';
import { DayType } from '../value-objects/day-type';
import { Deadline } from '../value-objects/deadline';
import {
  aCase,
  aCaseInState,
  anAct,
  anActor,
  anAdministrativeCase,
  day,
  INITIAL_STATES,
  NOW,
  OPPOSITION,
  SUMMONS,
  TODAY,
  validationDetailsOf,
} from '../../test-support/case-fixtures';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { ProceduralRole } from '../value-objects/procedural-role';
import { Case, RegisterProceduralActInput } from './cases';

const LATER = new Date('2026-10-06T18:00:00.000Z');

function aDeadline(countsFrom: string): Deadline {
  return Deadline.create({
    timeLimitDays: 5,
    dayType: DayType.BUSINESS,
    countsFrom: day(countsFrom),
    computedDueDate: day('2026-10-12'),
    manualDueDate: null,
  });
}

function anActInput(overrides: Partial<RegisterProceduralActInput> = {}): RegisterProceduralActInput {
  return {
    id: 7,
    proceduralStateId: OPPOSITION.id,
    customState: null,
    actDate: day('2026-10-05'),
    notificationDate: null,
    notes: null,
    deadline: aDeadline('2026-10-05'),
    actor: anActor(),
    currentStateIsTerminal: false,
    today: TODAY,
    now: LATER,
    ...overrides,
  };
}

describe('Case', () => {
  describe('quién registra actos (CA-26.2)', () => {
    it('lo permite al abogado responsable de la causa', () => {
      expect(() => aCase().assertCanRegisterActs(anActor())).not.toThrow();
    });

    it('lo deniega a otro abogado, aunque tenga el rol', () => {
      const otherLawyer = anActor({ lawyerId: 99 });

      expect(() => aCase().assertCanRegisterActs(otherLawyer)).toThrow(NotResponsibleLawyerError);
    });

    it('lo deniega a un administrador que no tiene el rol de abogado, aunque su ficha sea la del responsable', () => {
      const administrator = anActor({ roleNames: ['ADMINISTRATOR'] });

      expect(() => aCase().assertCanRegisterActs(administrator)).toThrow(NotResponsibleLawyerError);
    });

    it('lo deniega a quien no tiene ficha de abogado', () => {
      const withoutFile = anActor({ roleNames: ['LAWYER', 'ADMINISTRATOR'], lawyerId: null });

      expect(() => aCase().assertCanRegisterActs(withoutFile)).toThrow(NotResponsibleLawyerError);
    });

    it('lo permite a quien es abogado y administrador a la vez, si es el responsable', () => {
      const both = anActor({ roleNames: ['ADMINISTRATOR', 'LAWYER'] });

      expect(() => aCase().assertCanRegisterActs(both)).not.toThrow();
    });

    it('la denegación se informa con el código FORBIDDEN', () => {
      expect(new NotResponsibleLawyerError().code).toBe('FORBIDDEN');
    });
  });

  describe('causa cerrada', () => {
    it('no admite actos si está en un estado terminal', () => {
      const error = (() => {
        try {
          aCase().assertAcceptsActs(true);
        } catch (caught) {
          return caught;
        }
      })();

      expect(error).toBeInstanceOf(CaseInTerminalStateError);
      expect((error as CaseInTerminalStateError).code).toBe('CASE_IN_TERMINAL_STATE');
    });

    it('admite actos si no está en un estado terminal', () => {
      expect(() => aCase().assertAcceptsActs(false)).not.toThrow();
    });
  });

  describe('desde cuándo corre el plazo (CA-26.3, CA-26.4)', () => {
    it('en el fuero penal corre desde la fecha del acto', () => {
      const countsFrom = aCase().resolveCountsFrom(day('2026-10-05'), null, true);

      expect(countsFrom).toEqual(day('2026-10-05'));
    });

    it('en el amparo corre desde la fecha del acto', () => {
      const amparo = aCase({
        jurisdictionCode: JurisdictionCode.AMPARO,
        proceduralRole: ProceduralRole.ACTORA,
        subjectMatter: 'Que se ordene la cobertura integral.',
      });

      expect(amparo.resolveCountsFrom(day('2026-10-05'), null, true)).toEqual(day('2026-10-05'));
    });

    it.each([
      ['penal', () => aCase()],
      [
        'de amparo',
        () =>
          aCase({
            jurisdictionCode: JurisdictionCode.AMPARO,
            proceduralRole: ProceduralRole.ACTORA,
            subjectMatter: 'Que se ordene la cobertura integral.',
          }),
      ],
    ])('la causa %s no admite fecha de notificación', async (_name, build: () => Case) => {
      const details = await validationDetailsOf(() =>
        build().resolveCountsFrom(day('2026-10-05'), day('2026-10-06'), true),
      );

      expect(details).toEqual({ notificationDate: 'Solo se informa en el fuero administrativo.' });
    });

    it('en el fuero administrativo corre desde la notificación y no desde el acto (RN6)', () => {
      const countsFrom = anAdministrativeCase().resolveCountsFrom(day('2026-10-02'), day('2026-10-05'), true);

      expect(countsFrom).toEqual(day('2026-10-05'));
    });

    it('en el fuero administrativo la notificación es obligatoria si el estado abre plazo', async () => {
      const details = await validationDetailsOf(() =>
        anAdministrativeCase().resolveCountsFrom(day('2026-10-02'), null, true),
      );

      expect(details).toEqual({
        notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).',
      });
    });

    it('en el fuero administrativo, un estado sin plazo no necesita notificación y cuenta desde el acto', () => {
      const countsFrom = anAdministrativeCase().resolveCountsFrom(day('2026-10-02'), null, false);

      expect(countsFrom).toEqual(day('2026-10-02'));
    });
  });

  describe('registrar un acto', () => {
    it('el primer acto saca a la causa del estado inicial y la lleva al estado del acto (CA-26.1, CA-26.9)', () => {
      const targetCase = aCase();
      expect(targetCase.currentStateId).toBe(INITIAL_STATES.CRIMINAL.id);
      expect(targetCase.currentProceduralActId).toBeNull();

      const { act, becameCurrent } = targetCase.registerProceduralAct(anActInput());

      expect(becameCurrent).toBe(true);
      expect(targetCase.currentStateId).toBe(OPPOSITION.id);
      expect(targetCase.currentCustomState).toBeNull();
      expect(targetCase.currentProceduralActId).toBe(act.id);
      expect(targetCase.updatedAt).toBe(LATER);
      expect(targetCase.proceduralActs).toEqual([act]);
    });

    it('la causa pasa a un estado escrito a mano, y deja de estar en uno de la tabla (CA-26.9)', () => {
      const targetCase = aCase();

      targetCase.registerProceduralAct(
        anActInput({ proceduralStateId: null, customState: 'Pedido de informes al Registro' }),
      );

      expect(targetCase.currentStateId).toBeNull();
      expect(targetCase.currentCustomState).toBe('Pedido de informes al Registro');
    });

    it('un estado de la tabla reemplaza al escrito a mano que la causa tenía', () => {
      const custom = anAct({ proceduralStateId: null, customState: 'Pedido de informes', actDate: day('2026-10-01') });
      const targetCase = aCaseInState({ currentAct: custom });

      targetCase.registerProceduralAct(anActInput());

      expect(targetCase.currentCustomState).toBeNull();
      expect(targetCase.currentStateId).toBe(OPPOSITION.id);
    });

    it('el acto guarda quién lo registró y el responsable de la causa en ese momento (CA-26.5)', () => {
      const { act } = aCase().registerProceduralAct(anActInput({ actor: anActor({ userId: 41 }) }));

      expect(act.registeredByUserId).toBe(41);
      expect(act.registeredByLawyerId).toBe(2);
      expect(act.registeredAt).toBe(LATER);
      expect(act.caseId).toBe(1);
    });

    it('el vencimiento de la causa pasa a ser el del acto (CA-26.1)', () => {
      const targetCase = aCase();

      const { act } = targetCase.registerProceduralAct(anActInput());

      const current = targetCase.proceduralActs.find((candidate) => candidate.id === targetCase.currentProceduralActId);
      expect(current).toBe(act);
      expect(current?.deadline.dueDate).toEqual(day('2026-10-12'));
    });

    describe('acto con fecha anterior al del último (CA-26.10)', () => {
      it('queda asentado, pero no retrocede el estado ni reemplaza el vencimiento vigente', () => {
        const current = anAct({ id: 1, proceduralStateId: SUMMONS.id, actDate: day('2026-10-05') });
        const targetCase = aCaseInState({ currentAct: current });

        const { act, becameCurrent } = targetCase.registerProceduralAct(
          anActInput({ id: 2, actDate: day('2026-10-01'), deadline: aDeadline('2026-10-01') }),
        );

        expect(becameCurrent).toBe(false);
        expect(targetCase.proceduralActs).toContain(act);
        expect(targetCase.currentStateId).toBe(SUMMONS.id);
        expect(targetCase.currentProceduralActId).toBe(1);
        expect(targetCase.updatedAt).toBe(NOW);
      });

      it('un acto de la misma fecha pasa a ser el vigente: gana el último registrado', () => {
        const current = anAct({ id: 1, proceduralStateId: SUMMONS.id, actDate: day('2026-10-05') });
        const targetCase = aCaseInState({ currentAct: current });

        const { act, becameCurrent } = targetCase.registerProceduralAct(anActInput({ id: 2 }));

        expect(becameCurrent).toBe(true);
        expect(targetCase.currentProceduralActId).toBe(act.id);
        expect(targetCase.currentStateId).toBe(OPPOSITION.id);
      });

      it('un acto posterior pasa a ser el vigente', () => {
        const current = anAct({ id: 1, proceduralStateId: SUMMONS.id, actDate: day('2026-10-01') });
        const targetCase = aCaseInState({ currentAct: current });

        const { becameCurrent } = targetCase.registerProceduralAct(anActInput({ id: 2 }));

        expect(becameCurrent).toBe(true);
        expect(targetCase.currentProceduralActId).toBe(2);
      });
    });

    describe('lo que se rechaza, sin tocar la causa', () => {
      it('no lo registra quien no es el abogado responsable (CA-26.2)', () => {
        const targetCase = aCase();

        expect(() => targetCase.registerProceduralAct(anActInput({ actor: anActor({ lawyerId: 99 }) }))).toThrow(
          NotResponsibleLawyerError,
        );
        expect(targetCase.proceduralActs).toEqual([]);
        expect(targetCase.currentProceduralActId).toBeNull();
      });

      it('no se registra sobre una causa en estado terminal', () => {
        const targetCase = aCase();

        expect(() => targetCase.registerProceduralAct(anActInput({ currentStateIsTerminal: true }))).toThrow(
          CaseInTerminalStateError,
        );
        expect(targetCase.proceduralActs).toEqual([]);
      });

      it('no se registra un acto con fecha posterior a hoy (CA-26.11)', async () => {
        const targetCase = aCase();

        const details = await validationDetailsOf(() =>
          targetCase.registerProceduralAct(anActInput({ actDate: day('2026-10-07') })),
        );

        expect(details).toEqual({ actDate: 'No puede ser posterior a la fecha de hoy.' });
        expect(targetCase.proceduralActs).toEqual([]);
        expect(targetCase.currentStateId).toBe(INITIAL_STATES.CRIMINAL.id);
        expect(targetCase.updatedAt).toBe(NOW);
      });

      it('el responsable se controla antes que el estado de la causa y que los datos', () => {
        const targetCase = aCase();
        const input = anActInput({
          actor: anActor({ lawyerId: 99 }),
          currentStateIsTerminal: true,
          actDate: day('2026-12-01'),
        });

        expect(() => targetCase.registerProceduralAct(input)).toThrow(NotResponsibleLawyerError);
      });
    });
  });

  it('cuando el acto vigente declarado no está cargado es un error de integridad, no del usuario', () => {
    const current = anAct({ id: 1 });
    const targetCase = aCaseInState({ currentAct: current });
    targetCase.proceduralActs.length = 0;

    expect(() => targetCase.registerProceduralAct(anActInput({ id: 2 }))).toThrow(/is not loaded/);
  });
});
