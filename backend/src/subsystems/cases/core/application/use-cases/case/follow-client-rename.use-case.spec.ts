import { Logger } from '@nestjs/common';
import { CaseDeactivation } from '../../../domain/value-objects/case/case-deactivation.vo';
import { CASE_MODIFIED } from '../../../domain/ports/events/case-modified.event';
import { FakeCaseFolderState, FakeEventPublisher } from '../../../test-support/case-folder-fakes';
import {
  FakeAuditTrail,
  FakeCaseRepository,
  FakeClock,
  FakePeopleLookup,
} from '../../../test-support/case-fakes';
import { aCase, CLIENT, INITIAL_STATES, LAWYER, NOW, TODAY } from '../../../test-support/case-fixtures';
import { CaseFolderAnnouncer } from './case-folder-announcer';
import { FollowClientRename, FollowClientRenameCommand } from './follow-client-rename.use-case';

/*
 * HU10 · Las carátulas de las causas siguen al nombre del cliente (CA-10.9) y
 * sus carpetas después (CA-10.10). Las reglas de la carátula están en
 * `case-follow-client-rename.spec.ts`; acá, qué causas se tocan, la
 * auditoría y el anuncio.
 */
function build() {
  const cases = new FakeCaseRepository(Object.values(INITIAL_STATES));
  cases.add(aCase({ id: 1, caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado' }));
  cases.add(aCase({ id: 2, caption: 'Ariel GÓMEZ c/ PÉREZ' }));
  cases.add(aCase({ id: 3, caption: 'GÓMEZ, Ariel Fernando p.s.a. Hurto', clientId: 99 }));
  const gone = aCase({ id: 4, caption: 'GÓMEZ, Ariel Fernando p.s.a. Estafa' });
  gone.deactivate(CaseDeactivation.create({ reason: null }, { deactivatedByUserId: 5, deactivatedAt: NOW }));
  cases.add(gone);
  const audit = new FakeAuditTrail();
  const folders = new FakeCaseFolderState();
  const events = new FakeEventPublisher();
  const useCase = new FollowClientRename(
    cases,
    audit,
    new FakeClock(NOW, TODAY),
    new CaseFolderAnnouncer(folders, new FakePeopleLookup([LAWYER], [CLIENT]), events),
  );
  return { useCase, cases, audit, folders, events };
}

const command = (overrides: Partial<FollowClientRenameCommand> = {}): FollowClientRenameCommand => ({
  clientId: CLIENT.id,
  previous: { lastName: 'GÓMEZ', firstName: 'Ariel Fernando' },
  next: { lastName: 'GÓMEZ PAZ', firstName: 'Ariel Fernando' },
  actorUserId: 9,
  occurredAt: NOW,
  ...overrides,
});

describe('FollowClientRename', () => {
  // CA-10.9, CA-10.5
  it('cambia la carátula de las causas vigentes del cliente que empiezan con su nombre y audita cada una', async () => {
    const { useCase, cases, audit } = build();

    const renamed = await useCase.execute(command());

    // La 2 está escrita de otra forma, la 3 es de otro cliente y la 4 está dada de baja.
    expect(renamed).toEqual([1]);
    expect(cases.captionsSaved).toEqual([[1, 'GÓMEZ PAZ, Ariel Fernando p.s.a. Robo calificado']]);
    expect(audit.entries).toEqual([
      {
        actorUserId: 9,
        action: 'case.updated',
        entityType: 'Case',
        entityId: '1',
        occurredAt: NOW,
        metadata: { changedFields: ['caption'] },
      },
    ]);
  });

  // CA-10.10
  describe('announce', () => {
    beforeEach(() => jest.spyOn(Logger.prototype, 'error').mockImplementation());
    afterEach(() => jest.restoreAllMocks());

    it('pide renombrar la carpeta de cada causa renombrada que la tiene creada', async () => {
      const { useCase, folders, events } = build();
      folders.set(1, 'CREATED');
      await useCase.execute(command());

      await useCase.announce([1]);

      expect(events.published).toEqual([
        expect.objectContaining({
          type: CASE_MODIFIED,
          caseId: 1,
          caption: 'GÓMEZ PAZ, Ariel Fernando p.s.a. Robo calificado',
          changed: ['caption'],
        }),
      ]);
    });

    it('sin carpeta creada no anuncia nada, y una falla no se propaga', async () => {
      const { useCase, folders, events } = build();
      folders.set(1, 'ERROR');
      await expect(useCase.announce([1])).resolves.toBeUndefined();
      expect(events.published).toEqual([]);

      folders.set(1, 'CREATED');
      events.failWith = new Error('bus caído');
      await expect(useCase.announce([1])).resolves.toBeUndefined();
    });
  });
});
