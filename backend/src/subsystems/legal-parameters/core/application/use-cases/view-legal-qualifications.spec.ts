import { LegalQualification } from '../../domain/entities/legal-qualification';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';
import { ViewLegalQualifications } from './view-legal-qualifications.use-case';

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
  let useCase: ViewLegalQualifications;

  beforeEach(() => {
    repository = {
      nextId: jest.fn(),
      save: jest.fn(),
      existsActiveByName: jest.fn(),
      findActiveById: jest.fn(),
      findPaginated: jest.fn().mockResolvedValue(aPage([])),
    };
    useCase = new ViewLegalQualifications(repository);
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

  it('returns the repository page as it comes', async () => {
    const page = aPage([aQualification(1), aQualification(2, 'Abuso de armas — art. 104 CP')]);
    repository.findPaginated.mockResolvedValue(page);

    expect(await useCase.getAll({ page: 1, limit: 20 })).toBe(page);
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

    expect(result.items.map((q) => q.name)).toEqual(['Abuso', 'Hurto']);
  });

  it('propagates repository failures', async () => {
    repository.findPaginated.mockRejectedValue(new Error('database down'));

    await expect(useCase.getAll({ page: 1, limit: 20 })).rejects.toThrow('database down');
  });
});
