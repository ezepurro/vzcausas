import { Logger } from '@nestjs/common';
import { InMemoryCaseFolderOutcomes } from '../../../../infrastructure/events/in-memory-case-folder-outcomes';
import { CASE_REGISTERED, CaseRegisteredEvent } from '../../../domain/ports/events/case-registered.event';
import { CASE_TEMPLATES_COPY_REQUESTED } from '../../../domain/ports/events/case-templates-copy-requested.event';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import { FakeCaseFolderState, FakeEventPublisher } from '../../../test-support/case-folder-fakes';
import { FakeCaseRepository, FakeClock, FakePeopleLookup } from '../../../test-support/case-fakes';
import { CLIENT, INITIAL_STATES, LAWYER, NOW, TODAY, aCase } from '../../../test-support/case-fixtures';
import { RequestCaseFolder } from './request-case-folder.use-case';

/**
 * Plays the part of `documents` + the listener of `cases`: answers a published
 * request. A created folder is followed by the end of the copy (`COPIED`), as
 * `documents` announces it when the request asked for the templates.
 */
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
    if (outcome === 'CREATED') {
      outcomes.notify(caseId, 'COPIED');
    }
  };
}

function build(
  options: { waitMs?: number; lawyers?: (typeof LAWYER)[]; deactivatedLawyers?: (typeof LAWYER)[] } = {},
) {
  const registered = aCase();
  const cases = new FakeCaseRepository(Object.values(INITIAL_STATES));
  cases.add(registered);
  const people = new FakePeopleLookup(options.lawyers ?? [LAWYER], [CLIENT], options.deactivatedLawyers ?? []);
  const folderState = new FakeCaseFolderState();
  const outcomes = new InMemoryCaseFolderOutcomes(options.waitMs ?? 1000);
  const events = new FakeEventPublisher();
  const useCase = new RequestCaseFolder(cases, people, folderState, outcomes, new FakeClock(NOW, TODAY), events);
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

  it('si el abogado responsable fue dado de baja igual pide la carpeta, con su nombre (RN12)', async () => {
    const { useCase, registered, folderState, outcomes, events } = build({
      lawyers: [],
      deactivatedLawyers: [LAWYER],
    });
    events.onPublish = answerWith('CREATED', folderState, outcomes);

    const result = await useCase.execute({ caseId: registered.id });

    expect(result.outcome).toBe('CREATED');
    expect((events.published[0] as CaseRegisteredEvent).lawyer).toEqual({
      id: LAWYER.id,
      lastName: 'Ríos',
      firstName: 'Malena',
    });
  });

  it('si el abogado responsable no existe es una referencia rota: falla sin cerrar la compuerta', async () => {
    const { useCase, registered, folderState, events } = build({ lawyers: [] });

    await expect(useCase.execute({ caseId: registered.id })).rejects.toThrow(/does not exist/);

    expect(folderState.statusOf(registered.id)).toBe('PENDING');
    expect(events.published).toHaveLength(0);
  });

  describe('modelos formales (HU40)', () => {
    /** Plays `documents`: creates the folder, copies `copied` templates and leaves `pending` for later. */
    const answerAndCopy =
      (copied: number, pending: number, folderState: FakeCaseFolderState, outcomes: InMemoryCaseFolderOutcomes) =>
      async ({ caseId }: { caseId: number }) => {
        await folderState.markCreated(caseId, 'drive-folder-1');
        outcomes.notify(caseId, 'CREATED');
        folderState.setTemplates(caseId, copied, pending);
        outcomes.notify(caseId, 'COPIED');
      };

    it('por defecto pide copiar los modelos en CaseRegistered (CA-40.1)', async () => {
      const { useCase, registered, folderState, outcomes, events } = build();
      events.onPublish = answerWith('CREATED', folderState, outcomes);

      await useCase.execute({ caseId: registered.id });

      expect((events.published[0] as CaseRegisteredEvent).copyTemplates).toBe(true);
    });

    it('con copyTemplates en false no pide los modelos y no espera la copia (CA-40.4)', async () => {
      const { useCase, registered, folderState, outcomes, events } = build({ waitMs: 5000 });
      events.onPublish = answerWith('CREATED', folderState, outcomes);

      const result = await useCase.execute({ caseId: registered.id, copyTemplates: false });

      expect((events.published[0] as CaseRegisteredEvent).copyTemplates).toBe(false);
      expect(result.outcome).toBe('CREATED');
    });

    it('espera a que termine la copia y devuelve cuántos modelos se copiaron (CA-40.2)', async () => {
      const { useCase, registered, folderState, outcomes, events } = build({ waitMs: 5000 });
      events.onPublish = answerAndCopy(6, 0, folderState, outcomes);

      const result = await useCase.execute({ caseId: registered.id, copyTemplates: true });

      expect(result.folder).toMatchObject({ status: 'CREATED', templatesCopied: 6, templatesPending: 0 });
    });

    it('no termina con la carpeta creada si todavía falta la copia', async () => {
      const { useCase, registered, folderState, outcomes, events } = build({ waitMs: 30 });
      events.onPublish = async ({ caseId }) => {
        await folderState.markCreated(caseId, 'drive-folder-1');
        outcomes.notify(caseId, 'CREATED');
      };

      const result = await useCase.execute({ caseId: registered.id, copyTemplates: true });

      expect(result.outcome).toBe('TIMEOUT');
      expect(result.folder?.status).toBe('CREATED');
    });

    it('con la carpeta CREATED y modelos pendientes publica CaseTemplatesCopyRequested y espera la copia (CA-40.7)', async () => {
      const { useCase, registered, folderState, outcomes, events } = build({ waitMs: 5000 });
      folderState.set(registered.id, 'CREATED');
      folderState.setTemplates(registered.id, 5, 1);
      events.onPublish = async ({ caseId }) => {
        folderState.setTemplates(caseId, 6, 0);
        outcomes.notify(caseId, 'COPIED');
      };

      const result = await useCase.execute({ caseId: registered.id });

      expect(events.published.map((e) => e.type)).toEqual([CASE_TEMPLATES_COPY_REQUESTED]);
      expect(events.published[0]).toMatchObject({ caseId: registered.id });
      expect(folderState.started).toHaveLength(0);
      expect(result.folder).toMatchObject({ templatesCopied: 6, templatesPending: 0 });
      expect(result.outcome).toBe('CREATED');
    });

    it('con la carpeta CREATED y nada pendiente no pide nada (CA-40.7)', async () => {
      const { useCase, registered, folderState, events } = build();
      folderState.set(registered.id, 'CREATED');
      folderState.setTemplates(registered.id, 6, 0);

      const result = await useCase.execute({ caseId: registered.id });

      expect(result.outcome).toBe('NOT_REQUESTED');
      expect(events.published).toHaveLength(0);
    });

    it('con copyTemplates en false no reintenta los modelos pendientes', async () => {
      const { useCase, registered, folderState, events } = build();
      folderState.set(registered.id, 'CREATED');
      folderState.setTemplates(registered.id, 5, 1);

      const result = await useCase.execute({ caseId: registered.id, copyTemplates: false });

      expect(result.outcome).toBe('NOT_REQUESTED');
      expect(events.published).toHaveLength(0);
    });

    it('si no se puede publicar el reintento de modelos, responde ERROR sin tocar la carpeta', async () => {
      const { useCase, registered, folderState, events } = build({ waitMs: 5000 });
      folderState.set(registered.id, 'CREATED');
      folderState.setTemplates(registered.id, 5, 1);
      events.failWith = new Error('bus down');

      const result = await useCase.execute({ caseId: registered.id });

      expect(result.outcome).toBe('ERROR');
      expect(result.folder).toMatchObject({ status: 'CREATED', templatesPending: 1 });
    });
  });

  it('si no se puede publicar, deja la carpeta en ERROR en vez de CREATING para siempre', async () => {
    const { useCase, registered, events } = build({ waitMs: 5000 });
    events.failWith = new Error('bus down');

    const result = await useCase.execute({ caseId: registered.id });

    expect(result.outcome).toBe('ERROR');
    expect(result.folder?.status).toBe('ERROR');
  });
});
