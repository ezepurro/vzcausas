import { CaseInTerminalStateError, EmptyCaseUpdateError, NotResponsibleLawyerError } from '../../errors/case.errors';
import { ProceduralStateRef } from '../../ports/case/legal-parameters-lookup.port';
import { DayType } from '../../value-objects/deadline/day-type';
import { Deadline } from '../../value-objects/deadline/deadline.vo';
import {
  aCaseInState,
  anAct,
  anActor,
  anAdministrativeCase,
  aPrescriptionDeclaration,
  aProceduralState,
  ADMINISTRATIVE_STATE,
  ARCHIVED,
  day,
  DEACTIVATED,
  OPPOSITION,
  PRESCRIBED,
  SUMMONS,
  TODAY,
  validationDetailsOf,
} from '../../../test-support/case-fixtures';
import { ProceduralAct } from '../procedural-act.entity';
import { ActModificationRefs } from './case.entity';

/*
 * HU28 · Modificar acto procesal: las reglas de `Case` (contrato V5 §3.8,
 * `:5935-6145`; D-98, D-99). Las reglas del acto solo, en
 * `procedural-act.entity.spec.ts`.
 *
 * `anAct()` es el acto 1, del 30/09/2026, en "Oposición…" con 5 días hábiles
 * copiados. Hoy es el 06/10/2026.
 */

const LATER = new Date('2026-10-07T13:00:00.000Z');

const refs = (overrides: Partial<ActModificationRefs> = {}): ActModificationRefs => ({
  state: OPPOSITION,
  customStateNamesTableState: false,
  ...overrides,
});

/** El acto 1 con su vencimiento ajustado a mano. */
const withManualDueDate = (manualDueDate: Date, overrides: Parameters<typeof anAct>[0] = {}) =>
  anAct({
    deadline: Deadline.hydrate({
      timeLimitDays: 5,
      dayType: DayType.BUSINESS,
      countsFrom: day('2026-09-30'),
      computedDueDate: day('2026-10-07'),
      manualDueDate,
    }),
    ...overrides,
  });

describe('Case — modificar un acto procesal (HU28)', () => {
  describe('quién puede y en qué causa', () => {
    // CA-28.2
    it('el responsable actual puede; otro abogado o un administrador reciben 403 con el texto del contrato', () => {
      const target = aCaseInState({ currentAct: anAct() });

      expect(() => target.assertCanModifyActs(anActor())).not.toThrow();
      for (const actor of [anActor({ lawyerId: 99 }), anActor({ roleNames: ['ADMINISTRATOR'] })]) {
        let error: unknown;
        try {
          target.assertCanModifyActs(actor);
        } catch (thrown) {
          error = thrown;
        }
        expect(error).toBeInstanceOf(NotResponsibleLawyerError);
        expect((error as Error).message).toBe(
          'Solo el abogado responsable de la causa puede modificar sus actos procesales.',
        );
      }
    });

    // CA-28.9
    it('una causa prescripta no admite modificar sus actos; una archivada sí', () => {
      const prescribed = aCaseInState({ currentStateId: PRESCRIBED.id, prescriptionDeclaration: aPrescriptionDeclaration() });
      const archived = aCaseInState({ currentAct: anAct({ proceduralStateId: ARCHIVED.id }) });

      expect(() => prescribed.assertActsCanBeModified()).toThrow(
        new CaseInTerminalStateError('La causa está prescripta: sus actos procesales no se pueden modificar.'),
      );
      expect(() => archived.assertActsCanBeModified()).not.toThrow();
    });
  });

  describe('validación del acto resultante (CA-28.3)', () => {
    it('sin ningún campo es 400, con el texto de los demás PATCH', () => {
      const target = aCaseInState({ currentAct: anAct() });

      expect(() => target.planActModification(anAct(), {}, refs(), TODAY)).toThrow(EmptyCaseUpdateError);
    });

    // El ejemplo de V5 `:6083-6091`: dos campos en el mismo `details`.
    it('informa todos los problemas juntos, como el ejemplo del contrato', async () => {
      const target = aCaseInState({ currentAct: anAct() });

      const details = await validationDetailsOf(() =>
        target.planActModification(
          anAct(),
          { proceduralStateId: SUMMONS.id, customState: 'Otro', manualDueDate: day('2026-09-01') },
          refs({ state: SUMMONS }),
          TODAY,
        ),
      );

      expect(details).toEqual({
        proceduralStateId: 'Elegí un estado de la tabla o escribí uno, no las dos cosas.',
        manualDueDate: 'No puede ser anterior a la fecha desde la que corre el plazo.',
      });
    });

    it.each<[string, ProceduralStateRef, string]>([
      ['"Prescripta"', PRESCRIBED, 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.'],
      ['un estado dado de baja', DEACTIVATED, 'No existe un estado procesal vigente con ese identificador.'],
      ['un estado de otro fuero', ADMINISTRATIVE_STATE, 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.'],
    ])('un estado nuevo tiene que ser destino válido: %s no', async (_label, state, message) => {
      const target = aCaseInState({ currentAct: anAct() });

      const details = await validationDetailsOf(() =>
        target.planActModification(anAct(), { proceduralStateId: state.id }, refs({ state }), TODAY),
      );

      expect(details).toEqual({ proceduralStateId: message });
    });

    it('un estado escrito a mano no puede repetir uno de la tabla', async () => {
      const target = aCaseInState({ currentAct: anAct() });

      const details = await validationDetailsOf(() =>
        target.planActModification(
          anAct(),
          { customState: 'citación a juicio' },
          refs({ state: null, customStateNamesTableState: true }),
          TODAY,
        ),
      );

      expect(details).toEqual({ customState: 'Coincide con un estado de la tabla del fuero: elegilo de la lista.' });
    });

    // Decisión del 05/11/2026: reenviar el mismo estado no es un cambio y no se revalida.
    it('el mismo estado reenviado no se revalida, aunque ya esté dado de baja', () => {
      const act = anAct({ proceduralStateId: DEACTIVATED.id });
      const target = aCaseInState({ currentAct: act });

      const plan = target.planActModification(act, { proceduralStateId: DEACTIVATED.id, notes: 'x' }, refs({ state: DEACTIVATED }), TODAY);

      expect(plan.changedFields).toEqual(['notes']);
    });

    describe('fuero administrativo (RN6)', () => {
      const administrativeAct = () =>
        anAct({
          proceduralStateId: ADMINISTRATIVE_STATE.id,
          actDate: day('2026-10-01'),
          notificationDate: day('2026-10-02'),
          deadline: Deadline.hydrate({
            timeLimitDays: 10,
            dayType: DayType.BUSINESS,
            countsFrom: day('2026-10-02'),
            computedDueDate: day('2026-10-16'),
            manualDueDate: null,
          }),
        });

      it('quitar la notificación de un acto que abre plazo es 400', async () => {
        const details = await validationDetailsOf(() =>
          anAdministrativeCase().planActModification(
            administrativeAct(),
            { notificationDate: null },
            refs({ state: ADMINISTRATIVE_STATE }),
            TODAY,
          ),
        );

        expect(details).toEqual({
          notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).',
        });
      });

      it('fuera del administrativo no se informa notificación', async () => {
        const target = aCaseInState({ currentAct: anAct() });

        const details = await validationDetailsOf(() =>
          target.planActModification(anAct(), { notificationDate: day('2026-10-01') }, refs(), TODAY),
        );

        expect(details).toEqual({ notificationDate: 'Solo se informa en el fuero administrativo.' });
      });
    });
  });

  describe('plazo (D-98)', () => {
    // CA-28.4: la tabla del estado nuevo, como está hoy.
    it('si cambia el estado, toma el plazo y el tipo de día vigentes hoy en la tabla del estado nuevo', () => {
      const summonsToday = aProceduralState({ id: SUMMONS.id, name: SUMMONS.name, timeLimitDays: 7, dayType: DayType.CONSECUTIVE });
      const target = aCaseInState({ currentAct: anAct() });

      const plan = target.planActModification(anAct(), { proceduralStateId: SUMMONS.id }, refs({ state: summonsToday }), TODAY);

      expect(plan.term).toEqual({ timeLimitDays: 7, dayType: DayType.CONSECUTIVE, countsFrom: day('2026-09-30') });
      expect(plan.changedFields).toEqual(['proceduralStateId']);
      expect(plan.terminal).toBe(false);
    });

    // CA-28.5: la tabla cambió a 20 días después del registro; manda lo copiado.
    it('si no cambia el estado, conserva el plazo que el acto copió al registrarse', () => {
      const oppositionToday = aProceduralState({ timeLimitDays: 20 });
      const target = aCaseInState({ currentAct: anAct() });

      const plan = target.planActModification(anAct(), { actDate: day('2026-09-28') }, refs({ state: oppositionToday }), TODAY);

      expect(plan.term).toEqual({ timeLimitDays: 5, dayType: DayType.BUSINESS, countsFrom: day('2026-09-28') });
      expect(plan.changedFields).toEqual(['actDate']);
    });

    it('un estado escrito a mano no abre plazo', () => {
      const target = aCaseInState({ currentAct: anAct() });

      const plan = target.planActModification(anAct(), { customState: 'Pedido de informes' }, refs({ state: null }), TODAY);

      expect(plan.term).toEqual({ timeLimitDays: 0, dayType: DayType.NONE, countsFrom: day('2026-09-30') });
      expect(plan).toMatchObject({ proceduralStateId: null, customState: 'Pedido de informes' });
    });

    // CA-28.6
    it('un ajuste manual que no se toca se conserva al mover la fecha; en null vuelve al calculado', () => {
      const act = withManualDueDate(day('2026-10-20'));
      const target = aCaseInState({ currentAct: act });

      expect(target.planActModification(act, { actDate: day('2026-09-28') }, refs(), TODAY).manualDueDate).toEqual(
        day('2026-10-20'),
      );
      const cleared = target.planActModification(act, { manualDueDate: null }, refs(), TODAY);
      expect(cleared.manualDueDate).toBeNull();
      expect(cleared.changedFields).toEqual(['manualDueDate']);
    });

    // CA-28.6: si el ajuste queda antes de la fecha desde la que corre el plazo.
    it('un ajuste que queda anterior a la fecha desde la que corre el plazo es 400', async () => {
      const act = withManualDueDate(day('2026-10-02'));
      const target = aCaseInState({ currentAct: act });

      const details = await validationDetailsOf(() =>
        target.planActModification(act, { actDate: day('2026-10-05') }, refs(), TODAY),
      );

      expect(details).toEqual({ manualDueDate: 'No puede ser anterior a la fecha desde la que corre el plazo.' });
    });

    // Decisión del 05/11/2026: el estado terminal no admite vencimiento, tampoco uno conservado.
    it('pasar a un estado terminal con un ajuste que no se toca es 400; quitándolo en el mismo pedido, cierra', async () => {
      const act = withManualDueDate(day('2026-10-20'));
      const target = aCaseInState({ currentAct: act });

      const details = await validationDetailsOf(() =>
        target.planActModification(act, { proceduralStateId: ARCHIVED.id }, refs({ state: ARCHIVED }), TODAY),
      );
      expect(details).toEqual({ manualDueDate: 'Un estado terminal cierra la causa y no admite vencimiento.' });

      const plan = target.planActModification(
        act,
        { proceduralStateId: ARCHIVED.id, manualDueDate: null },
        refs({ state: ARCHIVED }),
        TODAY,
      );
      expect(plan.terminal).toBe(true);
      expect(plan.term).toEqual({ timeLimitDays: 0, dayType: DayType.NONE, countsFrom: day('2026-09-30') });
    });
  });

  describe('estado actual de la causa (D-99)', () => {
    const other = (overrides: Parameters<typeof anAct>[0]) =>
      anAct({ id: 2, proceduralStateId: SUMMONS.id, actDate: day('2026-09-29'), ...overrides });

    function recalculate(modified: ProceduralAct, latestOther: ProceduralAct | null, terminals = { modified: false, other: false }) {
      const target = aCaseInState({ currentAct: anAct() });
      target.recalculateCurrentAct({
        modified,
        modifiedTerminal: terminals.modified,
        latestOther,
        latestOtherTerminal: terminals.other,
        now: LATER,
      });
      return target;
    }

    // CA-28.7
    it('rige el acto con la fecha más reciente, aunque no sea el modificado', () => {
      const target = recalculate(anAct({ actDate: day('2026-09-28') }), other({}));

      expect(target.currentProceduralActId).toBe(2);
      expect(target.currentStateId).toBe(SUMMONS.id);
      expect(target.currentCustomState).toBeNull();
      expect(target.updatedAt).toBe(LATER);
    });

    it('el modificado rige si queda como el más reciente, o si no hay otro', () => {
      expect(recalculate(anAct(), other({})).currentProceduralActId).toBe(1);
      expect(recalculate(anAct({ actDate: day('2026-09-01') }), null).currentProceduralActId).toBe(1);
    });

    // Decisión del 05/11/2026: en la misma fecha rige el de id mayor, como en el registro.
    it('en la misma fecha rige el último registrado: el de id mayor', () => {
      const sameDate = day('2026-09-29');

      expect(recalculate(anAct({ actDate: sameDate }), other({ actDate: sameDate })).currentProceduralActId).toBe(2);
      expect(recalculate(anAct({ id: 3, actDate: sameDate }), other({ actDate: sameDate })).currentProceduralActId).toBe(3);
    });

    it('un estado escrito a mano queda como estado actual, sin estado de la tabla', () => {
      const target = recalculate(anAct({ proceduralStateId: null, customState: 'Pedido de informes' }), null);

      expect(target.currentStateId).toBeNull();
      expect(target.currentCustomState).toBe('Pedido de informes');
    });

    // CA-28.8
    it('si el acto que rige pasa a terminal la causa se cierra, y al dejar de serlo vuelve a admitir actos', () => {
      const closed = recalculate(anAct({ proceduralStateId: ARCHIVED.id }), null, { modified: true, other: false });
      expect(() => closed.assertAcceptsActs()).toThrow(CaseInTerminalStateError);

      const archivedCase = aCaseInState({ currentAct: anAct({ proceduralStateId: ARCHIVED.id }) });
      expect(() => archivedCase.assertAcceptsActs()).toThrow(CaseInTerminalStateError);
      archivedCase.recalculateCurrentAct({
        modified: anAct(),
        modifiedTerminal: false,
        latestOther: null,
        latestOtherTerminal: false,
        now: LATER,
      });
      expect(() => archivedCase.assertAcceptsActs()).not.toThrow();
    });
  });
});
