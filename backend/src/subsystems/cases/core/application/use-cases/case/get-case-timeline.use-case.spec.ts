import { CaseResponsibleChange } from '../../../domain/entities/case-responsible-change.entity';
import { InterruptiveAct } from '../../../domain/entities/interruptive-act.entity';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import {
  CaseTimelineQueryPort,
  CaseTimelineSources,
  PrescriptionDeclarationView,
  ResponsibleChangeView,
} from '../../../domain/ports/case/case-timeline-query.port';
import { InterruptiveActView } from '../../../domain/ports/interruptive-act/interruptive-act.repository';
import { ProceduralActView } from '../../../domain/ports/procedural-act/procedural-act.repository';
import { FakeClock } from '../../../test-support/case-fakes';
import { NOW, TODAY, anAct, day } from '../../../test-support/case-fixtures';
import { GetCaseTimeline, TimelineEntry } from './get-case-timeline.use-case';

const at = (iso: string) => new Date(iso);

/** Robo calificado, 96 meses desde el 27/02/2021: los actos de 2023 y 2024 lo reinician. */
const robbery = {
  legalQualificationId: 1,
  legalQualificationName: 'Robo calificado',
  prescriptionMonths: 96,
  offenseDate: day('2021-02-27'),
  prescriptionDeclaration: null,
};
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

/** `changedAt` is an instant; `changedOn` is its civil date in Córdoba, which the adapter computes. */
function responsibleChange(
  id: number,
  changedAt: string,
  changedOn: string,
  lawyers: { previous: number | null; next: number | null } = { previous: 3, next: 4 },
): ResponsibleChangeView {
  const person = (lawyerId: number | null) =>
    lawyerId === null ? null : { id: lawyerId, lastName: `Abogado ${lawyerId}`, firstName: 'X' };
  return {
    id,
    change: CaseResponsibleChange.create({
      caseId: 1,
      previousLawyerId: lawyers.previous,
      newLawyerId: lawyers.next,
      changedByUserId: 1,
      origin: 'LAWYER_REMOVAL',
      changedAt: at(changedAt),
    }),
    previousLawyer: person(lawyers.previous),
    newLawyer: person(lawyers.next),
    changedBy: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
    changedOn: day(changedOn),
  };
}

class FakeTimelineQuery implements CaseTimelineQueryPort {
  sources: CaseTimelineSources | null = {
    currentProceduralActId: null,
    proceduralActs: [],
    interruptiveActs: [],
    prescriptionDeclaration: null,
    offenses: [],
    responsibleChanges: [],
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
      case 'QUALIFICATION_PRESCRIPTION_DECLARATION':
        return `DECLARADA ${entry.legalQualification.id} ${date}`;
      case 'PRESCRIPTION_DECLARATION':
        return `PRESCRIPTA ${date}`;
      case 'RESPONSIBLE_LAWYER_CHANGE':
        return `CAMBIO ${entry.responsibleLawyerChange.id} ${date}`;
    }
  });
}

describe('GetCaseTimeline', () => {
  let query: FakeTimelineQuery;
  let useCase: GetCaseTimeline;

  beforeEach(() => {
    query = new FakeTimelineQuery();
    useCase = new GetCaseTimeline(query, new FakeClock(NOW, TODAY));
  });

  // CA-27.1 y CA-27.2
  it('intercala las tres fuentes, de la más reciente a la más antigua', async () => {
    query.sources = {
      currentProceduralActId: 2,
      proceduralActs: [procedural(2, '2025-05-10'), procedural(1, '2023-01-15')],
      interruptiveActs: [interruptive(7, '2024-07-04')],
      prescriptionDeclaration: declaration('2026-09-30'),
      offenses: [],
      responsibleChanges: [],
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
    query.sources!.offenses = [robbery];
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
    query.sources!.offenses = [robbery];
    query.sources!.interruptiveActs = [interruptive(7, '2024-07-04'), interruptive(8, '2024-07-04')];

    const entries = await useCase.execute({ caseId: 1 });
    const governing = entries.filter((e) => e.type === 'INTERRUPTIVE_ACT' && e.governsPrescription);

    expect(governing).toHaveLength(1);
    expect(governing[0].type === 'INTERRUPTIVE_ACT' && governing[0].interruptiveAct.act.id).toBe(8);
  });

  // D-113, CA-31.14: rige el acto del que cuenta `prescription`, no siempre el más reciente.
  it('un acto posterior al vencimiento de la calificación que rige no rige', async () => {
    // 24 meses desde el 10/01/2024: vence el 10/01/2026; el acto del 01/03/2026 no la reinicia.
    query.sources!.offenses = [{ ...robbery, prescriptionMonths: 24, offenseDate: day('2024-01-10') }];
    query.sources!.interruptiveActs = [interruptive(7, '2026-03-01')];

    const [entry] = await useCase.execute({ caseId: 1 });

    expect(entry).toMatchObject({ type: 'INTERRUPTIVE_ACT', governsPrescription: false });
  });

  // D-113, CA-33.16: cada calificación declarada es una entrada, con su calificación.
  it('incluye una entrada por cada calificación declarada prescripta', async () => {
    query.sources!.offenses = [robbery, { ...robbery, legalQualificationId: 2, prescriptionDeclaration: declaration('2026-09-15') }];

    const entries = await useCase.execute({ caseId: 1 });

    expect(shape(entries)).toEqual(['DECLARADA 2 2026-09-15']);
    expect(entries[0]).toMatchObject({ legalQualification: { id: 2, name: 'Robo calificado' } });
  });

  // CA-27.12
  it('incluye el pase a prescripta con su declaración', async () => {
    query.sources!.prescriptionDeclaration = declaration('2026-09-30');

    const [entry] = await useCase.execute({ caseId: 1 });

    expect(entry).toMatchObject({ type: 'PRESCRIPTION_DECLARATION', date: day('2026-09-30') });
  });

  // D-147: la cuarta fuente
  describe('cambios de responsable (D-147)', () => {
    it('intercala el cambio entre los actos, con la fecha civil de Córdoba y no la del instante en UTC', async () => {
      // 01:30Z del 19/11 son las 22:30 del 18/11 en Córdoba: el cambio es del 18.
      query.sources!.proceduralActs = [procedural(1, '2026-11-17'), procedural(2, '2026-11-19')];
      query.sources!.responsibleChanges = [responsibleChange(7, '2026-11-19T01:30:00.000Z', '2026-11-18')];

      expect(shape(await useCase.execute({ caseId: 1 }))).toEqual(['P2 2026-11-19', 'CAMBIO 7 2026-11-18', 'P1 2026-11-17']);
    });

    it('en la misma fecha va primero el último registrado, sea acto o cambio', async () => {
      query.sources!.proceduralActs = [procedural(1, '2026-11-18', '2026-11-18T12:00:00.000Z')];
      query.sources!.responsibleChanges = [
        responsibleChange(7, '2026-11-18T10:00:00.000Z', '2026-11-18'),
        responsibleChange(8, '2026-11-18T18:00:00.000Z', '2026-11-18'),
      ];

      expect(shape(await useCase.execute({ caseId: 1 }))).toEqual([
        'CAMBIO 8 2026-11-18',
        'P1 2026-11-18',
        'CAMBIO 7 2026-11-18',
      ]);
    });

    it('aparece en todos los fueros: no se oculta como los interruptivos y la prescripción', async () => {
      // Una causa que no es penal solo tiene actos procesales y estos cambios: la fuente no depende del fuero.
      query.sources!.responsibleChanges = [
        responsibleChange(7, '2026-11-18T15:00:00.000Z', '2026-11-18', { previous: 3, next: null }),
        responsibleChange(8, '2026-11-19T15:00:00.000Z', '2026-11-19', { previous: null, next: 4 }),
      ];

      const entries = await useCase.execute({ caseId: 1 });

      expect(shape(entries)).toEqual(['CAMBIO 8 2026-11-19', 'CAMBIO 7 2026-11-18']);
      expect(entries.map((e) => (e.type === 'RESPONSIBLE_LAWYER_CHANGE' ? e.responsibleLawyerChange.change.kind : null))).toEqual([
        'ASSIGNED_FROM_ORPHAN',
        'ORPHANED',
      ]);
    });
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
