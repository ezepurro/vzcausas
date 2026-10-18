import { LegalQualification } from '../../domain/entities/legal-qualification';
import { LegalQualificationNotFoundError } from '../../domain/errors/legal-parameters.errors';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';
import { FindLegalQualification } from './find-legal-qualification.use-case';
import { FakeActiveCasesCounter } from './test-support/procedural-state-fakes';

function aQualification(): LegalQualification {
  return LegalQualification.hydrate({
    id: 7,
    name: 'Robo calificado — art. 167 inc. 2 CP',
    prescriptionMonths: 96,
    isActive: true,
    createdAt: null,
  });
}

describe('FindLegalQualification', () => {
  let repository: jest.Mocked<LegalQualificationRepository>;
  let counter: FakeActiveCasesCounter;
  let useCase: FindLegalQualification;

  beforeEach(() => {
    repository = {
      nextId: jest.fn(),
      save: jest.fn(),
      existsActiveByName: jest.fn(),
      findPaginated: jest.fn(),
      findActiveById: jest.fn().mockResolvedValue(null),
    };
    counter = new FakeActiveCasesCounter();
    useCase = new FindLegalQualification(repository, counter);
  });

  // CA-47.8
  it('devuelve las causas activas de la calificación, pedidas en una sola llamada', async () => {
    repository.findActiveById.mockResolvedValue(aQualification());
    counter.counts.set(7, 5);

    const result = await useCase.execute({ id: 7 });

    expect(result.activeCases).toBe(5);
    expect(counter.calls).toEqual([[7]]);
  });

  it('devuelve 0 cuando la calificación no tiene causas activas', async () => {
    repository.findActiveById.mockResolvedValue(aQualification());

    expect((await useCase.execute({ id: 7 })).activeCases).toBe(0);
  });

  // CA-47.7
  it('devuelve la calificación con sus datos completos', async () => {
    const qualification = aQualification();
    repository.findActiveById.mockResolvedValue(qualification);

    const result = await useCase.execute({ id: 7 });

    expect(result.qualification).toBe(qualification);
    expect(repository.findActiveById).toHaveBeenCalledWith(7);
  });

  // CA-47.9
  it('lanza 404 cuando no hay una calificación vigente con ese id', async () => {
    repository.findActiveById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 9999 })).rejects.toThrow(LegalQualificationNotFoundError);
  });

  /**
   * El criterio pide que una calificación dada de baja "no aparezca ni
   * pueda consultarse". El filtrado está en `findActiveById`, así que
   * acá se verifica que el caso de uso pida **esa** consulta y no una
   * que traiga cualquier fila: un `findById` genérico devolvería la
   * dada de baja y el 404 se perdería.
   */
  it('consulta solo entre las vigentes', async () => {
    await expect(useCase.execute({ id: 7 })).rejects.toThrow(LegalQualificationNotFoundError);

    expect(repository.findActiveById).toHaveBeenCalledWith(7);
  });

  it('no devuelve detalles en el error, como fija el contrato', async () => {
    try {
      await useCase.execute({ id: 1 });
      fail('debía lanzar');
    } catch (error) {
      expect((error as LegalQualificationNotFoundError).details).toBeNull();
      expect((error as LegalQualificationNotFoundError).code).toBe(
        'LEGAL_QUALIFICATION_NOT_FOUND',
      );
    }
  });
});
