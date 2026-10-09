import { Deadline } from '../value-objects/deadline';
import { DayType } from '../value-objects/day-type';
import { day, NOW, OPPOSITION, TODAY, validationDetailsOf } from '../../test-support/case-fixtures';
import { NewProceduralActInput, ProceduralAct } from './procedural-act';

const DEADLINE = Deadline.create({
  timeLimitDays: 5,
  dayType: DayType.BUSINESS,
  countsFrom: day('2026-10-05'),
  computedDueDate: day('2026-10-12'),
  manualDueDate: null,
});

function anActInput(overrides: Partial<NewProceduralActInput> = {}): NewProceduralActInput {
  return {
    id: 7,
    caseId: 1,
    proceduralStateId: OPPOSITION.id,
    actDate: day('2026-10-05'),
    deadline: DEADLINE,
    registeredByUserId: 5,
    registeredByLawyerId: 2,
    today: TODAY,
    now: NOW,
    ...overrides,
  };
}

describe('ProceduralAct', () => {
  describe('alta', () => {
    it('crea un acto con el estado de la tabla, su plazo copiado y quién lo registró', () => {
      const act = ProceduralAct.create(anActInput({ notes: 'Con acusación, pero con oposición.' }));

      expect(act.id).toBe(7);
      expect(act.caseId).toBe(1);
      expect(act.proceduralStateId).toBe(OPPOSITION.id);
      expect(act.customState).toBeNull();
      expect(act.isCustom).toBe(false);
      expect(act.actDate).toEqual(day('2026-10-05'));
      expect(act.notes).toBe('Con acusación, pero con oposición.');
      expect(act.deadline).toBe(DEADLINE);
      expect(act.registeredByUserId).toBe(5);
      expect(act.registeredByLawyerId).toBe(2);
      expect(act.registeredAt).toBe(NOW);
    });

    it('un estado escrito a mano queda solo en el acto, sin estado de la tabla (CA-26.7)', () => {
      const act = ProceduralAct.create(anActInput({ proceduralStateId: null, customState: 'Pedido de informes' }));

      expect(act.proceduralStateId).toBeNull();
      expect(act.customState).toBe('Pedido de informes');
      expect(act.isCustom).toBe(true);
    });

    it('recorta los espacios del estado escrito a mano y de las observaciones, y trata lo vacío como ausente', () => {
      const custom = ProceduralAct.create(
        anActInput({ proceduralStateId: null, customState: '  Pedido de informes  ', notes: '   ' }),
      );

      expect(custom.customState).toBe('Pedido de informes');
      expect(custom.notes).toBeNull();
    });

    it('acepta un acto de hoy y los largos máximos', () => {
      const act = ProceduralAct.create(
        anActInput({ actDate: TODAY, proceduralStateId: null, customState: 'a'.repeat(255), notes: 'b'.repeat(2000) }),
      );

      expect(act.actDate).toEqual(TODAY);
    });
  });

  describe('estado del acto', () => {
    it('rechaza indicar el estado de la tabla y uno escrito a mano a la vez', async () => {
      const details = await validationDetailsOf(() => ProceduralAct.create(anActInput({ customState: 'Otro' })));

      expect(details).toEqual({
        proceduralStateId: 'Indicá un estado procesal de la tabla o un estado escrito a mano, no ambos.',
      });
    });

    it('rechaza no indicar ninguno de los dos, también si el escrito a mano está en blanco', async () => {
      const none = await validationDetailsOf(() => ProceduralAct.create(anActInput({ proceduralStateId: null })));
      const blank = await validationDetailsOf(() =>
        ProceduralAct.create(anActInput({ proceduralStateId: null, customState: '   ' })),
      );

      expect(Object.keys(none ?? {})).toEqual(['proceduralStateId']);
      expect(Object.keys(blank ?? {})).toEqual(['proceduralStateId']);
    });

    it('rechaza un estado escrito a mano de más de 255 caracteres', async () => {
      const details = await validationDetailsOf(() =>
        ProceduralAct.create(anActInput({ proceduralStateId: null, customState: 'a'.repeat(256) })),
      );

      expect(details).toEqual({ customState: 'Debe tener hasta 255 caracteres.' });
    });
  });

  describe('fecha del acto (CA-26.11)', () => {
    it('rechaza una fecha posterior a hoy', async () => {
      const details = await validationDetailsOf(() => ProceduralAct.create(anActInput({ actDate: day('2026-10-07') })));

      expect(details).toEqual({ actDate: 'No puede ser posterior a la fecha de hoy.' });
    });

    it('rechaza una fecha inválida', async () => {
      const details = await validationDetailsOf(() =>
        ProceduralAct.create(anActInput({ actDate: new Date('no es una fecha') })),
      );

      expect(details).toEqual({ actDate: 'Debe ser una fecha válida (AAAA-MM-DD).' });
    });
  });

  describe('fecha de notificación (RN6)', () => {
    it('acepta una notificación entre la fecha del acto y hoy, ambas incluidas', () => {
      const sameDay = ProceduralAct.create(anActInput({ notificationDate: day('2026-10-05') }));
      const today = ProceduralAct.create(anActInput({ notificationDate: TODAY }));

      expect(sameDay.notificationDate).toEqual(day('2026-10-05'));
      expect(today.notificationDate).toEqual(TODAY);
    });

    it('rechaza una notificación anterior al acto o posterior a hoy', async () => {
      const before = await validationDetailsOf(() =>
        ProceduralAct.create(anActInput({ notificationDate: day('2026-10-04') })),
      );
      const after = await validationDetailsOf(() =>
        ProceduralAct.create(anActInput({ notificationDate: day('2026-10-07') })),
      );

      expect(before).toEqual({ notificationDate: 'Debe estar entre la fecha del acto y hoy.' });
      expect(after).toEqual({ notificationDate: 'Debe estar entre la fecha del acto y hoy.' });
    });
  });

  it('informa todos los problemas juntos, por campo', async () => {
    const details = await validationDetailsOf(() =>
      ProceduralAct.create(
        anActInput({
          proceduralStateId: null,
          customState: 'a'.repeat(256),
          actDate: day('2026-12-01'),
          notes: 'b'.repeat(2001),
        }),
      ),
    );

    expect(details).toEqual({
      customState: 'Debe tener hasta 255 caracteres.',
      actDate: 'No puede ser posterior a la fecha de hoy.',
      notes: 'Debe tener hasta 2000 caracteres.',
    });
  });

  it('hydrate reconstruye lo guardado sin validar', () => {
    const act = ProceduralAct.hydrate({
      id: 1,
      caseId: 1,
      proceduralStateId: OPPOSITION.id,
      customState: 'inconsistente a propósito',
      actDate: day('2030-01-01'),
      notificationDate: null,
      notes: null,
      deadline: DEADLINE,
      registeredByUserId: 5,
      registeredByLawyerId: 2,
      registeredAt: NOW,
    });

    expect(act.actDate).toEqual(day('2030-01-01'));
  });
});
