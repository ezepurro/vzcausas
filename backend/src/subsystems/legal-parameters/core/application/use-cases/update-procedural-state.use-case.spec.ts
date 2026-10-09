import { DayType } from '../../domain/entities/day-types';
import {
  ProceduralStateAlreadyExistsError,
  ProceduralStateDayTypeError,
  ProceduralStateEmptyPatchError,
  ProceduralStateNotFoundError,
} from '../../domain/errors/procedural-state.errors';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import {
  aProceduralState,
  anInitialState,
  FAKE_JURISDICTIONS,
  FakeProceduralStateRepository,
} from './test-support/procedural-state-fakes';
import { UpdateProceduralState } from './update-procedural-state.use-case';

describe('UpdateProceduralState', () => {
  let repository: FakeProceduralStateRepository;
  let useCase: UpdateProceduralState;

  beforeEach(() => {
    repository = new FakeProceduralStateRepository();
    useCase = new UpdateProceduralState(repository);
    // The state every test edits: 5 business days, not terminal, CRIMINAL.
    repository.seed(aProceduralState({ id: 1, name: 'Citación a juicio' }));
  });

  describe('CA-17.1 · successful update', () => {
    it('renames the state and persists it', async () => {
      const result = await useCase.execute({ id: 1, name: 'Citación a juicio oral' });

      expect(result.name).toBe('Citación a juicio oral');
      expect(repository.saved).toEqual([result]);
    });

    it('changes the time limit and day type together', async () => {
      const result = await useCase.execute({ id: 1, timeLimitDays: 10, dayType: DayType.CONSECUTIVE });

      expect(result.timeLimitDays).toBe(10);
      expect(result.dayType).toBe(DayType.CONSECUTIVE);
      expect(repository.saved).toEqual([result]);
    });

    it('changes only the time limit, keeping the current day type', async () => {
      const result = await useCase.execute({ id: 1, timeLimitDays: 8 });

      expect(result.timeLimitDays).toBe(8);
      expect(result.dayType).toBe(DayType.BUSINESS);
    });

    it('changes only the day type, keeping the current time limit', async () => {
      const result = await useCase.execute({ id: 1, dayType: DayType.CONSECUTIVE });

      expect(result.timeLimitDays).toBe(5);
      expect(result.dayType).toBe(DayType.CONSECUTIVE);
    });

    it('changes the terminal flag', async () => {
      const result = await useCase.execute({ id: 1, terminal: true });

      expect(result.terminal).toBe(true);
      expect(repository.saved).toEqual([result]);
    });

    it('applies every field sent in the same request', async () => {
      const result = await useCase.execute({
        id: 1,
        name: 'Archivada',
        timeLimitDays: 0,
        dayType: DayType.NONE,
        terminal: true,
      });

      expect(result.name).toBe('Archivada');
      expect(result.timeLimitDays).toBe(0);
      expect(result.dayType).toBe(DayType.NONE);
      expect(result.terminal).toBe(true);
    });

    it('leaves the jurisdiction untouched (D-36: not modifiable)', async () => {
      const result = await useCase.execute({ id: 1, name: 'Archivada' });

      expect(result.jurisdiction).toBe(FAKE_JURISDICTIONS[JurisdictionCode.CRIMINAL]);
    });
  });

  describe('CA-17.5 · name unique per jurisdiction', () => {
    it('rejects a name another active state of the jurisdiction has', async () => {
      repository.seed(aProceduralState({ id: 2, name: 'Archivada' }));

      await expect(useCase.execute({ id: 1, name: 'archivada' })).rejects.toBeInstanceOf(
        ProceduralStateAlreadyExistsError,
      );
      expect(repository.saved).toEqual([]);
    });

    it('lets a state be renamed to itself with different case', async () => {
      const result = await useCase.execute({ id: 1, name: 'CITACIÓN A JUICIO' });

      expect(result.name).toBe('CITACIÓN A JUICIO');
      expect(repository.saved).toEqual([result]);
    });

    it('accepts a name used in another jurisdiction', async () => {
      repository.seed(aProceduralState({ id: 2, name: 'Archivada', jurisdiction: FAKE_JURISDICTIONS.AMPARO }));

      const result = await useCase.execute({ id: 1, name: 'Archivada' });

      expect(result.name).toBe('Archivada');
    });

    it('accepts a name whose previous holder was deactivated', async () => {
      repository.seed(aProceduralState({ id: 2, name: 'Archivada', isActive: false }));

      const result = await useCase.execute({ id: 1, name: 'Archivada' });

      expect(result.name).toBe('Archivada');
    });

    it.each(['Iniciada', ' INICIADA '])('rejects the reserved name %p', async (name) => {
      repository.seed(anInitialState(2));

      await expect(useCase.execute({ id: 1, name })).rejects.toBeInstanceOf(ProceduralStateAlreadyExistsError);
      expect(repository.saved).toEqual([]);
    });
  });

  describe('CA-17.6 · time limit and day type must be coherent', () => {
    it('rejects 0 days sent alone while the current day type is BUSINESS', async () => {
      await expect(useCase.execute({ id: 1, timeLimitDays: 0 })).rejects.toBeInstanceOf(ProceduralStateDayTypeError);
      expect(repository.saved).toEqual([]);
    });

    it('rejects NONE sent alone while the current time limit is above 0', async () => {
      await expect(useCase.execute({ id: 1, dayType: DayType.NONE })).rejects.toBeInstanceOf(
        ProceduralStateDayTypeError,
      );
      expect(repository.saved).toEqual([]);
    });

    it('rejects a time limit above 0 sent alone on a state without time limit', async () => {
      repository.seed(aProceduralState({ id: 2, name: 'Archivada', timeLimitDays: 0, dayType: DayType.NONE }));

      await expect(useCase.execute({ id: 2, timeLimitDays: 3 })).rejects.toBeInstanceOf(ProceduralStateDayTypeError);
    });

    it('does not persist a valid rename when the time limit in the same request is incoherent', async () => {
      await expect(useCase.execute({ id: 1, name: 'Archivada', timeLimitDays: 0 })).rejects.toBeInstanceOf(
        ProceduralStateDayTypeError,
      );
      expect(repository.saved).toEqual([]);
    });
  });

  describe('request and target validation', () => {
    it('throws ProceduralStateEmptyPatchError when no field is sent', async () => {
      await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(ProceduralStateEmptyPatchError);
      expect(repository.saved).toEqual([]);
    });

    it('rejects an empty request before looking the state up', async () => {
      const findById = jest.spyOn(repository, 'findById');

      await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(ProceduralStateEmptyPatchError);
      expect(findById).not.toHaveBeenCalled();
    });

    it('throws ProceduralStateNotFoundError when no state has that id', async () => {
      await expect(useCase.execute({ id: 999, terminal: true })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
    });

    it('throws ProceduralStateNotFoundError for a deactivated state', async () => {
      repository.seed(aProceduralState({ id: 2, name: 'Archivada', isActive: false }));

      await expect(useCase.execute({ id: 2, terminal: true })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
    });

    it('throws ProceduralStateNotFoundError for the system state "Iniciada"', async () => {
      repository.seed(anInitialState(2));

      await expect(useCase.execute({ id: 2, terminal: true })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
    });
  });

  // CA-17.2 (rename propagates to cases) and CA-17.3 (deadlines are not
  // recomputed) depend on how cases reference the state, and CA-17.7
  // (profile) on the HTTP guard: covered by the integration tests.
});
