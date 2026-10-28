import {
  addPrescriptionMonths,
  OffenseForPrescription,
  Prescription,
  prescribesIn,
  prescriptionStartsOn,
  summarizePrescription,
} from './prescription';
import { JurisdictionCode } from './value-objects/case/jurisdiction-code';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('prescribesIn', () => {
  it('sólo prescribe el fuero penal', () => {
    expect(prescribesIn(JurisdictionCode.CRIMINAL)).toBe(true);
    expect(prescribesIn(JurisdictionCode.ADMINISTRATIVE)).toBe(false);
    expect(prescribesIn(JurisdictionCode.AMPARO)).toBe(false);
  });
});

describe('Prescription.of', () => {
  const offense: OffenseForPrescription = {
    legalQualificationId: 1,
    legalQualificationName: 'Lesiones leves',
    prescriptionMonths: 10,
    offenseDate: day('2026-01-01'),
  };

  it('en el fuero penal es la que gobierna la causa', () => {
    const prescription = Prescription.of(JurisdictionCode.CRIMINAL, [offense], null, day('2026-08-02'));

    expect(prescription).toEqual(Prescription.governing([offense], null, day('2026-08-02')));
    expect(prescription).toMatchObject({ legalQualificationId: 1, expiresOn: day('2026-11-01') });
  });

  it.each([JurisdictionCode.ADMINISTRATIVE, JurisdictionCode.AMPARO])('en el fuero %s no aplica', (jurisdiction) => {
    expect(Prescription.of(jurisdiction, [offense], null, day('2026-08-02'))).toBeNull();
  });

  it('es el mismo cálculo que summarizePrescription', () => {
    expect(summarizePrescription([offense], day('2026-03-01'), day('2026-08-02'))).toEqual(
      Prescription.governing([offense], day('2026-03-01'), day('2026-08-02')),
    );
  });
});

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

describe('summarizePrescription', () => {
  /** 10 meses desde el 1/1/2026: vence el 1/11/2026, 304 días después. El 70 % cae en el día 212,8. */
  const tenMonths = (overrides: Partial<OffenseForPrescription> = {}): OffenseForPrescription => ({
    legalQualificationId: 1,
    legalQualificationName: 'Lesiones leves',
    prescriptionMonths: 10,
    offenseDate: day('2026-01-01'),
    ...overrides,
  });

  it('una causa sin calificaciones no tiene resumen (D-74)', () => {
    expect(summarizePrescription([], null, day('2026-10-06'))).toBeNull();
  });

  it('resume la calificación que prescribe primero', () => {
    const longer = tenMonths({ legalQualificationId: 1, legalQualificationName: 'Robo', prescriptionMonths: 96 });
    const shorter = tenMonths({ legalQualificationId: 2, legalQualificationName: 'Lesiones leves' });

    expect(summarizePrescription([longer, shorter], null, day('2026-03-01'))).toMatchObject({
      legalQualificationId: 2,
      legalQualificationName: 'Lesiones leves',
      startsOn: day('2026-01-01'),
      expiresOn: day('2026-11-01'),
      lastInterruptiveActDate: null,
    });
  });

  it('el 70 % se evalúa sobre el valor exacto, no sobre el redondeado', () => {
    // Día 212: 69,7 %, que se muestra como 70 pero todavía no es alerta.
    expect(summarizePrescription([tenMonths()], null, day('2026-08-01'))).toMatchObject({
      elapsedPercentage: 70,
      alert: false,
    });
    // Día 213: 70,1 %.
    expect(summarizePrescription([tenMonths()], null, day('2026-08-02'))).toMatchObject({
      elapsedPercentage: 70,
      alert: true,
      expired: false,
    });
  });

  it('el día del vencimiento el plazo está cumplido, y el porcentaje no pasa de 100', () => {
    expect(summarizePrescription([tenMonths()], null, day('2026-11-01'))).toMatchObject({
      elapsedPercentage: 100,
      alert: true,
      expired: true,
    });
    expect(summarizePrescription([tenMonths()], null, day('2027-05-01'))).toMatchObject({ elapsedPercentage: 100 });
    expect(summarizePrescription([tenMonths()], null, day('2026-10-31'))).toMatchObject({ expired: false });
  });

  it('remainingDays cuenta días calendario hasta el vencimiento, y es negativo una vez pasado', () => {
    // Vence el 1/11/2026.
    expect(summarizePrescription([tenMonths()], null, day('2026-10-06'))).toMatchObject({ remainingDays: 26 });
    expect(summarizePrescription([tenMonths()], null, day('2026-11-01'))).toMatchObject({ remainingDays: 0 });
    expect(summarizePrescription([tenMonths()], null, day('2026-11-03'))).toMatchObject({ remainingDays: -2 });
  });

  it('un acto interruptivo reinicia el cómputo y la alerta desaparece', () => {
    const summary = summarizePrescription([tenMonths()], day('2026-09-01'), day('2026-10-06'));

    expect(summary).toMatchObject({
      startsOn: day('2026-09-01'),
      expiresOn: day('2027-07-01'),
      alert: false,
      lastInterruptiveActDate: day('2026-09-01'),
    });
  });

  it('un acto anterior al hecho no cuenta (CA-31.5)', () => {
    expect(summarizePrescription([tenMonths()], day('2025-06-01'), day('2026-03-01'))).toMatchObject({
      startsOn: day('2026-01-01'),
      lastInterruptiveActDate: null,
    });
  });
});
