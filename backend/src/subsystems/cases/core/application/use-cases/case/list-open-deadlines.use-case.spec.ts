import { ListOpenDeadlines } from './list-open-deadlines.use-case';
import {
  OpenDeadlineQueryPort,
  OpenHarmfulActRow,
  OpenProceduralDeadlineRow,
} from '../../../domain/ports/procedural-act/open-deadline-query.port';
import { DayType } from '../../../domain/value-objects/deadline/day-type';
import { JurisdictionCode } from '../../../domain/value-objects/case/jurisdiction-code';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** In-memory {@link OpenDeadlineQueryPort}: answers `rows` and `amparos`, or throws `failWith`. */
class FakeOpenDeadlineQuery implements OpenDeadlineQueryPort {
  rows: OpenProceduralDeadlineRow[] = [];
  amparos: OpenHarmfulActRow[] = [];
  failWith: Error | null = null;

  async findActiveWithOpenDeadline(): Promise<OpenProceduralDeadlineRow[]> {
    if (this.failWith) {
      throw this.failWith;
    }
    return this.rows;
  }

  async findActiveAmparosWithHarmfulAct(): Promise<OpenHarmfulActRow[]> {
    return this.amparos;
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

/** El ejemplo del contrato (V4 §3.7): acto lesivo del 3/8/2026, se renueva cada 30 días, 15 días hábiles. */
const amparo = (overrides: Partial<OpenHarmfulActRow> = {}): OpenHarmfulActRow => ({
  caseId: 9,
  caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
  sacNumber: null,
  jurisdiction: JurisdictionCode.AMPARO,
  responsibleLawyerId: 20,
  harmfulActDate: day('2026-08-03'),
  harmfulActRenews: true,
  harmfulActRenewalDays: 30,
  harmfulActTermDays: 15,
  harmfulActTermDayType: DayType.BUSINESS,
  ...overrides,
});

function build() {
  const query = new FakeOpenDeadlineQuery();
  return { useCase: new ListOpenDeadlines(query), query };
}

describe('ListOpenDeadlines', () => {
  describe('actos procesales', () => {
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
    it('devuelve también los vencidos y los lejanos', async () => {
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
  });

  // CA-51.5, D-78
  describe('acto lesivo del amparo', () => {
    it('calcula el vencimiento desde la renovación vigente, como el ejemplo del contrato', async () => {
      const { useCase, query } = build();
      query.amparos = [amparo()];

      // Al 15/9 la renovación vigente es la del 2/9: vence el 23/9, faltan 6 días hábiles.
      await expect(useCase.execute({ today: day('2026-09-15') })).resolves.toEqual([
        {
          caseId: 9,
          caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
          sacNumber: null,
          jurisdiction: JurisdictionCode.AMPARO,
          responsibleLawyerId: 20,
          origin: 'HARMFUL_ACT',
          proceduralActId: null,
          dueDate: day('2026-09-23'),
          businessDaysRemaining: 6,
        },
      ]);
    });

    // CA-51.5 "si el acto lesivo se renueva, toma la renovación vigente".
    it('cuando llega la renovación, el vencimiento pasa a contarse desde ella', async () => {
      const { useCase, query } = build();
      query.amparos = [amparo()];

      // El 1/9 rige el acto del 3/8: venció el 24/8. El 2/9 se renueva: vence el 23/9.
      const [beforeRenewal] = await useCase.execute({ today: day('2026-09-01') });
      const [onRenewal] = await useCase.execute({ today: day('2026-09-02') });

      expect(beforeRenewal).toMatchObject({ dueDate: day('2026-08-24'), businessDaysRemaining: -6 });
      expect(onRenewal).toMatchObject({ dueDate: day('2026-09-23'), businessDaysRemaining: 15 });
    });

    it('sin renovación, cuenta desde la fecha cargada, en días corridos si así se cargó', async () => {
      const { useCase, query } = build();
      query.amparos = [
        amparo({
          harmfulActRenews: false,
          harmfulActRenewalDays: null,
          harmfulActTermDays: 10,
          harmfulActTermDayType: DayType.CONSECUTIVE,
        }),
      ];

      const [view] = await useCase.execute({ today: day('2026-08-10') });

      expect(view).toMatchObject({ dueDate: day('2026-08-13'), businessDaysRemaining: 3 });
    });

    it('un amparo sin el plazo cargado no tiene vencimiento que calcular', async () => {
      const { useCase, query } = build();
      query.amparos = [amparo({ harmfulActTermDays: null, harmfulActTermDayType: null })];

      await expect(useCase.execute({ today: day('2026-09-15') })).resolves.toEqual([]);
    });
  });

  it('junta las dos fuentes en una sola lista, por causa', async () => {
    const { useCase, query } = build();
    query.rows = [row({ caseId: 3 }), row({ caseId: 10 })];
    query.amparos = [amparo({ caseId: 5 })];

    const views = await useCase.execute({ today: day('2026-10-06') });

    expect(views.map((v) => [v.caseId, v.origin])).toEqual([
      [3, 'PROCEDURAL_ACT'],
      [5, 'HARMFUL_ACT'],
      [10, 'PROCEDURAL_ACT'],
    ]);
  });

  it('si la consulta falla, propaga el error', async () => {
    const { useCase, query } = build();
    query.failWith = new Error('base caída');

    await expect(useCase.execute({ today: day('2026-10-06') })).rejects.toThrow('base caída');
  });
});
