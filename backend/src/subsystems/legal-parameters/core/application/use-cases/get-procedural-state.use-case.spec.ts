import { ProceduralStateNotFoundError } from '../../domain/errors/procedural-state.errors';
import { GetProceduralState } from './get-procedural-state.use-case';
import { aProceduralState, anInitialState, FakeProceduralStateRepository } from './test-support/procedural-state-fakes';

describe('GetProceduralState', () => {
  let repository: FakeProceduralStateRepository;
  let useCase: GetProceduralState;

  beforeEach(() => {
    repository = new FakeProceduralStateRepository();
    useCase = new GetProceduralState(repository);
  });

  it('returns the state with that id', async () => {
    const procState = aProceduralState({ id: 7 });
    repository.seed(procState);

    await expect(useCase.execute({ id: 7 })).resolves.toBe(procState);
  });

  it('throws ProceduralStateNotFoundError when no state has that id', async () => {
    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
  });

  it('throws ProceduralStateNotFoundError for a deactivated state (CA-46.2)', async () => {
    repository.seed(aProceduralState({ id: 7, isActive: false }));

    await expect(useCase.execute({ id: 7 })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
  });

  it('throws ProceduralStateNotFoundError for the system state "Iniciada"', async () => {
    repository.seed(anInitialState(1));

    await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
  });
});
