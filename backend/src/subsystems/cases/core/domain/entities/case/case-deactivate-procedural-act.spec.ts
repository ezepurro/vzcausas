import { CaseInTerminalStateError, NotResponsibleLawyerError } from '../../errors/case.errors';
import {
  aCaseInState,
  anAct,
  anActor,
  aPrescriptionDeclaration,
  ARCHIVED,
  day,
  INITIAL_STATES,
  OPPOSITION,
  PRESCRIBED,
  SUMMONS,
} from '../../../test-support/case-fixtures';
import { ProceduralAct } from '../procedural-act.entity';
import { Case } from './case.entity';

/*
 * HU29 · Dar de baja un acto procesal: las reglas de `Case` (contrato V6 §3.8,
 * `:6993-7134`; D-124, D-99, D-14, D-30). El contrato lo llama "anular".
 *
 * `anAct()` es el acto 1, del 30/09/2026, en "Oposición…". El acto 2 es del
 * 05/10/2026, en "Citación a juicio".
 */

const LATER = new Date('2026-10-07T13:00:00.000Z');
const first = () => anAct();
const second = (overrides: Parameters<typeof anAct>[0] = {}) =>
  anAct({ id: 2, proceduralStateId: SUMMONS.id, actDate: day('2026-10-05'), ...overrides });

function deactivate(
  target: Case,
  deactivated: ProceduralAct,
  latestRemaining: ProceduralAct | null,
  latestRemainingTerminal = false,
): Case {
  target.deactivateProceduralAct({
    deactivated,
    latestRemaining,
    latestRemainingTerminal,
    initialState: INITIAL_STATES.CRIMINAL,
    now: LATER,
  });
  return target;
}

describe('Case: dar de baja un acto procesal (HU29)', () => {
  describe('quién y cuándo', () => {
    // CA-29.7, D-30
    it('solo el abogado responsable: ni otro abogado ni un administrador, con el texto del contrato', () => {
      const target = aCaseInState({ currentAct: first() });

      expect(() => target.assertCanDeactivateActs(anActor())).not.toThrow();
      for (const actor of [anActor({ lawyerId: 99 }), anActor({ roleNames: ['ADMINISTRATOR'] })]) {
        expect(() => target.assertCanDeactivateActs(actor)).toThrow(
          new NotResponsibleLawyerError('Solo el abogado responsable de la causa puede anular sus actos procesales.'),
        );
      }
    });

    // CA-29.8 y CA-29.5
    it('una causa prescripta no admite dar de baja sus actos; una archivada sí', () => {
      const prescribed = aCaseInState({ currentStateId: PRESCRIBED.id, prescriptionDeclaration: aPrescriptionDeclaration() });
      const archived = aCaseInState({ currentAct: anAct({ proceduralStateId: ARCHIVED.id }) });

      expect(() => prescribed.assertActsCanBeDeactivated()).toThrow(
        new CaseInTerminalStateError('La causa está prescripta: sus actos procesales no se pueden anular.'),
      );
      expect(() => archived.assertActsCanBeDeactivated()).not.toThrow();
    });
  });

  describe('estado actual de la causa (D-124, D-14)', () => {
    // CA-29.3, CA-29.4
    it('dar de baja el acto actual deja la causa en el acto vigente más reciente, con su plazo', () => {
      const target = deactivate(aCaseInState({ currentAct: second() }), second(), first());

      expect(target.currentProceduralActId).toBe(1);
      expect(target.currentStateId).toBe(OPPOSITION.id);
      expect(target.currentCustomState).toBeNull();
      expect(target.proceduralActs).toEqual([first()]);
      expect(target.updatedAt).toBe(LATER);
    });

    // CA-29.3
    it('sin actos que queden, la causa vuelve a "Iniciada": sin acto actual y sin plazo', () => {
      const target = deactivate(aCaseInState({ currentAct: first() }), first(), null);

      expect(target.currentProceduralActId).toBeNull();
      expect(target.currentStateId).toBe(INITIAL_STATES.CRIMINAL.id);
      expect(target.currentCustomState).toBeNull();
      expect(target.proceduralActs).toEqual([]);
      expect(target.updatedAt).toBe(LATER);
      expect(() => target.assertAcceptsActs()).not.toThrow();
    });

    // CA-29.5
    it('dar de baja el acto que archivó la causa la reabre', () => {
      const archivedCase = aCaseInState({ currentAct: second({ proceduralStateId: ARCHIVED.id }) });
      expect(() => archivedCase.assertAcceptsActs()).toThrow(CaseInTerminalStateError);

      deactivate(archivedCase, second({ proceduralStateId: ARCHIVED.id }), first());

      expect(archivedCase.currentStateId).toBe(OPPOSITION.id);
      expect(() => archivedCase.assertAcceptsActs()).not.toThrow();
    });

    // CA-29.6
    it('dar de baja un acto más viejo que el actual no mueve la causa', () => {
      const target = aCaseInState({ currentAct: second() });
      const updatedAt = target.updatedAt;

      deactivate(target, first(), second());

      expect(target.currentProceduralActId).toBe(2);
      expect(target.currentStateId).toBe(SUMMONS.id);
      expect(target.updatedAt).toBe(updatedAt);
    });

    it('volver a "Iniciada" sin el estado inicial del fuero es un error de programación', () => {
      const target = aCaseInState({ currentAct: first() });

      expect(() =>
        target.deactivateProceduralAct({
          deactivated: first(),
          latestRemaining: null,
          latestRemainingTerminal: false,
          initialState: null,
          now: LATER,
        }),
      ).toThrow('has no initial state to go back to');
    });
  });
});
