import { DayType } from '../../core/domain/value-objects/day-type';
import { day } from '../../core/test-support/case-fixtures';
import { BusinessDaysDeadlineCalculatorAdapter } from './business-days-deadline-calculator.adapter';

/** 2026-10-05 is a Monday: the week is 05 (Mon) ... 09 (Fri), 10 (Sat), 11 (Sun). */
describe('BusinessDaysDeadlineCalculatorAdapter', () => {
  const calculator = new BusinessDaysDeadlineCalculatorAdapter();

  describe('días hábiles (RN5)', () => {
    it('se cuentan a partir del día siguiente', async () => {
      const dueDate = await calculator.computeDueDate(day('2026-10-05'), 1, DayType.BUSINESS);

      expect(dueDate).toEqual(day('2026-10-06'));
    });

    it('un plazo de cinco días desde el lunes vence el lunes siguiente', async () => {
      const dueDate = await calculator.computeDueDate(day('2026-10-05'), 5, DayType.BUSINESS);

      expect(dueDate).toEqual(day('2026-10-12'));
    });

    it('saltea los sábados y domingos', async () => {
      const dueDate = await calculator.computeDueDate(day('2026-10-09'), 1, DayType.BUSINESS);

      expect(dueDate).toEqual(day('2026-10-12'));
    });

    it('desde un sábado o domingo, el primer día hábil es el lunes', async () => {
      const fromSaturday = await calculator.computeDueDate(day('2026-10-10'), 1, DayType.BUSINESS);
      const fromSunday = await calculator.computeDueDate(day('2026-10-11'), 1, DayType.BUSINESS);

      expect(fromSaturday).toEqual(day('2026-10-12'));
      expect(fromSunday).toEqual(day('2026-10-12'));
    });

    it('un plazo largo cruza varias semanas y nunca vence en fin de semana', async () => {
      const dueDate = await calculator.computeDueDate(day('2026-10-05'), 20, DayType.BUSINESS);

      expect(dueDate).toEqual(day('2026-11-02'));
      expect([0, 6]).not.toContain(dueDate.getUTCDay());
    });
  });

  describe('días corridos', () => {
    it('se suman uno a uno, fines de semana incluidos', async () => {
      const dueDate = await calculator.computeDueDate(day('2026-10-05'), 10, DayType.CONSECUTIVE);

      expect(dueDate).toEqual(day('2026-10-15'));
    });

    it('puede vencer en fin de semana', async () => {
      const dueDate = await calculator.computeDueDate(day('2026-10-05'), 5, DayType.CONSECUTIVE);

      expect(dueDate).toEqual(day('2026-10-10'));
      expect(dueDate.getUTCDay()).toBe(6);
    });
  });

  it('no calcula un plazo que no existe', async () => {
    await expect(calculator.computeDueDate(day('2026-10-05'), 0, DayType.NONE)).rejects.toThrow(Error);
    await expect(calculator.computeDueDate(day('2026-10-05'), 5, DayType.NONE)).rejects.toThrow(Error);
    await expect(calculator.computeDueDate(day('2026-10-05'), 0, DayType.BUSINESS)).rejects.toThrow(Error);
  });

  it('no modifica la fecha desde la que corre el plazo', async () => {
    const countsFrom = day('2026-10-05');

    await calculator.computeDueDate(countsFrom, 5, DayType.BUSINESS);

    expect(countsFrom).toEqual(day('2026-10-05'));
  });

  describe('días hábiles que restan hasta un vencimiento', () => {
    it('es cero si vence hoy', async () => {
      expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-10-06'))).toBe(0);
    });

    it('cuenta desde mañana (hoy excluido) hasta el vencimiento (incluido)', async () => {
      expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-10-07'))).toBe(1);
      expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-10-13'))).toBe(5);
    });

    it('saltea los fines de semana', async () => {
      expect(await calculator.businessDaysUntil(day('2026-10-09'), day('2026-10-12'))).toBe(1);
    });

    it('un vencimiento en fin de semana cuenta solo los días hábiles previos', async () => {
      expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-10-10'))).toBe(3);
    });

    it('es negativo si el plazo ya venció', async () => {
      expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-10-05'))).toBe(-1);
      expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-09-29'))).toBe(-5);
    });

    it('un vencimiento de un viernes visto el lunes siguiente hace un día hábil que venció', async () => {
      expect(await calculator.businessDaysUntil(day('2026-10-12'), day('2026-10-09'))).toBe(-1);
    });

    it('cuenta lo mismo hacia adelante que lo que cuenta hacia atrás, con el signo cambiado', async () => {
      const forward = await calculator.businessDaysUntil(day('2026-10-01'), day('2026-10-20'));
      const backward = await calculator.businessDaysUntil(day('2026-10-20'), day('2026-10-01'));

      expect(backward).toBe(-forward);
    });

    it('coincide con el cómputo del vencimiento: el plazo de N días hábiles deja N días por delante', async () => {
      const dueDate = await calculator.computeDueDate(day('2026-10-05'), 8, DayType.BUSINESS);

      expect(await calculator.businessDaysUntil(day('2026-10-05'), dueDate)).toBe(8);
    });
  });
});
