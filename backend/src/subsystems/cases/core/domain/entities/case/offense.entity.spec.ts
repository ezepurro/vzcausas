import { day } from '../../../test-support/case-fixtures';
import { Offense } from './offense.entity';

function anOffense(offenseDate: string, prescriptionMonths: number): Offense {
  return Offense.hydrate({
    legalQualification: { id: 1, name: 'Robo calificado', prescriptionMonths },
    offenseDate: day(offenseDate),
    prescriptionExpiresOn: null,
  });
}

describe('Offense', () => {
  it('no tiene fecha de prescripción hasta que se calcula', () => {
    const offense = anOffense('2021-02-27', 96);

    expect(offense.prescriptionExpiresOn).toBeNull();
  });

  it('calcula la prescripción sumando los meses de la calificación a la fecha del hecho (CA-18.6)', () => {
    const offense = anOffense('2021-02-27', 96);

    offense.calculatePrescription();

    expect(offense.prescriptionExpiresOn).toEqual(day('2029-02-27'));
  });

  it('cuenta la prescripción desde la fecha del hecho', () => {
    const offense = anOffense('2021-02-27', 96);

    expect(offense.prescriptionStartsOn).toEqual(day('2021-02-27'));
  });

  it('si el mes de llegada es más corto, cae en su último día', () => {
    const offense = anOffense('2021-01-31', 1);

    offense.calculatePrescription();

    expect(offense.prescriptionExpiresOn).toEqual(day('2021-02-28'));
  });

  it('respeta el 29 de febrero de un año bisiesto', () => {
    const offense = anOffense('2024-01-31', 1);

    offense.calculatePrescription();

    expect(offense.prescriptionExpiresOn).toEqual(day('2024-02-29'));
  });

  it('cruza el fin de año', () => {
    const offense = anOffense('2020-11-15', 3);

    offense.calculatePrescription();

    expect(offense.prescriptionExpiresOn).toEqual(day('2021-02-15'));
  });

  it('calcularla dos veces da la misma fecha', () => {
    const offense = anOffense('2021-02-27', 96);

    offense.calculatePrescription();
    offense.calculatePrescription();

    expect(offense.prescriptionExpiresOn).toEqual(day('2029-02-27'));
  });

  it('no se puede pasar a datos planos sin la fecha de prescripción (V4 §3.7: no es nula)', () => {
    expect(() => anOffense('2021-02-27', 96).toSnapshot()).toThrow('has no prescription date');
  });

  it('pasado a datos planos lleva la fecha de prescripción calculada', () => {
    const offense = anOffense('2021-02-27', 96);
    offense.calculatePrescription();

    expect(offense.toSnapshot()).toEqual({
      legalQualificationId: 1,
      legalQualificationName: 'Robo calificado',
      prescriptionMonths: 96,
      offenseDate: day('2021-02-27'),
      prescriptionStartsOn: day('2021-02-27'),
      prescriptionExpiresOn: day('2029-02-27'),
    });
  });

  it('expone los datos de la calificación legal en la que se basa', () => {
    const offense = anOffense('2021-02-27', 96);

    expect(offense.legalQualificationId).toBe(1);
    expect(offense.legalQualificationName).toBe('Robo calificado');
    expect(offense.prescriptionMonths).toBe(96);
    expect(offense.offenseDate).toEqual(day('2021-02-27'));
  });
});
