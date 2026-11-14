import { LegalQualificationNotFoundError } from '../../domain/errors/legal-parameters.errors';
import { DeactivateLegalQualification } from './deactivate-legal-qualification.use-case';
import { aLegalQualification, FakeLegalQualificationRepository } from './test-support/legal-qualification-fakes';

/*
 * HU50 — coordinación de la baja. Que las causas la conserven (CA-50.3) y que
 * deje de ofrecerse (CA-50.2) dependen de `cases` y de la base: están en el spec
 * de integración. Plan: `.claude/plans/tests-hu49-hu50-calificaciones.md`.
 */
describe('DeactivateLegalQualification', () => {
  let repository: FakeLegalQualificationRepository;
  let useCase: DeactivateLegalQualification;

  beforeEach(() => {
    repository = new FakeLegalQualificationRepository();
    useCase = new DeactivateLegalQualification(repository);
  });

  describe('CA-50.1 · baja lógica', () => {
    it('guarda la calificación no vigente, conservando la denominación y el plazo', async () => {
      repository.seed(aLegalQualification({ id: 7, name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 }));

      await useCase.execute({ id: 7 });

      expect(repository.updated).toEqual([
        expect.objectContaining({ id: 7, name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, isActive: false }),
      ]);
    });

    it('deja de existir para el sistema: no se encuentra ni se lista', async () => {
      repository.seed(aLegalQualification({ id: 7 }), aLegalQualification({ id: 8, name: 'Hurto simple — art. 162 CP' }));

      await useCase.execute({ id: 7 });

      await expect(repository.findActiveById(7)).resolves.toBeNull();
      const page = await repository.findPaginated({}, 1, 100);
      expect(page.items.map((q) => q.id)).toEqual([8]);
    });
  });

  describe('CA-50.4 · inexistente o ya dada de baja', () => {
    it('responde no encontrada si no existe, sin escribir', async () => {
      await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(LegalQualificationNotFoundError);
      expect(repository.updated).toEqual([]);
    });

    it('la segunda baja responde no encontrada, sin escribir otra vez', async () => {
      repository.seed(aLegalQualification({ id: 7 }));
      await useCase.execute({ id: 7 });

      await expect(useCase.execute({ id: 7 })).rejects.toBeInstanceOf(LegalQualificationNotFoundError);
      expect(repository.updated).toHaveLength(1);
    });

    it('responde no encontrada si otro pedido la dio de baja entre la lectura y la escritura', async () => {
      repository.seed(aLegalQualification({ id: 7 }));
      jest.spyOn(repository, 'update').mockResolvedValueOnce(false);

      await expect(useCase.execute({ id: 7 })).rejects.toBeInstanceOf(LegalQualificationNotFoundError);
    });
  });
});
