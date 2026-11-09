import { DayType } from '../../domain/entities/day-types';
import {
  ProceduralStateAlreadyExistsError,
  ProceduralStateDayTypeError,
  ProceduralStateJurisdictionNotFoundError,
} from '../../domain/errors/procedural-state.errors';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { RegisterProceduralState, RegisterProceduralStateCommand } from './register-procedural-state.use-case';
import { aProceduralState, FAKE_JURISDICTIONS, FakeProceduralStateRepository } from './test-support/procedural-state-fakes';

/*
 * Coordinación del alta: lee el fuero y la unicidad, construye el estado y lo guarda.
 * Las reglas del estado (coherencia plazo/tipo de día, nombre reservado, recorte) están
 * en `procedural-states.spec.ts`; acá queda un test por regla que prueba que está
 * conectada. Lo que depende de la base (índice parcial por fuero, concurrencia) está en
 * `test/subsystems/legal-parameters/procedural-states.int.spec.ts`.
 */
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
    it('creates the state active and in its jurisdiction, trimmed, and persists it', async () => {
      const result = await useCase.execute(aCommand({ name: '  Oposición al requerimiento de elevación  ' }));

      expect(result.name).toBe('Oposición al requerimiento de elevación');
      expect(result.jurisdiction).toBe(FAKE_JURISDICTIONS[JurisdictionCode.CRIMINAL]);
      expect(result.timeLimitDays).toBe(5);
      expect(result.dayType).toBe(DayType.BUSINESS);
      expect(result.terminal).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.isInitial).toBe(false);
      expect(repository.created).toEqual([result]);
    });

    it('uses the id reserved by the repository', async () => {
      repository.seed(aProceduralState({ id: 41 }));

      const result = await useCase.execute(aCommand({ name: 'Archivada', timeLimitDays: 0, dayType: DayType.NONE }));

      expect(result.id).toBe(42);
    });
  });

  describe('CA-45.2 · name unique per jurisdiction', () => {
    it('rejects a name already registered in the jurisdiction, ignoring case and spaces, and writes nothing', async () => {
      repository.seed(aProceduralState({ id: 1, name: 'Archivada' }));

      await expect(useCase.execute(aCommand({ name: '  ARCHIVADA ' }))).rejects.toBeInstanceOf(
        ProceduralStateAlreadyExistsError,
      );
      expect(repository.created).toEqual([]);
    });

    it('looks the name up within the jurisdiction of the request', async () => {
      repository.seed(aProceduralState({ id: 1, name: 'Archivada' }));

      const result = await useCase.execute(
        aCommand({ name: 'Archivada', jurisdiction: JurisdictionCode.AMPARO, timeLimitDays: 0, dayType: DayType.NONE }),
      );

      expect(result.jurisdiction.code).toBe(JurisdictionCode.AMPARO);
    });

    it('does not reserve an id when the name is taken', async () => {
      repository.seed(aProceduralState({ id: 1, name: 'Archivada' }));
      const nextId = jest.spyOn(repository, 'nextId');

      await expect(useCase.execute(aCommand({ name: 'Archivada' }))).rejects.toThrow();

      expect(nextId).not.toHaveBeenCalled();
    });
  });

  // CA-45.3 y CA-45.4: las variantes están en `procedural-states.spec.ts`.
  it('rejects an incoherent time limit and day type, and writes nothing', async () => {
    await expect(useCase.execute(aCommand({ timeLimitDays: 0, dayType: DayType.BUSINESS }))).rejects.toBeInstanceOf(
      ProceduralStateDayTypeError,
    );
    expect(repository.created).toEqual([]);
  });

  it('rejects the reserved name "Iniciada", even with no system state seeded, and writes nothing', async () => {
    await expect(useCase.execute(aCommand({ name: 'iniciada' }))).rejects.toBeInstanceOf(ProceduralStateAlreadyExistsError);
    expect(repository.created).toEqual([]);
  });

  it('rejects the registration when the jurisdiction is not in the catalogue, and writes nothing', async () => {
    jest.spyOn(repository, 'findJurisdictionByCode').mockResolvedValue(null);

    await expect(useCase.execute(aCommand())).rejects.toBeInstanceOf(ProceduralStateJurisdictionNotFoundError);
    expect(repository.created).toEqual([]);
  });

  // CA-45.6 (profile not allowed) is enforced by the HTTP guard, not by the
  // use case: covered by the integration tests.
});
