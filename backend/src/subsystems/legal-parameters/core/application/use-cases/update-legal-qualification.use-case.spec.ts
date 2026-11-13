import { ValidationError } from '@shared/domain/domain-error';
import {
  LegalQualificationAlreadyExistsError,
  LegalQualificationEmptyPatchError,
  LegalQualificationNotFoundError,
} from '../../domain/errors/legal-parameters.errors';
import { aLegalQualification, FakeLegalQualificationRepository } from './test-support/legal-qualification-fakes';
import { UpdateLegalQualification } from './update-legal-qualification.use-case';

/*
 * HU49 — coordinación de la modificación: el campo omitido no cambia, la propia
 * calificación no choca consigo misma, el orden de los chequeos y que un pedido
 * rechazado no escriba nada. Las reglas de la denominación y del plazo están en
 * `legal-qualification.spec.ts`; el índice real, en el spec de integración.
 * Plan: `.claude/plans/tests-hu49-hu50-calificaciones.md`.
 */
describe('UpdateLegalQualification', () => {
  let repository: FakeLegalQualificationRepository;
  let useCase: UpdateLegalQualification;

  beforeEach(() => {
    repository = new FakeLegalQualificationRepository();
    useCase = new UpdateLegalQualification(repository);
    // La calificación que edita cada test: 96 meses, vigente.
    repository.seed(aLegalQualification({ id: 1, name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 }));
  });

  describe('CA-49.1 · modificación exitosa', () => {
    it('cambia la denominación y el plazo juntos, lo guarda una vez y lo devuelve', async () => {
      const { qualification } = await useCase.execute({
        id: 1,
        name: 'Robo calificado — art. 167 inc. 4 CP',
        prescriptionMonths: 120,
      });

      expect(qualification.id).toBe(1);
      expect(qualification.name).toBe('Robo calificado — art. 167 inc. 4 CP');
      expect(qualification.prescriptionMonths).toBe(120);
      expect(qualification.isActive).toBe(true);
      expect(repository.updated).toEqual([
        expect.objectContaining({ id: 1, name: 'Robo calificado — art. 167 inc. 4 CP', prescriptionMonths: 120, isActive: true }),
      ]);
    });

    it.each([
      ['solo la denominación: el plazo queda', { name: 'Robo calificado — art. 167 inc. 4 CP' }, 'Robo calificado — art. 167 inc. 4 CP', 96],
      ['solo el plazo: la denominación queda', { prescriptionMonths: 120 }, 'Robo calificado — art. 167 inc. 2 CP', 120],
    ])('con %s', async (_caso, fields, name, prescriptionMonths) => {
      await useCase.execute({ id: 1, ...fields });

      expect(repository.rowOf(1)).toMatchObject({ name, prescriptionMonths, isActive: true });
      expect(repository.updated).toHaveLength(1);
    });

    it('rechaza un pedido sin ningún campo antes de buscar la calificación, y no escribe', async () => {
      const findActiveById = jest.spyOn(repository, 'findActiveById');

      await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(LegalQualificationEmptyPatchError);
      expect(findActiveById).not.toHaveBeenCalled();
      expect(repository.updated).toEqual([]);
    });
  });

  describe('CA-49.2 · denominación única entre las vigentes', () => {
    it('rechaza la denominación de otra vigente, sin distinguir mayúsculas, y no escribe nada', async () => {
      repository.seed(aLegalQualification({ id: 2, name: 'Hurto simple — art. 162 CP' }));

      await expect(
        useCase.execute({ id: 1, name: 'HURTO SIMPLE — art. 162 cp', prescriptionMonths: 120 }),
      ).rejects.toBeInstanceOf(LegalQualificationAlreadyExistsError);
      expect(repository.updated).toEqual([]);
      expect(repository.rowOf(1)).toMatchObject({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });
    });

    it('compara la denominación recortada: con espacios alrededor también choca', async () => {
      repository.seed(aLegalQualification({ id: 2, name: 'Hurto simple — art. 162 CP' }));

      await expect(useCase.execute({ id: 1, name: '  Hurto simple — art. 162 CP  ' })).rejects.toBeInstanceOf(
        LegalQualificationAlreadyExistsError,
      );
    });

    it('la propia calificación no choca consigo misma: cambiar solo mayúsculas se guarda', async () => {
      const { qualification } = await useCase.execute({ id: 1, name: 'ROBO CALIFICADO — ART. 167 INC. 2 CP' });

      expect(qualification.name).toBe('ROBO CALIFICADO — ART. 167 INC. 2 CP');
      expect(repository.updated).toHaveLength(1);
    });

    it('acepta la denominación de una calificación dada de baja', async () => {
      repository.seed(aLegalQualification({ id: 2, name: 'Hurto simple — art. 162 CP', isActive: false }));

      const { qualification } = await useCase.execute({ id: 1, name: 'Hurto simple — art. 162 CP' });

      expect(qualification.name).toBe('Hurto simple — art. 162 CP');
    });
  });

  describe('CA-49.3 · reglas de la entidad, conectadas', () => {
    it('un plazo menor a 1 se rechaza y no escribe nada, aunque la denominación del mismo pedido sea válida', async () => {
      await expect(
        useCase.execute({ id: 1, name: 'Robo calificado — art. 167 inc. 4 CP', prescriptionMonths: 0 }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(repository.updated).toEqual([]);
    });

    it('una denominación en blanco se rechaza por vacía, no como repetida', async () => {
      const error = await useCase.execute({ id: 1, name: '   ' }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).not.toBeInstanceOf(LegalQualificationAlreadyExistsError);
      expect(repository.updated).toEqual([]);
    });
  });

  describe('CA-49.6 · inexistente o dada de baja', () => {
    it('responde no encontrada si no existe', async () => {
      await expect(useCase.execute({ id: 999, prescriptionMonths: 120 })).rejects.toBeInstanceOf(
        LegalQualificationNotFoundError,
      );
      expect(repository.updated).toEqual([]);
    });

    it('responde no encontrada si está dada de baja, y la deja como estaba', async () => {
      repository.seed(aLegalQualification({ id: 3, name: 'Abuso de armas — art. 104 CP', isActive: false }));

      await expect(useCase.execute({ id: 3, prescriptionMonths: 120 })).rejects.toBeInstanceOf(
        LegalQualificationNotFoundError,
      );
      expect(repository.rowOf(3)).toMatchObject({ prescriptionMonths: 96, isActive: false });
    });

    it('responde no encontrada si se dio de baja entre la lectura y la escritura', async () => {
      jest.spyOn(repository, 'update').mockResolvedValueOnce(false);

      await expect(useCase.execute({ id: 1, prescriptionMonths: 120 })).rejects.toBeInstanceOf(
        LegalQualificationNotFoundError,
      );
    });
  });
});
