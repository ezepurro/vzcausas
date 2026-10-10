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
