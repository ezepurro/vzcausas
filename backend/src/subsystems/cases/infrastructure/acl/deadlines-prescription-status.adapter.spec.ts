import { DeadlinesPrescriptionStatusAdapter } from './deadlines-prescription-status.adapter';
import { ListActivePrescriptions } from '../../core/application/use-cases/prescription/list-active-prescriptions.use-case';
import {
  CriminalCasePrescriptionRow,
  CriminalPrescriptionQueryPort,
} from '../../core/domain/ports/prescription/criminal-prescription-query.port';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

class FakeCriminalPrescriptionQuery implements CriminalPrescriptionQueryPort {
  rows: CriminalCasePrescriptionRow[] = [];

  async findActiveWithQualifications(): Promise<CriminalCasePrescriptionRow[]> {
    return this.rows;
  }
}

/** 36 meses desde el 15/1/2024: vence el 15/1/2027; al 1/3/2026 va por el 71 %. */
const row = (overrides: Partial<CriminalCasePrescriptionRow> = {}): CriminalCasePrescriptionRow => ({
  caseId: 7,
  caption: 'GÓMEZ, Ariel p.s.a. Lesiones leves',
  sacNumber: null,
  responsibleLawyerId: 20,
  offenses: [
    {
      legalQualificationId: 1,
      legalQualificationName: 'Lesiones leves',
      prescriptionMonths: 36,
      offenseDate: day('2024-01-15'),
    },
  ],
  lastInterruptiveActDate: null,
  ...overrides,
});

/** Con el caso de uso real: lo que se prueba es la traducción de su salida, no un doble de ella. */
function build() {
  const query = new FakeCriminalPrescriptionQuery();
  const adapter = new DeadlinesPrescriptionStatusAdapter(new ListActivePrescriptions(query));
  return { adapter, query };
}

describe('DeadlinesPrescriptionStatusAdapter', () => {
  it('traduce la prescripción de cases a lo que pidió deadlines, con la fecha en YYYY-MM-DD', async () => {
    const { adapter, query } = build();
    query.rows = [row()];

    await expect(adapter.findOfActiveCriminalCases(day('2026-03-01'))).resolves.toEqual([
      {
        caseId: 7,
        caption: 'GÓMEZ, Ariel p.s.a. Lesiones leves',
        sacNumber: null,
        responsibleLawyerId: 20,
        legalQualificationName: 'Lesiones leves',
        expiresOn: '2027-01-15',
        alert: true,
        expired: false,
        daysRemaining: 320,
      },
    ]);
  });

  it('computa contra la fecha que le pasa deadlines', async () => {
    const { adapter, query } = build();
    query.rows = [row()];

    const [before] = await adapter.findOfActiveCriminalCases(day('2026-02-01'));
    const [met] = await adapter.findOfActiveCriminalCases(day('2027-01-15'));

    expect(before).toMatchObject({ alert: false, expired: false });
    expect(met).toMatchObject({ alert: true, expired: true });
  });
});
