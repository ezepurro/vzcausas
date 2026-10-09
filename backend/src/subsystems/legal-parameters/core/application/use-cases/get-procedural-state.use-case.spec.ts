import { ProceduralStateNotFoundError } from '../../domain/errors/procedural-state.errors';
import { GetProceduralState } from './get-procedural-state.use-case';
import {
  aProceduralState,
  anInitialState,
  FakeActiveCasesCounter,
  FakeProceduralStateRepository,
} from './test-support/procedural-state-fakes';

describe('GetProceduralState', () => {
  let repository: FakeProceduralStateRepository;
  let counter: FakeActiveCasesCounter;
  let useCase: GetProceduralState;

  beforeEach(() => {
    repository = new FakeProceduralStateRepository();
    counter = new FakeActiveCasesCounter();
    useCase = new GetProceduralState(repository, counter);
  });

  it('returns the state with that id', async () => {
    const procState = aProceduralState({ id: 7 });
    repository.seed(procState);

    const result = await useCase.execute({ id: 7 });

    expect(result.procState).toBe(procState);
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
