import { ProceduralStateNotFoundError } from '../../domain/errors/procedural-state.errors';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { DeactivateProceduralState } from './deactivate-procedural-state.use-case';
import { aProceduralState, anInitialState, FakeProceduralStateRepository } from './test-support/procedural-state-fakes';

describe('DeactivateProceduralState', () => {
  let repository: FakeProceduralStateRepository;
  let useCase: DeactivateProceduralState;

  beforeEach(() => {
    repository = new FakeProceduralStateRepository();
    useCase = new DeactivateProceduralState(repository);
  });

  describe('CA-46.1 / CA-46.2 · logical deletion', () => {
    it('marks the state inactive and persists it, keeping the record', async () => {
      const procState = aProceduralState({ id: 7 });
      repository.seed(procState);

      await useCase.execute({ id: 7 });

      expect(procState.isActive).toBe(false);
      expect(repository.saved).toEqual([procState]);
    });

    it('keeps the rest of the state as it was', async () => {
      const procState = aProceduralState({ id: 7, name: 'Archivada' });
      repository.seed(procState);

      await useCase.execute({ id: 7 });

      expect(procState.name).toBe('Archivada');
      expect(procState.timeLimitDays).toBe(5);
    });

    it('removes it from the jurisdiction listing', async () => {
      repository.seed(aProceduralState({ id: 7 }), aProceduralState({ id: 8, name: 'Archivada' }));

      await useCase.execute({ id: 7 });

      const page = await repository.findPaginated({ jurisdiction: JurisdictionCode.CRIMINAL }, 1, 100);
      expect(page.items.map((s) => s.id)).toEqual([8]);
    });

    it('makes it impossible to look it up by id', async () => {
      repository.seed(aProceduralState({ id: 7 }));

      await useCase.execute({ id: 7 });

      await expect(repository.findById(7)).resolves.toBeNull();
    });
  });

  describe('not found', () => {
    it('throws ProceduralStateNotFoundError when no state has that id', async () => {
      await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
      expect(repository.saved).toEqual([]);
    });

    it('throws ProceduralStateNotFoundError the second time, without saving again', async () => {
      repository.seed(aProceduralState({ id: 7 }));
      await useCase.execute({ id: 7 });

      await expect(useCase.execute({ id: 7 })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
      expect(repository.saved).toHaveLength(1);
    });

    it('throws ProceduralStateNotFoundError for the system state "Iniciada", leaving it active', async () => {
      const initial = anInitialState(1);
      repository.seed(initial);

      await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
      expect(initial.isActive).toBe(true);
    });
  });

  // CA-46.3 / CA-46.4 (cases keep the state; the deletion goes through
  // with cases in it) depend on `cases`, and CA-46.5 (profile) on the HTTP
  // guard: covered by the integration tests.
});
