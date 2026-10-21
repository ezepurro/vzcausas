import { CaseInTerminalStateError, NotResponsibleLawyerError, PrescriptionNotApplicableError } from '../errors/case.errors';
import { DayType } from '../value-objects/day-type';
import { Deadline } from '../value-objects/deadline';
import {
  aCase,
  aCaseInState,
  anAct,
  anActor,
  anAdministrativeCase,
  ADMINISTRATIVE_STATE,
  ARCHIVED,
  day,
  DEACTIVATED,
  INITIAL_STATES,
  NOW,
  OPPOSITION,
  PRESCRIBED,
  ROBBERY,
  SUMMONS,
  TODAY,
  validationDetailsOf,
} from '../../test-support/case-fixtures';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { ProceduralRole } from '../value-objects/procedural-role';
import { Case, DeclarePrescriptionInput, RegisterProceduralActInput, TargetStateChoice } from './cases';
import { ProceduralAct } from './procedural-act';

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
    target: { proceduralStateId: OPPOSITION.id, customState: null, state: OPPOSITION },
    actDate: day('2026-10-05'),
    notificationDate: null,
    notes: null,
    deadline: aDeadline('2026-10-05'),
    actor: anActor(),
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
          aCaseInState({ currentStateId: ARCHIVED.id }).assertAcceptsActs();
        } catch (caught) {
          return caught;
        }
      })();

      expect(error).toBeInstanceOf(CaseInTerminalStateError);
      expect((error as CaseInTerminalStateError).code).toBe('CASE_IN_TERMINAL_STATE');
    });

    it('admite actos si no está en un estado terminal', () => {
      expect(() => aCase().assertAcceptsActs()).not.toThrow();
    });

    it('el rechazo puede llevar el mensaje de quien lo pide', () => {
      expect(() => aCaseInState({ currentStateId: ARCHIVED.id }).assertAcceptsActs('Mensaje propio.')).toThrow(
        'Mensaje propio.',
      );
    });
  });

  describe('estado al que lleva un acto (CA-26.7, CA-26.8, D-34, D-69)', () => {
    const choice = (overrides: Partial<TargetStateChoice> = {}): TargetStateChoice => ({
      proceduralStateId: OPPOSITION.id,
      customState: null,
      state: OPPOSITION,
      customStateNamesTableState: false,
      ...overrides,
    });

    it('acepta un estado vigente de la tabla del fuero', () => {
      expect(aCase().resolveTargetState(choice())).toEqual({
        proceduralStateId: OPPOSITION.id,
        customState: null,
        state: OPPOSITION,
      });
    });

    it('acepta un estado terminal: así se cierra una causa', () => {
      const target = aCase().resolveTargetState(choice({ proceduralStateId: ARCHIVED.id, state: ARCHIVED }));

      expect(target.state).toBe(ARCHIVED);
    });

    it('acepta un estado escrito a mano que no repite uno de la tabla', () => {
      const target = aCase().resolveTargetState(
        choice({ proceduralStateId: null, state: null, customState: 'Pedido de informes' }),
      );

      expect(target).toEqual({ proceduralStateId: null, customState: 'Pedido de informes', state: null });
    });

    it.each([
      ['ninguno de los dos', { proceduralStateId: null, state: null, customState: null }],
      ['los dos', { customState: 'Pedido de informes' }],
    ])('exige un estado de la tabla o uno escrito a mano, y no %s', async (_case, overrides) => {
      const details = await validationDetailsOf(() => aCase().resolveTargetState(choice(overrides)));

      expect(details).toEqual({
        proceduralStateId: 'Indicá un estado procesal de la tabla o un estado escrito a mano, no ambos.',
      });
    });

    it.each([
      ['inexistente', { state: null }],
      ['dado de baja', { proceduralStateId: DEACTIVATED.id, state: DEACTIVATED }],
    ])('rechaza un estado %s', async (_case, overrides) => {
      const details = await validationDetailsOf(() => aCase().resolveTargetState(choice(overrides)));

      expect(details).toEqual({ proceduralStateId: 'No existe un estado procesal vigente con ese identificador.' });
    });

    it.each([
      ['de otro fuero', ADMINISTRATIVE_STATE],
      ['Prescripta, que tiene su propio formulario', PRESCRIBED],
      ['el inicial, que no es destino de un acto', INITIAL_STATES.CRIMINAL],
    ])('rechaza un estado %s', async (_case, state) => {
      const details = await validationDetailsOf(() =>
        aCase().resolveTargetState(choice({ proceduralStateId: state.id, state })),
      );

      expect(details).toEqual({
        proceduralStateId: 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.',
      });
    });

    it('rechaza un estado escrito a mano que repite el nombre de uno de la tabla', async () => {
      const details = await validationDetailsOf(() =>
        aCase().resolveTargetState(
          choice({ proceduralStateId: null, state: null, customState: 'Archivada', customStateNamesTableState: true }),
        ),
      );

      expect(details).toEqual({ customState: 'Coincide con un estado de la tabla del fuero: elegilo de la lista.' });
    });
  });

  describe('plazo que abre el estado (RN5, D-69)', () => {
    const dates = (overrides: { manualDueDate?: Date | null } = {}) => ({
      actDate: day('2026-10-05'),
      notificationDate: null,
      manualDueDate: null,
      ...overrides,
    });

    it('toma los días y el tipo de día del estado, y cuenta desde la fecha del acto', () => {
      const term = aCase().openTerm({ proceduralStateId: SUMMONS.id, customState: null, state: SUMMONS }, dates());

      expect(term).toEqual({ timeLimitDays: 10, dayType: DayType.CONSECUTIVE, countsFrom: day('2026-10-05') });
    });

    it('un estado escrito a mano no abre plazo', () => {
      const term = aCase().openTerm({ proceduralStateId: null, customState: 'Pedido de informes', state: null }, dates());

      expect(term).toEqual({ timeLimitDays: 0, dayType: DayType.NONE, countsFrom: day('2026-10-05') });
    });

    it('un estado terminal no admite vencimiento manual', async () => {
      const details = await validationDetailsOf(() =>
        aCase().openTerm(
          { proceduralStateId: ARCHIVED.id, customState: null, state: ARCHIVED },
          dates({ manualDueDate: day('2026-10-20') }),
        ),
      );

      expect(details).toEqual({ manualDueDate: 'Un estado terminal cierra la causa y no admite vencimiento.' });
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
        anActInput({ target: { proceduralStateId: null, customState: 'Pedido de informes al Registro', state: null } }),
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
        const targetCase = aCaseInState({ currentStateId: ARCHIVED.id });

        expect(() => targetCase.registerProceduralAct(anActInput())).toThrow(CaseInTerminalStateError);
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
        const targetCase = aCaseInState({ currentStateId: ARCHIVED.id });
        const input = anActInput({ actor: anActor({ lawyerId: 99 }), actDate: day('2026-12-01') });

        expect(() => targetCase.registerProceduralAct(input)).toThrow(NotResponsibleLawyerError);
      });
    });
  });

  it('cuando el acto vigente declarado no está cargado es un error de integridad, no del usuario', () => {
    const current = anAct({ id: 1 });
    const targetCase = aCaseInState({ currentAct: current, currentActNotLoaded: true });

    expect(() => targetCase.registerProceduralAct(anActInput({ id: 2 }))).toThrow(/is not loaded/);
  });

  describe('la causa conoce si está cerrada', () => {
    it('un acto que la lleva a un estado terminal la cierra, y ya no admite otro', () => {
      const targetCase = aCase();

      targetCase.registerProceduralAct(anActInput({ target: { proceduralStateId: ARCHIVED.id, customState: null, state: ARCHIVED } }));

      expect(() => targetCase.assertAcceptsActs()).toThrow(CaseInTerminalStateError);
    });

    it('un acto más viejo que el vigente no cambia si está cerrada', () => {
      const current = anAct({ id: 1, proceduralStateId: SUMMONS.id, actDate: day('2026-10-05') });
      const targetCase = aCaseInState({ currentAct: current });

      targetCase.registerProceduralAct(
        anActInput({
          id: 2,
          actDate: day('2026-10-01'),
          target: { proceduralStateId: ARCHIVED.id, customState: null, state: ARCHIVED },
        }),
      );

      expect(() => targetCase.assertAcceptsActs()).not.toThrow();
    });

    it('un estado escrito a mano no la cierra: nunca es terminal', () => {
      const targetCase = aCase();

      targetCase.registerProceduralAct(
        anActInput({ target: { proceduralStateId: null, customState: 'Pedido de informes', state: null } }),
      );

      expect(() => targetCase.assertAcceptsActs()).not.toThrow();
    });
  });

  describe('como datos planos (toSnapshot)', () => {
    const anAmparo = () =>
      aCase({
        jurisdictionCode: JurisdictionCode.AMPARO,
        proceduralRole: ProceduralRole.ACTORA,
        subjectMatter: 'Que se ordene la cobertura integral.',
        counterparty: 'APROSS',
        injunctionGranted: true,
      });

    it('una causa penal trae lo suyo y deja en null lo de los otros fueros', () => {
      const snapshot = aCase({ clientDetained: true }).toSnapshot();

      expect(snapshot).toMatchObject({
        jurisdictionCode: JurisdictionCode.CRIMINAL,
        clientDetained: true,
        counterparty: null,
        subjectMatter: null,
        injunctionGranted: null,
        harmfulActDate: null,
        administrativeRemedyExhaustedOn: null,
      });
    });

    it('los hechos de una causa penal salen con su fecha de prescripción, nunca nula', () => {
      const snapshot = aCase({
        legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') }],
        legalQualificationRefs: [ROBBERY],
      }).toSnapshot();

      expect(snapshot.offenses).toHaveLength(1);
      expect(snapshot.offenses[0].prescriptionExpiresOn).toEqual(day('2029-02-27'));
    });

    it('una causa administrativa trae la contraparte, el objeto y la fecha de agotamiento de la vía', () => {
      const snapshot = anAdministrativeCase({
        counterparty: 'APROSS',
        administrativeRemedyExhaustedOn: day('2026-08-10'),
      }).toSnapshot();

      expect(snapshot).toMatchObject({
        jurisdictionCode: JurisdictionCode.ADMINISTRATIVE,
        counterparty: 'APROSS',
        subjectMatter: 'Se impugna la resolución que deniega la cobertura.',
        administrativeRemedyExhaustedOn: day('2026-08-10'),
        clientDetained: null,
        injunctionGranted: null,
        offenses: [],
      });
    });

    it('un amparo trae la medida cautelar y deja en null lo de los otros fueros', () => {
      const snapshot = anAmparo().toSnapshot();

      expect(snapshot).toMatchObject({
        jurisdictionCode: JurisdictionCode.AMPARO,
        counterparty: 'APROSS',
        injunctionGranted: true,
        clientDetained: null,
        administrativeRemedyExhaustedOn: null,
        offenses: [],
      });
    });

    it('el plazo para presentar el amparo es sólo del amparo', () => {
      expect(aCase().harmfulActDeadline(TODAY)).toBeNull();
      expect(anAdministrativeCase().harmfulActDeadline(TODAY)).toBeNull();
      // Sin la fecha del acto lesivo cargada, el amparo tampoco tiene plazo.
      expect(anAmparo().harmfulActDeadline(TODAY)).toBeNull();
    });
  });

  // HU33, CA-33.4, CA-33.5, CA-33.8, CA-33.9, CA-33.10 and CA-33.12 (contract V4 §3.7).
  describe('declarePrescription', () => {
    const LATER_NOW = new Date('2026-10-06T19:00:00.000Z');
    const aCriminalCaseWithOffense = () =>
      aCase({
        legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2025-01-10') }],
        legalQualificationRefs: [ROBBERY],
      });
    const aDeclaration = (overrides: Partial<DeclarePrescriptionInput> = {}): DeclarePrescriptionInput => ({
      data: { prescriptionDate: day('2026-09-15'), resolution: 'Sentencia N° 214', grounds: null },
      prescribedState: PRESCRIBED,
      actor: anActor({ userId: 9, roleNames: ['ADMINISTRATOR'], lawyerId: null }),
      today: TODAY,
      now: LATER_NOW,
      ...overrides,
    });

    it.each([
      ['administrativa', () => anAdministrativeCase()],
      [
        'de amparo',
        () =>
          aCase({
            jurisdictionCode: JurisdictionCode.AMPARO,
            proceduralRole: ProceduralRole.ACTORA,
            subjectMatter: 'Que se ordene la cobertura integral.',
          }),
      ],
    ])('una causa %s no prescribe: PRESCRIPTION_NOT_APPLICABLE del fuero (CA-33.9)', (_fuero, build) => {
      const attempt = () => build().declarePrescription(aDeclaration());

      expect(attempt).toThrow(PrescriptionNotApplicableError);
      expect(attempt).toThrow('La prescripción solo aplica a las causas del fuero penal.');
    });

    it('una causa penal sin calificaciones no prescribe (D-74, CA-33.9)', () => {
      const attempt = () => aCase().declarePrescription(aDeclaration());

      expect(attempt).toThrow(PrescriptionNotApplicableError);
      expect(attempt).toThrow('La causa no tiene calificaciones legales: no puede prescribir.');
    });

    it('una causa cerrada no se marca: CASE_IN_TERMINAL_STATE de "esta operación" (CA-33.8)', () => {
      const archived = aCaseInState({ currentStateId: ARCHIVED.id });

      expect(() => archived.declarePrescription(aDeclaration())).toThrow(
        'La causa se encuentra en un estado terminal y no admite esta operación.',
      );
      expect(archived.currentStateId).toBe(ARCHIVED.id);
    });

    it('pasa a "Prescripta" sin acto vigente, cerrada y con la declaración (CA-33.4, CA-33.5)', () => {
      const prescribed = aCriminalCaseWithOffense();

      prescribed.declarePrescription(aDeclaration());

      expect(prescribed.currentStateId).toBe(PRESCRIBED.id);
      expect(prescribed.currentCustomState).toBeNull();
      expect(prescribed.currentProceduralActId).toBeNull();
      expect(prescribed.updatedAt).toEqual(LATER_NOW);
      expect(prescribed.prescriptionDeclaration).toMatchObject({
        prescriptionDate: day('2026-09-15'),
        resolution: 'Sentencia N° 214',
        grounds: null,
        registeredByUserId: 9,
        registeredAt: LATER_NOW,
      });
      // The case is not given de baja: it stays and keeps its history (CA-33.7).
      expect(prescribed.active).toBe(true);
    });

    it('una vez prescripta no admite actos ni otra marca, y no se deshace (CA-33.8, CA-33.12)', () => {
      const prescribed = aCriminalCaseWithOffense();
      prescribed.declarePrescription(aDeclaration());
      const first = prescribed.prescriptionDeclaration;

      expect(() => prescribed.assertAcceptsActs()).toThrow(CaseInTerminalStateError);
      expect(() => prescribed.declarePrescription(aDeclaration({ data: { prescriptionDate: TODAY, resolution: 'Otra' } }))).toThrow(
        CaseInTerminalStateError,
      );
      expect(prescribed.prescriptionDeclaration).toBe(first);
    });

    it('el negocio va antes que los datos: sin calificaciones da 422 aunque los datos sean inválidos', () => {
      expect(() => aCase().declarePrescription(aDeclaration({ data: { resolution: '' } }))).toThrow(
        PrescriptionNotApplicableError,
      );
    });

    it('con datos inválidos no cambia nada de la causa (CA-33.3)', async () => {
      const target = aCriminalCaseWithOffense();
      const before = target.currentStateId;

      expect(
        await validationDetailsOf(() => target.declarePrescription(aDeclaration({ data: { resolution: ' ' } }))),
      ).toEqual({
        prescriptionDate: 'La fecha de la prescripción es obligatoria.',
        resolution: 'La resolución que declara la prescripción es obligatoria.',
      });
      expect(target.currentStateId).toBe(before);
      expect(target.prescriptionDeclaration).toBeNull();
    });

    it('sin el estado "Prescripta" del fuero penal es un dato roto, no un error del usuario', () => {
      expect(() => aCriminalCaseWithOffense().declarePrescription(aDeclaration({ prescribedState: null }))).toThrow(
        /no "Prescripta" state/,
      );
      expect(() =>
        aCriminalCaseWithOffense().declarePrescription(aDeclaration({ prescribedState: ARCHIVED })),
      ).toThrow(/no "Prescripta" state/);
    });
  });

  it('los actos que expone son una copia: agregar uno sólo se hace registrándolo', () => {
    const targetCase = aCase();

    (targetCase.proceduralActs as ProceduralAct[]).push(anAct());

    expect(targetCase.proceduralActs).toEqual([]);
  });
});
