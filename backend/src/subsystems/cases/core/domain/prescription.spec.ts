import { addPrescriptionMonths, prescriptionStartsOn } from './prescription';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('addPrescriptionMonths', () => {
  it('suma meses calendario', () => {
    expect(addPrescriptionMonths(day('2021-02-27'), 96)).toEqual(day('2029-02-27'));
  });

  it('en un mes más corto cae en su último día', () => {
    expect(addPrescriptionMonths(day('2026-01-31'), 1)).toEqual(day('2026-02-28'));
  });

  it('respeta el 29 de febrero de un año bisiesto', () => {
    expect(addPrescriptionMonths(day('2027-01-31'), 13)).toEqual(day('2028-02-29'));
  });

  it('cruza el año', () => {
    expect(addPrescriptionMonths(day('2026-11-15'), 3)).toEqual(day('2027-02-15'));
  });
});

describe('prescriptionStartsOn', () => {
  it('sin actos interruptivos cuenta desde la fecha del hecho', () => {
    expect(prescriptionStartsOn(day('2021-02-27'), null)).toEqual(day('2021-02-27'));
  });

  // CA-31.2
  it('con un acto interruptivo posterior cuenta desde ese acto', () => {
    expect(prescriptionStartsOn(day('2021-02-27'), day('2024-07-04'))).toEqual(day('2024-07-04'));
  });

  // CA-31.5
  it('un acto anterior al hecho no lo adelanta: sigue la fecha del hecho', () => {
    expect(prescriptionStartsOn(day('2021-02-27'), day('2020-05-10'))).toEqual(day('2021-02-27'));
  });

  it('un acto del mismo día que el hecho da la misma fecha', () => {
    expect(prescriptionStartsOn(day('2021-02-27'), day('2021-02-27'))).toEqual(day('2021-02-27'));
  });
});
