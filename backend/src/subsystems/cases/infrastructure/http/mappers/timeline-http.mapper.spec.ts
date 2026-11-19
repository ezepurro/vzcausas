import { ConfigService } from '@nestjs/config';
import { TimelineEntry } from '../../../core/application/use-cases/case/get-case-timeline.use-case';
import { CaseResponsibleChange } from '../../../core/domain/entities/case-responsible-change.entity';
import { day } from '../../../core/test-support/case-fixtures';
import { InterruptiveActHttpMapper } from './interruptive-act-http.mapper';
import { ProceduralActHttpMapper } from './procedural-act-http.mapper';
import { TimelineHttpMapper } from './timeline-http.mapper';

/* HU27, D-147 · La entrada RESPONSIBLE_LAWYER_CHANGE sale tal como la define el contrato. */
describe('TimelineHttpMapper', () => {
  const config = { getOrThrow: () => 'America/Argentina/Cordoba' } as unknown as ConfigService;
  const mapper = new TimelineHttpMapper(config, new ProceduralActHttpMapper(config), new InterruptiveActHttpMapper(config));

  const RIOS = { id: 3, lastName: 'Ríos', firstName: 'Malena' };
  const GAGA = { id: 4, lastName: 'Gaga', firstName: 'Pablo' };
  const VAZQUEZ = { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' };

  function entry(lawyers: { previous: typeof RIOS | null; next: typeof GAGA | null }): TimelineEntry {
    return {
      type: 'RESPONSIBLE_LAWYER_CHANGE',
      date: day('2026-11-19'),
      registeredAt: new Date('2026-11-19T13:15:00.000Z'),
      responsibleLawyerChange: {
        id: 7,
        change: CaseResponsibleChange.create({
          caseId: 1,
          previousLawyerId: lawyers.previous?.id ?? null,
          newLawyerId: lawyers.next?.id ?? null,
          changedByUserId: VAZQUEZ.id,
          origin: 'LAWYER_REMOVAL',
          changedAt: new Date('2026-11-19T13:15:00.000Z'),
        }),
        previousLawyer: lawyers.previous,
        newLawyer: lawyers.next,
        changedBy: VAZQUEZ,
        changedOn: day('2026-11-19'),
      },
    };
  }

  // Contrato V6, "Cambio de responsable en la línea de vida": el JSON textual.
  it('una reasignación sale con el JSON del contrato, con las claves en su orden', () => {
    const [response] = mapper.toResponse([entry({ previous: RIOS, next: GAGA })]);

    expect(response).toEqual({
      type: 'RESPONSIBLE_LAWYER_CHANGE',
      date: '2026-11-19',
      responsibleLawyerChange: {
        id: 7,
        caseId: 1,
        kind: 'REASSIGNED',
        previousLawyer: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
        newLawyer: { id: 4, lastName: 'Gaga', firstName: 'Pablo' },
        origin: 'LAWYER_REMOVAL',
        changedBy: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
        changedAt: '2026-11-19T10:15:00-03:00',
      },
    });
    expect(Object.keys(response)).toEqual(['type', 'date', 'responsibleLawyerChange']);
    expect(Object.keys((response as { responsibleLawyerChange: object }).responsibleLawyerChange)).toEqual([
      'id',
      'caseId',
      'kind',
      'previousLawyer',
      'newLawyer',
      'origin',
      'changedBy',
      'changedAt',
    ]);
  });

  it.each([
    ['la causa que queda huérfana', { previous: RIOS, next: null }, 'ORPHANED'],
    ['la huérfana que recibe abogado', { previous: null, next: GAGA }, 'ASSIGNED_FROM_ORPHAN'],
  ])('%s: el abogado que falta sale null y el kind es %s', (_name, lawyers, kind) => {
    const [response] = mapper.toResponse([entry(lawyers)]);

    expect(response).toMatchObject({
      responsibleLawyerChange: { kind, previousLawyer: lawyers.previous, newLawyer: lawyers.next },
    });
  });
});
