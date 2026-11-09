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
    const prescription = Prescription.of(JurisdictionCode.CRIMINAL, [offense], [], day('2026-08-02'));

    expect(prescription).toEqual(Prescription.governing([offense], [], day('2026-08-02')));
    expect(prescription).toMatchObject({ legalQualificationId: 1, expiresOn: day('2026-11-01') });
  });

  it.each([JurisdictionCode.ADMINISTRATIVE, JurisdictionCode.AMPARO])('en el fuero %s no aplica', (jurisdiction) => {
    expect(Prescription.of(jurisdiction, [offense], [], day('2026-08-02'))).toBeNull();
  });

  it('es el mismo cálculo que summarizePrescription', () => {
    expect(summarizePrescription([offense], [day('2026-03-01')], day('2026-08-02'))).toEqual(
      Prescription.governing([offense], [day('2026-03-01')], day('2026-08-02')),
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
  /** 10 meses desde el 1/1/2026: vence el 1/11/2026 si ningún acto la reinicia. */
  const offense = (prescriptionDeclaredOn: Date | null = null) => ({
    offenseDate: day('2026-01-01'),
    prescriptionMonths: 10,
    prescriptionDeclaredOn,
  });

  it('sin actos interruptivos cuenta desde la fecha del hecho', () => {
    expect(prescriptionStartsOn(offense(), [])).toEqual(day('2026-01-01'));
  });

  // CA-31.2
  it('con un acto interruptivo posterior cuenta desde ese acto', () => {
    expect(prescriptionStartsOn(offense(), [day('2026-06-01')])).toEqual(day('2026-06-01'));
  });

  // CA-31.5
  it('un acto anterior al hecho no lo adelanta: sigue la fecha del hecho', () => {
    expect(prescriptionStartsOn(offense(), [day('2025-12-01')])).toEqual(day('2026-01-01'));
  });

  it('un acto del mismo día que el hecho da la misma fecha', () => {
    expect(prescriptionStartsOn(offense(), [day('2026-01-01')])).toEqual(day('2026-01-01'));
  });

  // D-113, CA-31.14: un delito que ya prescribió no vuelve a correr.
  // La tabla es la del plan (.claude/plans/tests-d113-prescripcion-por-delito.md).
  describe('un acto no reinicia una calificación que ya prescribió (D-113, CA-31.14)', () => {
    it.each([
      ['un acto anterior al vencimiento la reinicia', ['2026-10-31'], '2026-10-31'],
      ['el día del vencimiento el plazo ya está cumplido', ['2026-11-01'], '2026-01-01'],
      ['un acto posterior al vencimiento no la reinicia', ['2026-12-01'], '2026-01-01'],
      ['dos actos: el segundo, anterior al vencimiento nuevo, la vuelve a reiniciar', ['2026-06-01', '2027-03-01'], '2027-03-01'],
      ['dos actos: el segundo, posterior al vencimiento nuevo, no', ['2026-06-01', '2027-05-01'], '2026-06-01'],
      ['el orden en que se cargaron no importa', ['2027-05-01', '2026-06-01'], '2026-06-01'],
    ])('%s', (_case, acts, startsOn) => {
      expect(prescriptionStartsOn(offense(), acts.map(day))).toEqual(day(startsOn));
    });

    it('una calificación declarada prescripta no se reinicia con un acto posterior a la declaración', () => {
      expect(prescriptionStartsOn(offense(day('2026-09-15')), [day('2026-10-01')])).toEqual(day('2026-01-01'));
    });

    it('un acto anterior a la declaración, y anterior al vencimiento, sí la reinició', () => {
      expect(prescriptionStartsOn(offense(day('2026-09-15')), [day('2026-09-01')])).toEqual(day('2026-09-01'));
    });
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
    expect(summarizePrescription([], [], day('2026-10-06'))).toBeNull();
  });

  it('resume la calificación que prescribe primero', () => {
    const longer = tenMonths({ legalQualificationId: 1, legalQualificationName: 'Robo', prescriptionMonths: 96 });
    const shorter = tenMonths({ legalQualificationId: 2, legalQualificationName: 'Lesiones leves' });

    expect(summarizePrescription([longer, shorter], [], day('2026-03-01'))).toMatchObject({
      legalQualificationId: 2,
      legalQualificationName: 'Lesiones leves',
      startsOn: day('2026-01-01'),
      expiresOn: day('2026-11-01'),
      lastInterruptiveActDate: null,
    });
  });

  it('el 70 % se evalúa sobre el valor exacto, no sobre el redondeado', () => {
    // Día 212: 69,7 %, que se muestra como 70 pero todavía no es alerta.
    expect(summarizePrescription([tenMonths()], [], day('2026-08-01'))).toMatchObject({
      elapsedPercentage: 70,
      alert: false,
    });
    // Día 213: 70,1 %.
    expect(summarizePrescription([tenMonths()], [], day('2026-08-02'))).toMatchObject({
      elapsedPercentage: 70,
      alert: true,
      expired: false,
    });
  });

  it('el día del vencimiento el plazo está cumplido, y el porcentaje no pasa de 100', () => {
    expect(summarizePrescription([tenMonths()], [], day('2026-11-01'))).toMatchObject({
      elapsedPercentage: 100,
      alert: true,
      expired: true,
    });
    expect(summarizePrescription([tenMonths()], [], day('2027-05-01'))).toMatchObject({ elapsedPercentage: 100 });
    expect(summarizePrescription([tenMonths()], [], day('2026-10-31'))).toMatchObject({ expired: false });
  });

  it('remainingDays cuenta días calendario hasta el vencimiento, y es negativo una vez pasado', () => {
    // Vence el 1/11/2026.
    expect(summarizePrescription([tenMonths()], [], day('2026-10-06'))).toMatchObject({ remainingDays: 26 });
    expect(summarizePrescription([tenMonths()], [], day('2026-11-01'))).toMatchObject({ remainingDays: 0 });
    expect(summarizePrescription([tenMonths()], [], day('2026-11-03'))).toMatchObject({ remainingDays: -2 });
  });

  it('un acto interruptivo reinicia el cómputo y la alerta desaparece', () => {
    const summary = summarizePrescription([tenMonths()], [day('2026-09-01')], day('2026-10-06'));

    expect(summary).toMatchObject({
      startsOn: day('2026-09-01'),
      expiresOn: day('2027-07-01'),
      alert: false,
      lastInterruptiveActDate: day('2026-09-01'),
    });
  });

  it('un acto anterior al hecho no cuenta (CA-31.5)', () => {
    expect(summarizePrescription([tenMonths()], [day('2025-06-01')], day('2026-03-01'))).toMatchObject({
      startsOn: day('2026-01-01'),
      lastInterruptiveActDate: null,
    });
  });
});

// D-112: cada calificación informa su estado, con la misma regla que `prescription`.
describe('Prescription.ofEach', () => {
  /** Hecho del 1/1/2026. 10 meses: vence el 1/11/2026 (304 días). 96 meses: vence el 1/1/2034 (2922 días). */
  const shorter: OffenseForPrescription = {
    legalQualificationId: 2,
    legalQualificationName: 'Lesiones leves',
    prescriptionMonths: 10,
    offenseDate: day('2026-01-01'),
  };
  const longer: OffenseForPrescription = {
    legalQualificationId: 1,
    legalQualificationName: 'Robo',
    prescriptionMonths: 96,
    offenseDate: day('2026-01-01'),
  };

  it('una causa sin calificaciones no tiene ninguna', () => {
    expect(Prescription.ofEach([], [], day('2026-10-06'))).toEqual([]);
  });

  it('calcula una por calificación, en el mismo orden, cada una con su plazo', () => {
    // Día 213: la corta va por el 70,07 % (alerta); la larga, por el 7,29 %.
    const [first, second] = Prescription.ofEach([longer, shorter], [], day('2026-08-02'));

    expect(first).toMatchObject({
      legalQualificationId: 1,
      expiresOn: day('2034-01-01'),
      elapsedPercentage: 7,
      alert: false,
      expired: false,
    });
    expect(second).toMatchObject({
      legalQualificationId: 2,
      expiresOn: day('2026-11-01'),
      elapsedPercentage: 70,
      alert: true,
      expired: false,
    });
  });

  it('una calificación con el plazo cumplido no arrastra a las demás', () => {
    // 1/11/2026: la corta venció; la larga va por el 10,40 % (304 de 2922 días).
    const [first, second] = Prescription.ofEach([longer, shorter], [], day('2026-11-01'));

    expect(first.status).toEqual({ elapsedPercentage: 10, alert: false, expired: false });
    expect(second.status).toEqual({ elapsedPercentage: 100, alert: true, expired: true });
  });

  it('cada una cuenta desde el acto interruptivo, como la que rige', () => {
    const [only] = Prescription.ofEach([shorter], [day('2026-09-01')], day('2026-10-06'));

    expect(only).toMatchObject({ startsOn: day('2026-09-01'), lastInterruptiveActDate: day('2026-09-01') });
  });

  it('la que rige es la de menor vencimiento entre ellas, aunque ya esté cumplido (D-52)', () => {
    const today = day('2026-11-01');
    const each = Prescription.ofEach([longer, shorter], [], today);

    expect(Prescription.governing([longer, shorter], [], today)).toEqual(each[1]);
    expect(Prescription.governing([longer, shorter], [], today)?.expired).toBe(true);
  });
});

describe('Prescription.status', () => {
  it('expone sólo lo que el contrato pide por calificación', () => {
    const [only] = Prescription.ofEach(
      [{ legalQualificationId: 1, legalQualificationName: 'Robo', prescriptionMonths: 10, offenseDate: day('2026-01-01') }],
      [],
      day('2026-08-01'),
    );

    // Día 212: 69,7 %, que se muestra como 70 pero todavía no es alerta.
    expect(only.status).toEqual({ elapsedPercentage: 70, alert: false, expired: false });
  });
});

// D-113: la que rige se elige entre las calificaciones que no fueron declaradas prescriptas.
describe('Prescription.governing con calificaciones declaradas (D-113)', () => {
  /** Hecho del 1/1/2026. 10 meses: vence el 1/11/2026. 96 meses: vence el 1/1/2034. */
  const shorter: OffenseForPrescription = {
    legalQualificationId: 2,
    legalQualificationName: 'Lesiones leves',
    prescriptionMonths: 10,
    offenseDate: day('2026-01-01'),
  };
  const longer: OffenseForPrescription = {
    legalQualificationId: 1,
    legalQualificationName: 'Robo',
    prescriptionMonths: 96,
    offenseDate: day('2026-01-01'),
  };
  const today = day('2026-11-15');

  it('una declarada no rige: pasa a regir la que prescribe primero entre las que faltan', () => {
    const declared = { ...shorter, prescriptionDeclaredOn: day('2026-11-10') };

    expect(Prescription.governing([longer, declared], [], today)).toMatchObject({ legalQualificationId: 1, expired: false });
  });

  it('una con el plazo cumplido y sin declarar sigue rigiendo (D-52)', () => {
    expect(Prescription.governing([longer, shorter], [], today)).toMatchObject({ legalQualificationId: 2, expired: true });
  });

  it('si están todas declaradas, rige la que prescribe primero entre todas, como dato histórico', () => {
    const offenses = [
      { ...longer, prescriptionDeclaredOn: day('2026-11-12') },
      { ...shorter, prescriptionDeclaredOn: day('2026-11-10') },
    ];

    expect(Prescription.governing(offenses, [], today)).toMatchObject({ legalQualificationId: 2 });
  });

  it('cada cómputo informa el acto que fijó su inicio, o null si ninguno lo reinició', () => {
    // El acto del 1/12/2026 es posterior al vencimiento de la corta: sólo reinicia la larga.
    const [first, second] = Prescription.ofEach([longer, shorter], [day('2026-12-01')], day('2026-12-15'));

    expect(first).toMatchObject({ startsOn: day('2026-12-01'), lastInterruptiveActDate: day('2026-12-01') });
    expect(second).toMatchObject({ startsOn: day('2026-01-01'), lastInterruptiveActDate: null });
  });
});
