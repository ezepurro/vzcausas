import { DayType } from '../../core/domain/value-objects/deadline/day-type';
import { day } from '../../core/test-support/case-fixtures';
import { BusinessDaysDeadlineCalculatorAdapter } from './business-days-deadline-calculator.adapter';

/**
 * 2026-10-05 is a Monday: the week is 05 (Mon) ... 09 (Fri), 10 (Sat), 11 (Sun).
 *
 * El conteo de días hábiles, borde por borde, está en `core/domain/business-days.spec.ts`;
 * acá, que el adaptador lo use para cada tipo de día y que las dos operaciones coincidan.
 */
describe('BusinessDaysDeadlineCalculatorAdapter', () => {
  const calculator = new BusinessDaysDeadlineCalculatorAdapter();

  it('en días hábiles cuenta desde el día siguiente y saltea los fines de semana (RN5)', async () => {
    expect(await calculator.computeDueDate(day('2026-10-05'), 1, DayType.BUSINESS)).toEqual(day('2026-10-06'));
    expect(await calculator.computeDueDate(day('2026-10-05'), 5, DayType.BUSINESS)).toEqual(day('2026-10-12'));
    // Desde un viernes o un sábado, el primer día hábil es el lunes.
    expect(await calculator.computeDueDate(day('2026-10-09'), 1, DayType.BUSINESS)).toEqual(day('2026-10-12'));
    expect(await calculator.computeDueDate(day('2026-10-10'), 1, DayType.BUSINESS)).toEqual(day('2026-10-12'));
    // Un plazo largo cruza varias semanas y nunca vence en fin de semana.
    expect(await calculator.computeDueDate(day('2026-10-05'), 20, DayType.BUSINESS)).toEqual(day('2026-11-02'));
  });

  it('en días corridos suma uno a uno y puede vencer en fin de semana', async () => {
    expect(await calculator.computeDueDate(day('2026-10-05'), 10, DayType.CONSECUTIVE)).toEqual(day('2026-10-15'));

    const dueDate = await calculator.computeDueDate(day('2026-10-05'), 5, DayType.CONSECUTIVE);
    expect(dueDate).toEqual(day('2026-10-10'));
    expect(dueDate.getUTCDay()).toBe(6);
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

  it('los días hábiles que restan: hoy excluido y el vencimiento incluido, cero si vence hoy, negativos si venció', async () => {
    expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-10-06'))).toBe(0);
    expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-10-13'))).toBe(5);
    // Un vencimiento en fin de semana cuenta solo los días hábiles previos.
    expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-10-10'))).toBe(3);
    expect(await calculator.businessDaysUntil(day('2026-10-06'), day('2026-09-29'))).toBe(-5);
    // Un vencimiento de un viernes visto el lunes siguiente hace un día hábil que venció.
    expect(await calculator.businessDaysUntil(day('2026-10-12'), day('2026-10-09'))).toBe(-1);
  });

  it('coincide con el cómputo del vencimiento: el plazo de N días hábiles deja N días por delante', async () => {
    const dueDate = await calculator.computeDueDate(day('2026-10-05'), 8, DayType.BUSINESS);

    expect(await calculator.businessDaysUntil(day('2026-10-05'), dueDate)).toBe(8);
  });
});
