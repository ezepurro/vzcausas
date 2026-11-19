import { Logger } from '@nestjs/common';
import { CASE_MODIFIED } from '../../../domain/ports/events/case-modified.event';
import { FakeCaseRepository, FakeClock, FakePeopleLookup } from '../../../test-support/case-fakes';
import { FakeCaseFolderState, FakeEventPublisher } from '../../../test-support/case-folder-fakes';
import { aCase, anOrphanedCase, CLIENT, INITIAL_STATES, LAWYER, NOW, STATES_TABLE, TODAY } from '../../../test-support/case-fixtures';
import { AnnounceReassignedCaseFolders } from './announce-reassigned-case-folders.use-case';
import { CaseFolderAnnouncer } from './case-folder-announcer';

/* HU15 · Después de la baja del abogado, las carpetas de Drive siguen a sus causas (D-104, D-143). */
function build() {
  const cases = new FakeCaseRepository([...Object.values(INITIAL_STATES), ...STATES_TABLE]);
  const events = new FakeEventPublisher();
  const folders = new FakeCaseFolderState();
  const announcer = new CaseFolderAnnouncer(folders, new FakePeopleLookup([LAWYER], [CLIENT]), events);
  const useCase = new AnnounceReassignedCaseFolders(cases, new FakeClock(NOW, TODAY), announcer);
  return { useCase, cases, events, folders };
}

describe('AnnounceReassignedCaseFolders', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('anuncia a cada causa con carpeta adónde mover la suya; la huérfana va sin abogado', async () => {
    const { useCase, cases, events, folders } = build();
    const withLawyer = aCase({ id: 1 });
    const orphan = anOrphanedCase({ id: 2 });
    cases.add(withLawyer);
    cases.add(orphan);
    folders.set(withLawyer.id, 'CREATED');
    folders.set(orphan.id, 'CREATED');

    await useCase.execute([withLawyer.id, orphan.id]);

    expect(events.published).toEqual([
      expect.objectContaining({ type: CASE_MODIFIED, caseId: withLawyer.id, lawyer: expect.objectContaining({ id: LAWYER.id }), changed: ['responsibleLawyer'] }),
      expect.objectContaining({ type: CASE_MODIFIED, caseId: orphan.id, lawyer: null, changed: ['responsibleLawyer'] }),
    ]);
  });

  it('una causa sin carpeta no anuncia nada, y una causa que no se encuentra no corta a las demás', async () => {
    const { useCase, cases, events, folders } = build();
    const withFolder = aCase();
    cases.add(withFolder);
    folders.set(withFolder.id, 'CREATED');

    await expect(useCase.execute([999, withFolder.id])).resolves.toBeUndefined();

    expect(events.published).toHaveLength(1);
  });

  it('no lanza aunque leer una causa falle: lo registra y sigue', async () => {
    const { useCase, cases } = build();
    cases.findById = async () => {
      throw new Error('base caída');
    };

    await expect(useCase.execute([1, 2])).resolves.toBeUndefined();
  });
});
