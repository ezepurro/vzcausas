import { ValidationError } from '@shared/domain/domain-error';
import { LegalQualification } from '../../domain/entities/legal-qualification';
import { LegalQualificationAlreadyExistsError } from '../../domain/errors/legal-parameters.errors';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';
import { RegisterLegalQualification } from './register-legal-qualification.use-case';

/**
 * Repositorio en memoria que **imita el índice único parcial**
 * `legal_qualifications_name_active_key`: compara con `lower()` y solo
 * entre las vigentes. Es la única forma de probar CA-48.4 sin base: si
 * el doble comparara el texto crudo, el test pasaría con un caso de
 * uso que no cumple el criterio.
 *
 * Que el índice de verdad se comporte así lo verifica el spec de
 * integración, no este.
 */
class FakeQualificationRepository implements LegalQualificationRepository {
  readonly saved: LegalQualification[] = [];
  private sequence = 0;

  constructor(private readonly existing: { name: string; active: boolean }[] = []) {}

  nextId(): Promise<number> {
    this.sequence += 1;
    return Promise.resolve(this.sequence);
  }

  save(qualification: LegalQualification): Promise<void> {
    this.saved.push(qualification);
    this.existing.push({ name: qualification.name, active: qualification.isActive });
    return Promise.resolve();
  }

  existsActiveByName(name: string): Promise<boolean> {
    return Promise.resolve(
      this.existing.some((row) => row.active && row.name.toLowerCase() === name.toLowerCase()),
    );
  }

  findPaginated = jest.fn();
  findActiveById = jest.fn();
}

describe('RegisterLegalQualification', () => {
  // CA-48.1
  it('registra la calificación y la devuelve con su identificador', async () => {
    const repository = new FakeQualificationRepository();
    const useCase = new RegisterLegalQualification(repository);

    const { qualification } = await useCase.execute({
      name: 'Hurto simple — art. 162 CP',
      prescriptionMonths: 24,
    });

    expect(qualification.id).toBe(1);
    expect(qualification.name).toBe('Hurto simple — art. 162 CP');
    expect(qualification.prescriptionMonths).toBe(24);
    expect(qualification.isActive).toBe(true);
    expect(repository.saved).toEqual([qualification]);
  });

  // CA-48.2
  it('persiste la denominación completa, con su artículo', async () => {
    const repository = new FakeQualificationRepository();

    await new RegisterLegalQualification(repository).execute({
      name: 'Amenazas coactivas — art. 149 bis CP',
      prescriptionMonths: 24,
    });

    expect(repository.saved[0].name).toBe('Amenazas coactivas — art. 149 bis CP');
  });

  // CA-48.3
  it('persiste el plazo como el total de meses recibido', async () => {
    const repository = new FakeQualificationRepository();

    await new RegisterLegalQualification(repository).execute({
      name: 'Abuso de armas — art. 104 CP',
      prescriptionMonths: 78,
    });

    expect(repository.saved[0].prescriptionMonths).toBe(78);
  });

  // CA-48.4
  it('rechaza una denominación que ya tiene una calificación vigente', async () => {
    const repository = new FakeQualificationRepository([
      { name: 'Hurto simple — art. 162 CP', active: true },
    ]);

    await expect(
      new RegisterLegalQualification(repository).execute({
        name: 'Hurto simple — art. 162 CP',
        prescriptionMonths: 24,
      }),
    ).rejects.toThrow(LegalQualificationAlreadyExistsError);

    expect(repository.saved).toHaveLength(0);
  });

  it.each([
    ['mayúsculas', 'HURTO SIMPLE — ART. 162 CP'],
    ['minúsculas', 'hurto simple — art. 162 cp'],
    ['espacios alrededor', '  Hurto simple — art. 162 CP  '],
  ])('la rechaza aunque difiera en %s', async (_caso, name) => {
    const repository = new FakeQualificationRepository([
      { name: 'Hurto simple — art. 162 CP', active: true },
    ]);

    await expect(
      new RegisterLegalQualification(repository).execute({ name, prescriptionMonths: 24 }),
    ).rejects.toThrow(LegalQualificationAlreadyExistsError);
  });

  /**
   * El índice es parcial, así que una calificación dada de baja libera
   * su denominación. Importa porque sin esto un error de carga sería
   * irreparable: la calificación mal escrita se da de baja y su nombre
   * queda tomado para siempre.
   */
  it('acepta la denominación de una calificación dada de baja', async () => {
    const repository = new FakeQualificationRepository([
      { name: 'Hurto simple — art. 162 CP', active: false },
    ]);

    const { qualification } = await new RegisterLegalQualification(repository).execute({
      name: 'Hurto simple — art. 162 CP',
      prescriptionMonths: 24,
    });

    expect(qualification.name).toBe('Hurto simple — art. 162 CP');
  });

  // CA-48.5 y CA-48.6: el caso de uso no se saltea la validación de la
  // entidad, aunque el DTO ya haya rechazado lo mismo en el borde.
  it.each([
    ['denominación vacía', { name: '  ', prescriptionMonths: 24 }],
    ['plazo menor a 1', { name: 'Hurto simple', prescriptionMonths: 0 }],
  ])('rechaza %s', async (_caso, command) => {
    const repository = new FakeQualificationRepository();

    await expect(new RegisterLegalQualification(repository).execute(command)).rejects.toThrow(
      ValidationError,
    );

    expect(repository.saved).toHaveLength(0);
  });

  /**
   * Una denominación vacía es un campo faltante (CA-48.5), no un
   * duplicado (CA-48.4): si se consultara la unicidad del texto vacío
   * contra una fila que también lo tuviera, el usuario recibiría "ya
   * existe" por no haber escrito nada.
   */
  it('no consulta la unicidad de una denominación vacía', async () => {
    const repository = new FakeQualificationRepository();
    const spy = jest.spyOn(repository, 'existsActiveByName');

    await expect(
      new RegisterLegalQualification(repository).execute({ name: '', prescriptionMonths: 24 }),
    ).rejects.toThrow(ValidationError);

    expect(spy).not.toHaveBeenCalled();
  });

  // CA-48.7
  it('no escribe nada más que la calificación', async () => {
    const repository = new FakeQualificationRepository();

    await new RegisterLegalQualification(repository).execute({
      name: 'Hurto simple — art. 162 CP',
      prescriptionMonths: 24,
    });

    expect(repository.saved).toHaveLength(1);
    expect(repository.findPaginated).not.toHaveBeenCalled();
    expect(repository.findActiveById).not.toHaveBeenCalled();
  });
});
