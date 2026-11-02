import { DayType } from '../../domain/entities/day-types';
import {
  ProceduralStateAlreadyExistsError,
  ProceduralStateDayTypeError,
  ProceduralStateEmptyPatchError,
  ProceduralStateNotFoundError,
} from '../../domain/errors/procedural-state.errors';
import { aProceduralState, anInitialState, FakeProceduralStateRepository } from './test-support/procedural-state-fakes';
import { UpdateProceduralState } from './update-procedural-state.use-case';

/*
 * Coordinación de la modificación: completa lo que no se envió con los valores actuales,
 * excluye al propio estado de la unicidad y no guarda nada si algo falla. Las reglas del
 * estado (nombre reservado, coherencia del par) están en `procedural-states.spec.ts`.
 */
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
    it('applies every field sent in the same request and persists it', async () => {
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
      expect(repository.saved).toEqual([result]);
    });

    it('changes only the day type, keeping the current time limit', async () => {
      const result = await useCase.execute({ id: 1, dayType: DayType.CONSECUTIVE });

      expect(result.timeLimitDays).toBe(5);
      expect(result.dayType).toBe(DayType.CONSECUTIVE);
    });
  });

  describe('CA-17.5 · name unique per jurisdiction', () => {
    it('rejects a name another active state of the jurisdiction has, and saves nothing', async () => {
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
  });

  describe('CA-17.6 · time limit and day type must be coherent', () => {
    it('rejects 0 days sent alone while the current day type is BUSINESS', async () => {
      await expect(useCase.execute({ id: 1, timeLimitDays: 0 })).rejects.toBeInstanceOf(ProceduralStateDayTypeError);
      expect(repository.saved).toEqual([]);
    });

    it('does not persist a valid rename when the time limit in the same request is incoherent', async () => {
      await expect(useCase.execute({ id: 1, name: 'Archivada', timeLimitDays: 0 })).rejects.toBeInstanceOf(
        ProceduralStateDayTypeError,
      );
      expect(repository.saved).toEqual([]);
    });
  });

  describe('request and target validation', () => {
    it('rejects an empty request before looking the state up', async () => {
      const findById = jest.spyOn(repository, 'findById');

      await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(ProceduralStateEmptyPatchError);
      expect(findById).not.toHaveBeenCalled();
      expect(repository.saved).toEqual([]);
    });

    it('throws ProceduralStateNotFoundError for a missing, a deactivated and the system state "Iniciada"', async () => {
      repository.seed(aProceduralState({ id: 2, name: 'Archivada', isActive: false }));
      repository.seed(anInitialState(3));

      for (const id of [999, 2, 3]) {
        await expect(useCase.execute({ id, terminal: true })).rejects.toBeInstanceOf(ProceduralStateNotFoundError);
      }
      expect(repository.saved).toEqual([]);
    });
  });

  // CA-17.2 (rename propagates to cases) and CA-17.3 (deadlines are not
  // recomputed) depend on how cases reference the state, and CA-17.7
  // (profile) on the HTTP guard: covered by the integration tests.
});
