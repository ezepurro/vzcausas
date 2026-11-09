import { Deadline } from '../value-objects/deadline/deadline.vo';
import { DayType } from '../value-objects/deadline/day-type';
import { anAct, day, NOW, OPPOSITION, TODAY, validationDetailsOf } from '../../test-support/case-fixtures';
import { NewProceduralActInput, ProceduralAct } from './procedural-act.entity';

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

  describe('validateDates', () => {
    it('no informa nada si las fechas cumplen las reglas', () => {
      expect(ProceduralAct.validateDates({ actDate: day('2026-10-05'), today: TODAY })).toEqual({});
      expect(
        ProceduralAct.validateDates({ actDate: day('2026-10-05'), notificationDate: TODAY, today: TODAY }),
      ).toEqual({});
    });

    it('informa la fecha del acto futura o inválida (CA-26.11)', () => {
      expect(ProceduralAct.validateDates({ actDate: day('2026-10-07'), today: TODAY })).toEqual({
        actDate: 'No puede ser posterior a la fecha de hoy.',
      });
      expect(ProceduralAct.validateDates({ actDate: new Date('x'), today: TODAY })).toEqual({
        actDate: 'Debe ser una fecha válida (AAAA-MM-DD).',
      });
    });

    it('informa la notificación anterior al acto, posterior a hoy o inválida', () => {
      const expected = { notificationDate: 'Debe estar entre la fecha del acto y hoy.' };

      expect(
        ProceduralAct.validateDates({ actDate: day('2026-10-05'), notificationDate: day('2026-10-04'), today: TODAY }),
      ).toEqual(expected);
      expect(
        ProceduralAct.validateDates({ actDate: day('2026-10-05'), notificationDate: day('2026-10-07'), today: TODAY }),
      ).toEqual(expected);
      expect(
        ProceduralAct.validateDates({ actDate: day('2026-10-05'), notificationDate: new Date('x'), today: TODAY }),
      ).toEqual(expected);
    });

    it('es lo mismo que valida el alta del acto', async () => {
      const dates = { actDate: day('2026-10-05'), notificationDate: day('2026-10-04'), today: TODAY };

      const details = await validationDetailsOf(() => ProceduralAct.create(anActInput(dates)));

      expect(details).toEqual(ProceduralAct.validateDates(dates));
    });
  });

  /*
   * HU28 · Modificar acto procesal. `anAct()` es un acto del 30/09/2026 en
   * "Oposición…" (5 días hábiles), sin notificación ni observaciones. Hoy es el
   * 06/10/2026. Los textos son los del registro, salvo los dos estados a la vez,
   * que es el de V5 `:6087`.
   */
  describe('modificación (HU28)', () => {
    const CANNOT_BE_EMPTIED = 'No puede quedar vacío.';

    describe('resolveChanges', () => {
      // CA-28.1: lo enviado reemplaza, lo omitido se conserva.
      it('aplica lo enviado sobre el acto, conserva lo omitido e informa qué cambió', () => {
        const resolved = anAct().resolveChanges({ actDate: day('2026-09-28'), notes: '  Se corrigió la fecha.  ' }, TODAY);

        expect(resolved).toEqual({
          proceduralStateId: OPPOSITION.id,
          customState: null,
          actDate: day('2026-09-28'),
          notificationDate: null,
          manualDueDate: null,
          notes: 'Se corrigió la fecha.',
          stateChanged: false,
          changedFields: ['actDate', 'notes'],
          errors: {},
        });
      });

      // Decisión del 05/11/2026: un valor igual al actual no es un cambio.
      it('un valor igual al actual, también el mismo estado, no cuenta como cambio', () => {
        const act = anAct({ notes: 'Con oposición.' });

        const resolved = act.resolveChanges(
          { proceduralStateId: OPPOSITION.id, actDate: day('2026-09-30'), notes: ' Con oposición. ' },
          TODAY,
        );

        expect(resolved.changedFields).toEqual([]);
        expect(resolved.stateChanged).toBe(false);
        expect(resolved.errors).toEqual({});
      });

      it('pasar de un estado de la tabla a uno escrito a mano cambia el estado y vacía el de la tabla', () => {
        const resolved = anAct().resolveChanges({ customState: 'Pedido de informes' }, TODAY);

        expect(resolved).toMatchObject({ proceduralStateId: null, customState: 'Pedido de informes', stateChanged: true });
        expect(resolved.changedFields).toEqual(['proceduralStateId', 'customState']);
      });

      it('las observaciones en blanco o en null quedan vacías', () => {
        const act = anAct({ notes: 'Algo' });

        expect(act.resolveChanges({ notes: '   ' }, TODAY).notes).toBeNull();
        expect(act.resolveChanges({ notes: null }, TODAY).notes).toBeNull();
      });

      // CA-28.3: todos los problemas juntos, sobre el acto como queda.
      it('informa juntos los problemas del acto resultante', () => {
        const resolved = anAct().resolveChanges(
          {
            proceduralStateId: 99,
            customState: 'Otro',
            actDate: day('2026-10-07'),
            notes: 'x'.repeat(2001),
          },
          TODAY,
        );

        expect(resolved.errors).toEqual({
          proceduralStateId: 'Elegí un estado de la tabla o escribí uno, no las dos cosas.',
          actDate: 'No puede ser posterior a la fecha de hoy.',
          notes: 'Debe tener hasta 2000 caracteres.',
        });
      });

      it('un estado escrito a mano de más de 255 caracteres no vale', () => {
        expect(anAct().resolveChanges({ customState: 'x'.repeat(256) }, TODAY).errors).toEqual({
          customState: 'Debe tener hasta 255 caracteres.',
        });
      });

      // CA-28.3: la fecha de notificación ya guardada se valida contra la fecha del acto nueva.
      it('valida la notificación que ya tenía contra la fecha del acto nueva', () => {
        const act = anAct({ actDate: day('2026-10-01'), notificationDate: day('2026-10-02') });

        expect(act.resolveChanges({ actDate: day('2026-10-03') }, TODAY).errors).toEqual({
          notificationDate: 'Debe estar entre la fecha del acto y hoy.',
        });
      });

      // Contrato V5 §3.8: `proceduralStateId`, `customState` y `actDate` no son anulables.
      it('los campos no anulables no pueden quedar vacíos', () => {
        expect(anAct().resolveChanges({ proceduralStateId: null, actDate: null }, TODAY).errors).toEqual({
          proceduralStateId: CANNOT_BE_EMPTIED,
          actDate: CANNOT_BE_EMPTIED,
        });
        expect(anAct().resolveChanges({ customState: null }, TODAY).errors).toEqual({ customState: CANNOT_BE_EMPTIED });
      });
    });

    describe('modify', () => {
      const LATER = new Date('2026-10-07T13:00:00.000Z');
      const NEW_DEADLINE = Deadline.hydrate({
        timeLimitDays: 5,
        dayType: DayType.BUSINESS,
        countsFrom: day('2026-09-28'),
        computedDueDate: day('2026-10-05'),
        manualDueDate: null,
      });

      // CA-28.10
      it('cambia los datos y el plazo, conserva quién y cuándo lo registró y anota quién y cuándo lo modificó', () => {
        const act = anAct();

        const modified = act.modify({
          proceduralStateId: OPPOSITION.id,
          customState: null,
          actDate: day('2026-09-28'),
          notificationDate: null,
          notes: 'Se corrigió la fecha.',
          deadline: NEW_DEADLINE,
          modifiedByUserId: 9,
          now: LATER,
        });

        expect(modified.id).toBe(act.id);
        expect(modified.caseId).toBe(act.caseId);
        expect(modified.actDate).toEqual(day('2026-09-28'));
        expect(modified.notes).toBe('Se corrigió la fecha.');
        expect(modified.deadline).toBe(NEW_DEADLINE);
        expect(modified.registeredByUserId).toBe(act.registeredByUserId);
        expect(modified.registeredByLawyerId).toBe(act.registeredByLawyerId);
        expect(modified.registeredAt).toBe(act.registeredAt);
        expect(modified.lastModifiedByUserId).toBe(9);
        expect(modified.lastModifiedAt).toBe(LATER);
      });

      it('un acto recién registrado no tiene modificación', () => {
        const act = ProceduralAct.create(anActInput());

        expect(act.lastModifiedByUserId).toBeNull();
        expect(act.lastModifiedAt).toBeNull();
      });
    });
  });
});
