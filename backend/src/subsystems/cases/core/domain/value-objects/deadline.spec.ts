import { ValidationError } from '@shared/domain/domain-error';
import { day } from '../../test-support/case-fixtures';
import { DayType } from './day-type';
import { Deadline, DeadlineProps } from './deadline';

function aDeadlineProps(overrides: Partial<DeadlineProps> = {}): DeadlineProps {
  return {
    timeLimitDays: 5,
    dayType: DayType.BUSINESS,
    countsFrom: day('2026-10-05'),
    computedDueDate: day('2026-10-12'),
    manualDueDate: null,
    ...overrides,
  };
}

describe('Deadline', () => {
  describe('vencimiento vigente (CA-26.1, CA-26.5)', () => {
    it('es el calculado por la tabla si el abogado no lo ajustó', () => {
      const deadline = Deadline.create(aDeadlineProps());

      expect(deadline.dueDate).toEqual(day('2026-10-12'));
      expect(deadline.manuallyAdjusted).toBe(false);
    });

    it('es el manual si el abogado lo ajustó, y conserva el calculado', () => {
      const deadline = Deadline.create(aDeadlineProps({ manualDueDate: day('2026-10-20') }));

      expect(deadline.dueDate).toEqual(day('2026-10-20'));
      expect(deadline.computedDueDate).toEqual(day('2026-10-12'));
      expect(deadline.manuallyAdjusted).toBe(true);
    });

    it('acepta un ajuste manual el mismo día desde el que corre el plazo', () => {
      const deadline = Deadline.create(aDeadlineProps({ manualDueDate: day('2026-10-05') }));

      expect(deadline.dueDate).toEqual(day('2026-10-05'));
    });
  });

  describe('estado sin plazo (CA-26.12)', () => {
    const withoutTerm = { timeLimitDays: 0, dayType: DayType.NONE, computedDueDate: null };

    it('no abre plazo ni tiene vencimiento si no se carga uno a mano', () => {
      const deadline = Deadline.create(aDeadlineProps(withoutTerm));

      expect(deadline.opensTerm()).toBe(false);
      expect(deadline.dueDate).toBeNull();
      expect(deadline.manuallyAdjusted).toBe(false);
    });

    it('tiene vencimiento solo si se carga a mano (CA-26.7)', () => {
      const deadline = Deadline.create(aDeadlineProps({ ...withoutTerm, manualDueDate: day('2026-10-20') }));

      expect(deadline.opensTerm()).toBe(false);
      expect(deadline.computedDueDate).toBeNull();
      expect(deadline.dueDate).toEqual(day('2026-10-20'));
    });
  });

  describe('días del plazo que da el vencimiento manual (D-86)', () => {
    it('es null si el vencimiento no se ajustó a mano', () => {
      expect(Deadline.create(aDeadlineProps()).manualTimeLimitDays).toBeNull();
    });

    it('en días hábiles, cuenta desde el día siguiente a countsFrom hasta la fecha manual, sin fines de semana', () => {
      // Lunes 05/10 → martes 20/10: 6 al 9, 12 al 16, 19 y 20.
      const deadline = Deadline.create(aDeadlineProps({ manualDueDate: day('2026-10-20') }));

      expect(deadline.manualTimeLimitDays).toBe(11);
    });

    it('en días hábiles, una fecha manual en sábado cuenta igual que el viernes anterior', () => {
      // Viernes 23/10, tabla de 3 días hábiles (28/10), ajustado al sábado 31/10.
      const props = { timeLimitDays: 3, countsFrom: day('2026-10-23'), computedDueDate: day('2026-10-28') };

      expect(Deadline.create(aDeadlineProps({ ...props, manualDueDate: day('2026-10-31') })).manualTimeLimitDays).toBe(5);
      expect(Deadline.create(aDeadlineProps({ ...props, manualDueDate: day('2026-10-30') })).manualTimeLimitDays).toBe(5);
    });

    it('en días corridos, cuenta todos los días', () => {
      const deadline = Deadline.create(
        aDeadlineProps({
          dayType: DayType.CONSECUTIVE,
          computedDueDate: day('2026-10-10'),
          manualDueDate: day('2026-10-20'),
        }),
      );

      expect(deadline.manualTimeLimitDays).toBe(15);
    });

    it('es 0 si la fecha manual es el mismo día desde el que corre el plazo', () => {
      expect(Deadline.create(aDeadlineProps({ manualDueDate: day('2026-10-05') })).manualTimeLimitDays).toBe(0);
    });

    it('es null sin plazo de tabla (NONE): no hay en qué unidad contar', () => {
      const deadline = Deadline.create(
        aDeadlineProps({
          timeLimitDays: 0,
          dayType: DayType.NONE,
          computedDueDate: null,
          manualDueDate: day('2026-10-20'),
        }),
      );

      expect(deadline.manualTimeLimitDays).toBeNull();
    });
  });

  it('un estado con plazo abre plazo', () => {
    expect(Deadline.create(aDeadlineProps()).opensTerm()).toBe(true);
  });

  describe('validaciones', () => {
    it('rechaza un ajuste manual anterior a la fecha desde la que corre el plazo (CA-26.5)', () => {
      expect.assertions(3);
      try {
        Deadline.create(aDeadlineProps({ manualDueDate: day('2026-10-04') }));
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
        expect((error as ValidationError).details).toEqual({
          manualDueDate: 'No puede ser anterior a la fecha desde la que corre el plazo.',
        });
      }
    });

    it('un plazo de cero días exige el tipo de día NONE, y al revés', () => {
      expect(() => Deadline.create(aDeadlineProps({ timeLimitDays: 0, computedDueDate: null }))).toThrow(Error);
      expect(() => Deadline.create(aDeadlineProps({ dayType: DayType.NONE }))).toThrow(Error);
    });

    it('un plazo de más de cero días exige la fecha calculada, y al revés', () => {
      expect(() => Deadline.create(aDeadlineProps({ computedDueDate: null }))).toThrow(Error);
      expect(() =>
        Deadline.create(aDeadlineProps({ timeLimitDays: 0, dayType: DayType.NONE, computedDueDate: day('2026-10-12') })),
      ).toThrow(Error);
    });

    it('hydrate reconstruye lo guardado sin validar', () => {
      const deadline = Deadline.hydrate(aDeadlineProps({ manualDueDate: day('2026-10-01') }));

      expect(deadline.dueDate).toEqual(day('2026-10-01'));
    });
  });
});
