import { day } from '../../../test-support/case-fixtures';
import { DayType } from '../deadline/day-type';
import { HarmfulAct, HarmfulActProps } from './harmful-act.vo';

/** El ejemplo del contrato §3.7: acto lesivo del 03/08/2026, se renueva cada 30 días, plazo de 15 días hábiles. */
function anAct(overrides: Partial<HarmfulActProps> = {}): HarmfulAct {
  return HarmfulAct.create({
    date: day('2026-08-03'),
    renews: true,
    renewalDays: 30,
    termDays: 15,
    termDayType: DayType.BUSINESS,
    ...overrides,
  });
}

describe('HarmfulAct.deadline (D-78)', () => {
  it('con renovación toma la última que no supera hoy: es el ejemplo del contrato', () => {
    // Al 15/09/2026 pasaron 43 días: una renovación, la del 02/09/2026.
    expect(anAct().deadline(day('2026-09-15'))).toEqual({
      actDate: day('2026-09-02'),
      renewed: true,
      dueDate: day('2026-09-23'),
      businessDaysRemaining: 6,
    });
  });

  it('antes de la primera renovación cuenta desde la fecha cargada', () => {
    expect(anAct().deadline(day('2026-08-20'))).toMatchObject({
      actDate: day('2026-08-03'),
      renewed: false,
      dueDate: day('2026-08-24'),
      businessDaysRemaining: 2,
    });
  });

  it('el mismo día de una renovación esa renovación ya rige', () => {
    expect(anAct().deadline(day('2026-09-02'))).toMatchObject({ actDate: day('2026-09-02'), renewed: true });
  });

  it('el día anterior a una renovación todavía rige la anterior', () => {
    expect(anAct().deadline(day('2026-09-01'))).toMatchObject({ actDate: day('2026-08-03'), renewed: false });
  });

  it('con varias renovaciones transcurridas toma siempre la más reciente', () => {
    // 03/08 + 90 días = 01/11/2026.
    expect(anAct().deadline(day('2026-11-05'))).toMatchObject({ actDate: day('2026-11-01'), renewed: true });
  });

  it('sin renovación cuenta siempre desde la fecha cargada, aunque haya pasado mucho tiempo', () => {
    const act = anAct({ renews: false, renewalDays: null });

    expect(act.deadline(day('2026-12-01'))).toMatchObject({ actDate: day('2026-08-03'), renewed: false });
  });

  it('un acto lesivo posterior a hoy cuenta desde su fecha', () => {
    expect(anAct().deadline(day('2026-07-01'))).toMatchObject({ actDate: day('2026-08-03'), renewed: false });
  });

  it('en días corridos suma el plazo sin saltear fines de semana', () => {
    const act = anAct({ renews: false, renewalDays: null, termDayType: DayType.CONSECUTIVE });

    expect(act.deadline(day('2026-08-10'))).toMatchObject({ dueDate: day('2026-08-18'), businessDaysRemaining: 6 });
  });

  it('en días hábiles cuenta desde el día siguiente y saltea sábados y domingos', () => {
    // Viernes 07/08/2026 + 1 día hábil = lunes 10/08/2026.
    const act = anAct({ date: day('2026-08-07'), renews: false, renewalDays: null, termDays: 1 });

    expect(act.deadline(day('2026-08-07')).dueDate).toEqual(day('2026-08-10'));
  });

  it('un plazo vencido sigue abierto y sale con días hábiles negativos', () => {
    const act = anAct({ renews: false, renewalDays: null });

    expect(act.deadline(day('2026-09-15'))).toMatchObject({
      dueDate: day('2026-08-24'),
      businessDaysRemaining: -16,
    });
  });

  it('vence hoy cuando hoy es el vencimiento', () => {
    const act = anAct({ renews: false, renewalDays: null });

    expect(act.deadline(day('2026-08-24')).businessDaysRemaining).toBe(0);
  });
});
