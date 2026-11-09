import { ListActivePrescriptions } from './list-active-prescriptions.use-case';
import {
  CriminalCasePrescriptionRow,
  CriminalPrescriptionQueryPort,
} from '../../../domain/ports/prescription/criminal-prescription-query.port';
import { OffenseForPrescription } from '../../../domain/prescription';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** In-memory {@link CriminalPrescriptionQueryPort}: answers `rows`, or throws `failWith`. */
class FakeCriminalPrescriptionQuery implements CriminalPrescriptionQueryPort {
  rows: CriminalCasePrescriptionRow[] = [];
  failWith: Error | null = null;

  async findActiveWithQualifications(): Promise<CriminalCasePrescriptionRow[]> {
    if (this.failWith) {
      throw this.failWith;
    }
    return this.rows;
  }
}

/**
 * 36 meses desde el 15/1/2024: vence el 15/1/2027, 1096 días después. El 70 %
 * cae en el día 767,2: el 1/2/2026 (día 748) está en 68 %, el 1/3/2026 (día 776)
 * en 71 %.
 */
const threeYears = (overrides: Partial<OffenseForPrescription> = {}): OffenseForPrescription => ({
  legalQualificationId: 1,
  legalQualificationName: 'Lesiones leves',
  prescriptionMonths: 36,
  offenseDate: day('2024-01-15'),
  ...overrides,
});

const row = (overrides: Partial<CriminalCasePrescriptionRow> = {}): CriminalCasePrescriptionRow => ({
  caseId: 7,
  caption: 'GÓMEZ, Ariel p.s.a. Lesiones leves',
  sacNumber: '87654321',
  responsibleLawyerId: 20,
  offenses: [threeYears()],
  interruptiveActDates: [],
  ...overrides,
});

function build() {
  const query = new FakeCriminalPrescriptionQuery();
  return { useCase: new ListActivePrescriptions(query), query };
}

describe('ListActivePrescriptions', () => {
  it('devuelve los datos de la causa junto con su prescripción', async () => {
    const { useCase, query } = build();
    query.rows = [row()];

    const [view] = await useCase.execute({ today: day('2026-03-01') });

    expect(view).toMatchObject({
      caseId: 7,
      caption: 'GÓMEZ, Ariel p.s.a. Lesiones leves',
      sacNumber: '87654321',
      responsibleLawyerId: 20,
      prescription: {
        legalQualificationName: 'Lesiones leves',
        startsOn: day('2024-01-15'),
        expiresOn: day('2027-01-15'),
        elapsedPercentage: 71,
        alert: true,
        expired: false,
      },
    });
  });

  // V-06: la fecha la pone quien llama, no un reloj propio.
  it('computa contra la fecha que recibe', async () => {
    const { useCase, query } = build();
    query.rows = [row()];

    const [before] = await useCase.execute({ today: day('2026-02-01') });
    const [after] = await useCase.execute({ today: day('2026-03-01') });
    const [met] = await useCase.execute({ today: day('2027-01-15') });

    expect(before.prescription).toMatchObject({ elapsedPercentage: 68, alert: false });
    expect(after.prescription).toMatchObject({ alert: true, expired: false });
    expect(met.prescription).toMatchObject({ alert: true, expired: true });
  });

  // CA-52.3
  it('usa la calificación que prescribe primero', async () => {
    const { useCase, query } = build();
    query.rows = [
      row({
        offenses: [
          threeYears({ legalQualificationId: 1, legalQualificationName: 'Robo calificado', prescriptionMonths: 96 }),
          threeYears({ legalQualificationId: 2, legalQualificationName: 'Lesiones leves' }),
        ],
      }),
    ];

    const [view] = await useCase.execute({ today: day('2026-03-01') });

    expect(view.prescription).toMatchObject({
      legalQualificationName: 'Lesiones leves',
      expiresOn: day('2027-01-15'),
    });
  });

  // CA-52.3, CA-52.6: el acto interruptivo reinicia el cómputo y la causa sale de alerta.
  it('cuenta desde el último acto interruptivo', async () => {
    const { useCase, query } = build();
    query.rows = [row({ interruptiveActDates: [day('2026-01-01')] })];

    const [view] = await useCase.execute({ today: day('2026-03-01') });

    expect(view.prescription).toMatchObject({
      startsOn: day('2026-01-01'),
      expiresOn: day('2029-01-01'),
      alert: false,
      lastInterruptiveActDate: day('2026-01-01'),
    });
  });

  it('devuelve todas las causas, en alerta o no, en el orden en que llegan', async () => {
    const { useCase, query } = build();
    query.rows = [
      row({ caseId: 1 }),
      row({ caseId: 2, offenses: [threeYears({ offenseDate: day('2025-06-01') })] }),
    ];

    const views = await useCase.execute({ today: day('2026-03-01') });

    expect(views.map((v) => [v.caseId, v.prescription.alert])).toEqual([
      [1, true],
      [2, false],
    ]);
  });

  // D-74: la consulta ya las deja afuera; el caso de uso no depende solo de eso.
  it('descarta una causa sin calificaciones', async () => {
    const { useCase, query } = build();
    query.rows = [row({ caseId: 1, offenses: [] }), row({ caseId: 2 })];

    const views = await useCase.execute({ today: day('2026-03-01') });

    expect(views.map((v) => v.caseId)).toEqual([2]);
  });

  it('si la consulta falla, propaga el error', async () => {
    const { useCase, query } = build();
    query.failWith = new Error('base caída');

    await expect(useCase.execute({ today: day('2026-03-01') })).rejects.toThrow('base caída');
  });
});
