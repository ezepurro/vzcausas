import { LegalQualification } from '../../domain/entities/legal-qualification';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';
import { ViewLegalQualifications } from './view-legal-qualifications.use-case';
import { FakeActiveCasesCounter } from './test-support/procedural-state-fakes';

function aQualification(id = 1, name = 'Hurto simple — art. 162 CP'): LegalQualification {
  return LegalQualification.hydrate({
    id,
    name,
    prescriptionMonths: 24,
    isActive: true,
    createdAt: new Date('2026-10-08T00:00:00Z'),
  });
}

function aPage(items: LegalQualification[]): PaginatedResult<LegalQualification> {
  return { items, total: items.length, page: 1, limit: 20, totalPages: items.length ? 1 : 0 };
}

describe('ViewLegalQualifications', () => {
  let repository: jest.Mocked<LegalQualificationRepository>;
  let counter: FakeActiveCasesCounter;
  let useCase: ViewLegalQualifications;

  beforeEach(() => {
    repository = {
      nextId: jest.fn(),
      save: jest.fn(),
      existsActiveByName: jest.fn(),
      findActiveById: jest.fn(),
      findPaginated: jest.fn().mockResolvedValue(aPage([])),
    };
    counter = new FakeActiveCasesCounter();
    useCase = new ViewLegalQualifications(repository, counter);
  });

  describe('activeCases (CA-47.8)', () => {
    it('pide los conteos de la página entera en una sola llamada', async () => {
      repository.findPaginated.mockResolvedValue(aPage([aQualification(1), aQualification(2)]));
      counter.counts.set(1, 4);

      const result = await useCase.getAll({ page: 1, limit: 20 });

      expect(result.items.map((item) => [item.qualification.id, item.activeCases])).toEqual([
        [1, 4],
        [2, 0],
      ]);
      // Una llamada con los dos ids, no una por calificación: es el N+1.
      expect(counter.calls).toEqual([[1, 2]]);
    });

    it('no llama a `cases` cuando la página está vacía', async () => {
      await useCase.getAll({ page: 1, limit: 20 });

      expect(counter.calls).toEqual([]);
    });
  });

  it('forwards page and limit to the repository unchanged', async () => {
    await useCase.getAll({ page: 3, limit: 15 });

    expect(repository.findPaginated).toHaveBeenCalledWith(expect.any(Object), 3, 15);
  });

  // CA-47.4
  it('forwards the search term, trimmed', async () => {
    await useCase.getAll({ page: 1, limit: 20, search: '  art. 162  ' });

    expect(repository.findPaginated).toHaveBeenCalledWith({ search: 'art. 162' }, 1, 20);
  });

  it.each(['', '   '])('treats a blank search (%p) as no filter', async (search) => {
    await useCase.getAll({ page: 1, limit: 20, search });

    expect(repository.findPaginated).toHaveBeenCalledWith({ search: undefined }, 1, 20);
  });

  // CA-47.6
  it('returns an empty page without treating it as an error', async () => {
    repository.findPaginated.mockResolvedValue(aPage([]));

    const result = await useCase.getAll({ page: 1, limit: 20, search: 'no existe' });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  /**
   * Hasta el 10/10/2026 este test afirmaba `toBe(page)`: el caso de uso
   * devolvía el objeto del repositorio sin tocarlo. Ya no puede, porque le
   * adosa el `activeCases` a cada ítem (CA-47.8). Lo que sigue siendo cierto
   * —y lo que importa— es que la metadata de paginación pasa sin tocarse y que
   * las entidades viajan por referencia, no copiadas.
   */
  it('deja intacta la paginación del repositorio y no copia las entidades', async () => {
    const first = aQualification(1);
    const page = aPage([first, aQualification(2, 'Abuso de armas — art. 104 CP')]);
    repository.findPaginated.mockResolvedValue(page);

    const result = await useCase.getAll({ page: 1, limit: 20 });

    expect(result.items[0].qualification).toBe(first);
    expect({
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    }).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
  });

  /**
   * El orden alfabético (CA-47.3) y el filtrado de las dadas de baja
   * (CA-47.9) son del repositorio, no de este caso de uso: acá solo se
   * verifica que no los deshaga. Que la base realmente ordene y
   * excluya lo prueba el spec de integración.
   */
  it('no reordena lo que el repositorio devuelve', async () => {
    const page = aPage([aQualification(1, 'Abuso'), aQualification(2, 'Hurto')]);
    repository.findPaginated.mockResolvedValue(page);

    const result = await useCase.getAll({ page: 1, limit: 20 });

    expect(result.items.map((item) => item.qualification.name)).toEqual(['Abuso', 'Hurto']);
  });

  it('propagates repository failures', async () => {
    repository.findPaginated.mockRejectedValue(new Error('database down'));

    await expect(useCase.getAll({ page: 1, limit: 20 })).rejects.toThrow('database down');
  });
});
