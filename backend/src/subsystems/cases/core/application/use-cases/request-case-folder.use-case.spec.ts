import { Logger } from '@nestjs/common';
import { InMemoryCaseFolderOutcomes } from '../../../infrastructure/events/in-memory-case-folder-outcomes';
import { CASE_REGISTERED, CaseRegisteredEvent } from '../../domain/ports/events/case-registered.event';
import { CaseFolderLawyerUnavailableError, CaseNotFoundError } from '../../domain/errors/case.errors';
import { FakeCaseFolderState, FakeEventPublisher } from '../../test-support/case-folder-fakes';
import { FakeCaseRepository, FakeClock, FakePeopleLookup } from '../../test-support/case-fakes';
import { CLIENT, INITIAL_STATES, LAWYER, NOW, TODAY, aCase } from '../../test-support/case-fixtures';
import { RequestCaseFolder } from './request-case-folder.use-case';

/** Plays the part of `documents` + the listener of `cases`: answers a published request. */
function answerWith(
  outcome: 'CREATED' | 'ERROR',
  folderState: FakeCaseFolderState,
  outcomes: InMemoryCaseFolderOutcomes,
) {
  return async ({ caseId }: { caseId: number }) => {
    if (outcome === 'CREATED') {
      await folderState.markCreated(caseId, 'drive-folder-1');
    } else {
      await folderState.markFailed(caseId);
    }
    outcomes.notify(caseId, outcome);
  };
}

function build(options: { waitMs?: number; lawyers?: (typeof LAWYER)[] } = {}) {
  const registered = aCase();
  const cases = new FakeCaseRepository(Object.values(INITIAL_STATES));
  cases.add(registered);
  const people = new FakePeopleLookup(options.lawyers ?? [LAWYER], [CLIENT]);
  const folderState = new FakeCaseFolderState();
  const outcomes = new InMemoryCaseFolderOutcomes();
  const events = new FakeEventPublisher();
  const useCase = new RequestCaseFolder(
    cases,
    people,
    folderState,
    outcomes,
    options.waitMs ?? 1000,
    new FakeClock(NOW, TODAY),
    events,
  );
  return { useCase, registered, folderState, outcomes, events, cases };
}

describe('RequestCaseFolder', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('pasa la causa a CREATING, publica CaseRegistered con sus datos y devuelve la carpeta creada', async () => {
    const { useCase, registered, folderState, outcomes, events } = build();
    events.onPublish = answerWith('CREATED', folderState, outcomes);

    const result = await useCase.execute({ caseId: registered.id });

    expect(result.outcome).toBe('CREATED');
    expect(result.folder).toMatchObject({ status: 'CREATED', url: expect.stringContaining('drive-folder-1') });
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({
      type: CASE_REGISTERED,
      caseId: registered.id,
      caption: registered.caption,
      lawyer: { id: LAWYER.id, lastName: 'Ríos', firstName: 'Malena' },
      jurisdiction: { id: registered.jurisdictionId, label: 'Penal' },
    });
    expect((events.published[0] as CaseRegisteredEvent).eventId).toBeTruthy();
  });

  it('rotula el fuero como lo ve el estudio, no con el código de la API', async () => {
    const { useCase, registered, folderState, outcomes, events } = build();
    events.onPublish = answerWith('CREATED', folderState, outcomes);

    await useCase.execute({ caseId: registered.id });

    expect((events.published[0] as CaseRegisteredEvent).jurisdiction.label).toBe('Penal');
  });

  it('si la creación falla a tiempo, devuelve la carpeta en ERROR', async () => {
    const { useCase, registered, folderState, outcomes, events } = build();
    events.onPublish = answerWith('ERROR', folderState, outcomes);

    const result = await useCase.execute({ caseId: registered.id });

    expect(result.outcome).toBe('ERROR');
    expect(result.folder?.status).toBe('ERROR');
  });

  it('si la respuesta tarda más que el límite, devuelve CREATING y no espera más', async () => {
    const { useCase, registered, folderState } = build({ waitMs: 20 });

    const result = await useCase.execute({ caseId: registered.id });

    expect(result.outcome).toBe('TIMEOUT');
    expect(result.folder?.status).toBe('CREATING');
    expect(folderState.statusOf(registered.id)).toBe('CREATING');
  });

  it('la respuesta que llega después del límite igual deja la carpeta creada', async () => {
    const { useCase, registered, folderState, outcomes } = build({ waitMs: 10 });
    await useCase.execute({ caseId: registered.id });

    await folderState.markCreated(registered.id, 'late-folder');
    outcomes.notify(registered.id, 'CREATED');

    expect(folderState.statusOf(registered.id)).toBe('CREATED');
  });

  it('registra la espera antes de publicar: una respuesta inmediata no se pierde', async () => {
    const { useCase, registered, folderState, outcomes, events } = build({ waitMs: 5000 });
    // Answers synchronously inside `publish`, before `publish` returns.
    events.onPublish = answerWith('CREATED', folderState, outcomes);

    const result = await useCase.execute({ caseId: registered.id });

    expect(result.outcome).toBe('CREATED');
  });

  it.each(['CREATING', 'CREATED'] as const)(
    'si la causa ya está en %s no pide nada nuevo y devuelve la carpeta como está',
    async (status) => {
      const { useCase, registered, folderState, events } = build();
      folderState.set(registered.id, status);

      const result = await useCase.execute({ caseId: registered.id });

      expect(result.outcome).toBe('NOT_REQUESTED');
      expect(result.folder?.status).toBe(status);
      expect(events.published).toHaveLength(0);
      expect(folderState.started).toHaveLength(0);
    },
  );

  it.each(['PENDING', 'ERROR', null] as const)(
    'una causa en %s sí puede pedir la carpeta',
    async (status) => {
      const { useCase, registered, folderState, outcomes, events } = build();
      folderState.set(registered.id, status);
      events.onPublish = answerWith('CREATED', folderState, outcomes);

      const result = await useCase.execute({ caseId: registered.id });

      expect(result.outcome).toBe('CREATED');
    },
  );

  it('dos pedidos a la vez publican un solo evento: el segundo ve la compuerta cerrada', async () => {
    const { useCase, registered, folderState, outcomes, events } = build();
    events.onPublish = answerWith('CREATED', folderState, outcomes);

    const [first, second] = await Promise.all([
      useCase.execute({ caseId: registered.id }),
      useCase.execute({ caseId: registered.id }),
    ]);

    expect(events.published).toHaveLength(1);
    expect([first.outcome, second.outcome].sort()).toEqual(['CREATED', 'NOT_REQUESTED']);
  });

  it('falla con CASE_NOT_FOUND si la causa no existe, sin tocar su estado', async () => {
    const { useCase, folderState, events } = build();

    await expect(useCase.execute({ caseId: 999 })).rejects.toBeInstanceOf(CaseNotFoundError);

    expect(folderState.started).toHaveLength(0);
    expect(events.published).toHaveLength(0);
  });

  it('falla si el abogado responsable ya no está vigente, antes de cerrar la compuerta', async () => {
    const { useCase, registered, folderState, events } = build({ lawyers: [] });

    await expect(useCase.execute({ caseId: registered.id })).rejects.toBeInstanceOf(
      CaseFolderLawyerUnavailableError,
    );

    expect(folderState.statusOf(registered.id)).toBe('PENDING');
    expect(events.published).toHaveLength(0);
  });

  it('si no se puede publicar, deja la carpeta en ERROR en vez de CREATING para siempre', async () => {
    const { useCase, registered, events } = build({ waitMs: 5000 });
    events.failWith = new Error('bus down');

    const result = await useCase.execute({ caseId: registered.id });

    expect(result.outcome).toBe('ERROR');
    expect(result.folder?.status).toBe('ERROR');
  });
});
