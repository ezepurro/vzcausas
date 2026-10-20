import { ListOpenDeadlines } from './list-open-deadlines.use-case';
import { OpenDeadlineQueryPort, OpenProceduralDeadlineRow } from '../../domain/ports/open-deadline-query.port';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** In-memory {@link OpenDeadlineQueryPort}: answers `rows`, or throws `failWith`. */
class FakeOpenDeadlineQuery implements OpenDeadlineQueryPort {
  rows: OpenProceduralDeadlineRow[] = [];
  failWith: Error | null = null;

  async findActiveWithOpenDeadline(): Promise<OpenProceduralDeadlineRow[]> {
    if (this.failWith) {
      throw this.failWith;
    }
    return this.rows;
  }
}

const row = (overrides: Partial<OpenProceduralDeadlineRow> = {}): OpenProceduralDeadlineRow => ({
  caseId: 7,
  caption: 'GÓMEZ, Ariel p.s.a. Robo calificado',
  sacNumber: '13284571',
  jurisdiction: JurisdictionCode.CRIMINAL,
  responsibleLawyerId: 20,
  proceduralActId: 100,
  dueDate: day('2026-10-09'),
  ...overrides,
});

function build() {
  const query = new FakeOpenDeadlineQuery();
  return { useCase: new ListOpenDeadlines(query), query };
}

describe('ListOpenDeadlines', () => {
  it('devuelve el vencimiento con su origen y los datos de la causa', async () => {
    const { useCase, query } = build();
    query.rows = [row()];

    // Martes 6/10/2026 → viernes 9/10/2026: 3 días hábiles.
    await expect(useCase.execute({ today: day('2026-10-06') })).resolves.toEqual([
      {
        caseId: 7,
        caption: 'GÓMEZ, Ariel p.s.a. Robo calificado',
        sacNumber: '13284571',
        jurisdiction: JurisdictionCode.CRIMINAL,
        responsibleLawyerId: 20,
        origin: 'PROCEDURAL_ACT',
        proceduralActId: 100,
        dueDate: day('2026-10-09'),
        businessDaysRemaining: 3,
      },
    ]);
  });

  // CA-51.4, D-73: de lunes a viernes, contado contra la fecha que recibe (V-06).
  it('cuenta los días hábiles contra la fecha que recibe, sin sábados ni domingos', async () => {
    const { useCase, query } = build();
    query.rows = [row({ dueDate: day('2026-10-12') })]; // lunes

    const [fromFriday] = await useCase.execute({ today: day('2026-10-09') });
    const [fromMonday] = await useCase.execute({ today: day('2026-10-12') });
    const [fromTuesday] = await useCase.execute({ today: day('2026-10-13') });

    expect(fromFriday.businessDaysRemaining).toBe(1);
    expect(fromMonday.businessDaysRemaining).toBe(0);
    expect(fromTuesday.businessDaysRemaining).toBe(-1);
  });

  // CA-51.3: un vencido sigue abierto y se devuelve; decidir qué se avisa es del consumidor.
  it('devuelve también los vencidos y los lejanos, en el orden en que llegan', async () => {
    const { useCase, query } = build();
    query.rows = [
      row({ caseId: 1, dueDate: day('2026-09-30') }),
      row({ caseId: 2, dueDate: day('2026-12-01') }),
    ];

    const views = await useCase.execute({ today: day('2026-10-06') });

    expect(views.map((v) => [v.caseId, v.businessDaysRemaining])).toEqual([
      [1, -4],
      [2, 40],
    ]);
  });

  it('si la consulta falla, propaga el error', async () => {
    const { useCase, query } = build();
    query.failWith = new Error('base caída');

    await expect(useCase.execute({ today: day('2026-10-06') })).rejects.toThrow('base caída');
  });
});
