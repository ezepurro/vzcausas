import { DeadlinesOpenDeadlinesAdapter } from './deadlines-open-deadlines.adapter';
import { ListOpenDeadlines } from '../../core/application/use-cases/list-open-deadlines.use-case';
import {
  OpenDeadlineQueryPort,
  OpenProceduralDeadlineRow,
} from '../../core/domain/ports/open-deadline-query.port';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

class FakeOpenDeadlineQuery implements OpenDeadlineQueryPort {
  rows: OpenProceduralDeadlineRow[] = [];

  async findActiveWithOpenDeadline(): Promise<OpenProceduralDeadlineRow[]> {
    return this.rows;
  }
}

const row = (overrides: Partial<OpenProceduralDeadlineRow> = {}): OpenProceduralDeadlineRow => ({
  caseId: 7,
  caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
  sacNumber: null,
  jurisdiction: JurisdictionCode.AMPARO,
  responsibleLawyerId: 20,
  proceduralActId: 100,
  dueDate: day('2026-10-09'),
  ...overrides,
});

/** Con el caso de uso real: lo que se prueba es la traducción de su salida, no un doble de ella. */
function build() {
  const query = new FakeOpenDeadlineQuery();
  const adapter = new DeadlinesOpenDeadlinesAdapter(new ListOpenDeadlines(query));
  return { adapter, query };
}

describe('DeadlinesOpenDeadlinesAdapter', () => {
  it('traduce el vencimiento de cases a lo que pidió deadlines, con la fecha en YYYY-MM-DD', async () => {
    const { adapter, query } = build();
    query.rows = [row()];

    await expect(adapter.findOfActiveCases(day('2026-10-06'))).resolves.toEqual([
      {
        caseId: 7,
        caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
        sacNumber: null,
        jurisdiction: 'AMPARO',
        responsibleLawyerId: 20,
        origin: 'PROCEDURAL_ACT',
        dueDate: '2026-10-09',
        businessDaysRemaining: 3,
        proceduralActId: 100,
      },
    ]);
  });

  it('traduce los tres fueros', async () => {
    const { adapter, query } = build();
    query.rows = [
      row({ caseId: 1, jurisdiction: JurisdictionCode.CRIMINAL }),
      row({ caseId: 2, jurisdiction: JurisdictionCode.ADMINISTRATIVE }),
      row({ caseId: 3, jurisdiction: JurisdictionCode.AMPARO }),
    ];

    const deadlines = await adapter.findOfActiveCases(day('2026-10-06'));

    expect(deadlines.map((d) => d.jurisdiction)).toEqual(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']);
  });
});
