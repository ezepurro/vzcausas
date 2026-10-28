import { InterruptiveAct } from '../../../domain/entities/interruptive-act.entity';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import {
  CaseTimelineQueryPort,
  CaseTimelineSources,
  PrescriptionDeclarationView,
} from '../../../domain/ports/case/case-timeline-query.port';
import { InterruptiveActView } from '../../../domain/ports/interruptive-act/interruptive-act.repository';
import { ProceduralActView } from '../../../domain/ports/procedural-act/procedural-act.repository';
import { anAct, day } from '../../../test-support/case-fixtures';
import { GetCaseTimeline, TimelineEntry } from './get-case-timeline.use-case';

const at = (iso: string) => new Date(iso);
const RIOS = { lastName: 'Ríos', firstName: 'Malena' };

function procedural(id: number, actDate: string, registeredAt = `${actDate}T15:00:00.000Z`): ProceduralActView {
  return {
    act: anAct({ id, actDate: day(actDate), registeredAt: at(registeredAt) }),
    resultingStateName: `Estado ${id}`,
    registeredBy: RIOS,
  };
}

function interruptive(id: number, actDate: string, registeredAt = `${actDate}T15:00:00.000Z`): InterruptiveActView {
  return {
    act: InterruptiveAct.hydrate({
      id,
      caseId: 1,
      name: `Interruptivo ${id}`,
      actDate: day(actDate),
      notes: null,
      registeredByUserId: 5,
      registeredByLawyerId: 2,
      registeredAt: at(registeredAt),
    }),
    registeredBy: RIOS,
  };
}

const declaration = (prescriptionDate: string): PrescriptionDeclarationView => ({
  prescriptionDate: day(prescriptionDate),
  resolution: 'Auto N° 123',
  grounds: null,
  registeredBy: { id: 5, ...RIOS },
  registeredAt: at(`${prescriptionDate}T18:00:00.000Z`),
});

class FakeTimelineQuery implements CaseTimelineQueryPort {
  sources: CaseTimelineSources | null = {
    currentProceduralActId: null,
    proceduralActs: [],
    interruptiveActs: [],
    prescriptionDeclaration: null,
  };

  async findSources(): Promise<CaseTimelineSources | null> {
    return this.sources;
  }
}

/** A readable fingerprint of each entry: its kind, its id and its date. */
function shape(entries: TimelineEntry[]): string[] {
  return entries.map((entry) => {
    const date = entry.date.toISOString().slice(0, 10);
    switch (entry.type) {
      case 'PROCEDURAL_ACT':
        return `P${entry.proceduralAct.act.id} ${date}`;
      case 'INTERRUPTIVE_ACT':
        return `I${entry.interruptiveAct.act.id} ${date}`;
      case 'PRESCRIPTION_DECLARATION':
        return `PRESCRIPTA ${date}`;
    }
  });
}

describe('GetCaseTimeline', () => {
  let query: FakeTimelineQuery;
  let useCase: GetCaseTimeline;

  beforeEach(() => {
    query = new FakeTimelineQuery();
    useCase = new GetCaseTimeline(query);
  });

  // CA-27.1 y CA-27.2
  it('intercala las tres fuentes, de la más reciente a la más antigua', async () => {
    query.sources = {
      currentProceduralActId: 2,
      proceduralActs: [procedural(2, '2025-05-10'), procedural(1, '2023-01-15')],
      interruptiveActs: [interruptive(7, '2024-07-04')],
      prescriptionDeclaration: declaration('2026-09-30'),
    };

    const entries = await useCase.execute({ caseId: 1 });

    expect(shape(entries)).toEqual(['PRESCRIPTA 2026-09-30', 'P2 2025-05-10', 'I7 2024-07-04', 'P1 2023-01-15']);
  });

  it('en la misma fecha, primero el último registrado, sea del tipo que sea', async () => {
    query.sources!.proceduralActs = [procedural(1, '2024-07-04', '2024-07-04T10:00:00.000Z')];
    query.sources!.interruptiveActs = [interruptive(7, '2024-07-04', '2024-07-04T12:00:00.000Z')];

    expect(shape(await useCase.execute({ caseId: 1 }))).toEqual(['I7 2024-07-04', 'P1 2024-07-04']);
  });

  /** No depende del orden en que llegan las fuentes: el puerto no promete ninguno. */
  it('ordena aunque las fuentes lleguen desordenadas', async () => {
    query.sources!.proceduralActs = [procedural(1, '2023-01-15'), procedural(2, '2025-05-10')];

    expect(shape(await useCase.execute({ caseId: 1 }))).toEqual(['P2 2025-05-10', 'P1 2023-01-15']);
  });

  // CA-27.4
  it('marca como vigente solo el acto que llevó la causa a su estado actual', async () => {
    query.sources!.currentProceduralActId = 1;
    query.sources!.proceduralActs = [procedural(2, '2025-05-10'), procedural(1, '2023-01-15')];

    const entries = await useCase.execute({ caseId: 1 });

    expect(entries.map((e) => (e.type === 'PROCEDURAL_ACT' ? e.current : null))).toEqual([false, true]);
  });

  it('una causa sin acto vigente no marca ninguno', async () => {
    query.sources!.proceduralActs = [procedural(1, '2023-01-15')];

    const [entry] = await useCase.execute({ caseId: 1 });

    expect(entry.type === 'PROCEDURAL_ACT' && entry.current).toBe(false);
  });

  // CA-27.11
  it('el interruptivo que rige es el de fecha más reciente, aunque se haya registrado antes', async () => {
    query.sources!.interruptiveActs = [
      // Registrado último, pero con fecha anterior: no rige (CA-31.4).
      interruptive(9, '2023-03-01', '2026-10-01T15:00:00.000Z'),
      interruptive(7, '2024-07-04', '2024-07-05T15:00:00.000Z'),
    ];

    const entries = await useCase.execute({ caseId: 1 });

    expect(
      entries.map((e) => (e.type === 'INTERRUPTIVE_ACT' ? [e.interruptiveAct.act.id, e.governsPrescription] : null)),
    ).toEqual([
      [7, true],
      [9, false],
    ]);
  });

  it('con dos interruptivos de la misma fecha rige el de id mayor, y uno solo', async () => {
    query.sources!.interruptiveActs = [interruptive(7, '2024-07-04'), interruptive(8, '2024-07-04')];

    const entries = await useCase.execute({ caseId: 1 });
    const governing = entries.filter((e) => e.type === 'INTERRUPTIVE_ACT' && e.governsPrescription);

    expect(governing).toHaveLength(1);
    expect(governing[0].type === 'INTERRUPTIVE_ACT' && governing[0].interruptiveAct.act.id).toBe(8);
  });

  // CA-27.12
  it('incluye el pase a prescripta con su declaración', async () => {
    query.sources!.prescriptionDeclaration = declaration('2026-09-30');

    const [entry] = await useCase.execute({ caseId: 1 });

    expect(entry).toMatchObject({ type: 'PRESCRIPTION_DECLARATION', date: day('2026-09-30') });
  });

  // CA-27.14
  it('una causa sin movimientos devuelve la lista vacía', async () => {
    expect(await useCase.execute({ caseId: 1 })).toEqual([]);
  });

  // CA-27.16
  it('una causa inexistente o dada de baja lanza CaseNotFoundError', async () => {
    query.sources = null;

    await expect(useCase.execute({ caseId: 99 })).rejects.toBeInstanceOf(CaseNotFoundError);
  });
});
