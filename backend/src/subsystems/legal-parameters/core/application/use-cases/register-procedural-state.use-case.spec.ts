import { DayType } from '../../domain/entities/day-types';
import {
  ProceduralStateAlreadyExistsError,
  ProceduralStateDayTypeError,
  ProceduralStateJurisdictionNotFoundError,
} from '../../domain/errors/procedural-state.errors';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { RegisterProceduralState, RegisterProceduralStateCommand } from './register-procedural-state.use-case';
import {
  aProceduralState,
  anInitialState,
  FAKE_JURISDICTIONS,
  FakeProceduralStateRepository,
} from './test-support/procedural-state-fakes';

describe('RegisterProceduralState', () => {
  let repository: FakeProceduralStateRepository;
  let useCase: RegisterProceduralState;

  beforeEach(() => {
    repository = new FakeProceduralStateRepository();
    useCase = new RegisterProceduralState(repository);
  });

  function aCommand(overrides: Partial<RegisterProceduralStateCommand> = {}): RegisterProceduralStateCommand {
    return {
      name: 'Oposición al requerimiento de elevación',
      jurisdiction: JurisdictionCode.CRIMINAL,
      timeLimitDays: 5,
      dayType: DayType.BUSINESS,
      terminal: false,
      ...overrides,
    };
  }

  describe('CA-45.1 · successful registration', () => {
    it('creates the state with the given data, active and in its jurisdiction', async () => {
      const result = await useCase.execute(aCommand());

      expect(result.name).toBe('Oposición al requerimiento de elevación');
      expect(result.jurisdiction).toBe(FAKE_JURISDICTIONS[JurisdictionCode.CRIMINAL]);
      expect(result.timeLimitDays).toBe(5);
      expect(result.dayType).toBe(DayType.BUSINESS);
      expect(result.terminal).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.isInitial).toBe(false);
    });

    it('persists it and makes it available in its jurisdiction', async () => {
      const result = await useCase.execute(aCommand());

      expect(repository.created).toEqual([result]);
      expect(await repository.findById(result.id)).toBe(result);
      const page = await repository.findPaginated({ jurisdiction: JurisdictionCode.CRIMINAL }, 1, 100);
      expect(page.items).toEqual([result]);
    });

    it('uses the id reserved by the repository', async () => {
      repository.seed(aProceduralState({ id: 41 }));

      const result = await useCase.execute(aCommand({ name: 'Archivada', timeLimitDays: 0, dayType: DayType.NONE }));

      expect(result.id).toBe(42);
    });

    it('trims the name before saving it', async () => {
      const result = await useCase.execute(aCommand({ name: '  Archivada  ', timeLimitDays: 0, dayType: DayType.NONE }));

      expect(result.name).toBe('Archivada');
    });
  });

  describe('CA-45.2 · name unique per jurisdiction', () => {
    it('rejects a name already registered in the same jurisdiction', async () => {
      repository.seed(aProceduralState({ id: 1, name: 'Archivada' }));

      await expect(useCase.execute(aCommand({ name: 'Archivada' }))).rejects.toBeInstanceOf(
        ProceduralStateAlreadyExistsError,
      );
      expect(repository.created).toEqual([]);
    });

    it('compares names case-insensitively and ignoring surrounding spaces', async () => {
      repository.seed(aProceduralState({ id: 1, name: 'Archivada' }));

      await expect(useCase.execute(aCommand({ name: '  ARCHIVADA ' }))).rejects.toBeInstanceOf(
        ProceduralStateAlreadyExistsError,
      );
    });

    it('accepts the same name in another jurisdiction', async () => {
      repository.seed(aProceduralState({ id: 1, name: 'Archivada' }));

      const result = await useCase.execute(
        aCommand({ name: 'Archivada', jurisdiction: JurisdictionCode.AMPARO, timeLimitDays: 0, dayType: DayType.NONE }),
      );

      expect(result.jurisdiction.code).toBe(JurisdictionCode.AMPARO);
    });

    it('accepts a name whose previous holder was deactivated', async () => {
      repository.seed(aProceduralState({ id: 1, name: 'Archivada', isActive: false }));

      const result = await useCase.execute(aCommand({ name: 'Archivada' }));

      expect(result.id).not.toBe(1);
      expect(repository.created).toEqual([result]);
    });

    it('does not reserve an id when the name is taken', async () => {
      repository.seed(aProceduralState({ id: 1, name: 'Archivada' }));
      const nextId = jest.spyOn(repository, 'nextId');

      await expect(useCase.execute(aCommand({ name: 'Archivada' }))).rejects.toThrow();

      expect(nextId).not.toHaveBeenCalled();
    });
  });

  describe('CA-45.3 · time limit and day type must be coherent', () => {
    it.each([DayType.BUSINESS, DayType.CONSECUTIVE])('rejects 0 days with %s', async (dayType) => {
      await expect(useCase.execute(aCommand({ timeLimitDays: 0, dayType }))).rejects.toBeInstanceOf(
        ProceduralStateDayTypeError,
      );
      expect(repository.created).toEqual([]);
    });

    it('rejects more than 0 days with NONE', async () => {
      await expect(useCase.execute(aCommand({ timeLimitDays: 5, dayType: DayType.NONE }))).rejects.toBeInstanceOf(
        ProceduralStateDayTypeError,
      );
      expect(repository.created).toEqual([]);
    });

    it.each([DayType.BUSINESS, DayType.CONSECUTIVE])('accepts more than 0 days with %s', async (dayType) => {
      const result = await useCase.execute(aCommand({ timeLimitDays: 10, dayType }));

      expect(result.dayType).toBe(dayType);
    });
  });

  describe('CA-45.4 · reserved name', () => {
    it.each(['Iniciada', 'INICIADA', '  iniciada  '])('rejects %p even with no "Iniciada" seeded', async (name) => {
      await expect(useCase.execute(aCommand({ name }))).rejects.toBeInstanceOf(ProceduralStateAlreadyExistsError);
      expect(repository.created).toEqual([]);
    });

    it.each(Object.values(JurisdictionCode))('rejects "Iniciada" in %s, where the system state exists', async (code) => {
      repository.seed(anInitialState(1, code));

      await expect(
        useCase.execute(aCommand({ name: 'Iniciada', jurisdiction: code, timeLimitDays: 0, dayType: DayType.NONE })),
      ).rejects.toBeInstanceOf(ProceduralStateAlreadyExistsError);
    });
  });

  describe('CA-45.5 · state without time limit', () => {
    it('registers a state with 0 days and NONE', async () => {
      const result = await useCase.execute(aCommand({ name: 'Archivada', timeLimitDays: 0, dayType: DayType.NONE }));

      expect(result.timeLimitDays).toBe(0);
      expect(result.dayType).toBe(DayType.NONE);
      expect(repository.created).toEqual([result]);
    });
  });

  describe('jurisdiction missing from the catalogue', () => {
    it('rejects the registration when the jurisdiction is not active', async () => {
      jest.spyOn(repository, 'findJurisdictionByCode').mockResolvedValue(null);

      await expect(useCase.execute(aCommand())).rejects.toBeInstanceOf(ProceduralStateJurisdictionNotFoundError);
      expect(repository.created).toEqual([]);
    });
  });

  // CA-45.6 (profile not allowed) is enforced by the HTTP guard, not by the
  // use case: covered by the integration tests.
});
