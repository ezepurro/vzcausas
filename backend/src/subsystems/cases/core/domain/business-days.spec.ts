import { businessDaysRemaining } from './business-days';

/** Civil date at midnight UTC, the way a `date` column is read. */
const day = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/*
 * `businessDaysRemaining` (contrato §4, Cómputo de días).
 *
 * Días hábiles entre hoy (excluido) y el vencimiento (incluido). Positivo si
 * falta, `0` si vence hoy, negativo si ya venció.
 *
 * Fechas de referencia de esta suite, para poder leer los casos:
 *   vie 11/09/2026 · sáb 12 · dom 13 · lun 14 · mar 15 · mié 16 · jue 17 · vie 18
 */
describe('businessDaysRemaining', () => {
  it('vale 0 cuando el plazo vence hoy', () => {
    expect(businessDaysRemaining(day('2026-09-15'), day('2026-09-15'))).toBe(0);
  });

  it('cuenta el día siguiente como 1', () => {
    // martes → miércoles. Es el ejemplo del contrato §3.7 (dueDate 16/09 → 1).
    expect(businessDaysRemaining(day('2026-09-15'), day('2026-09-16'))).toBe(1);
  });

  it('no cuenta el sábado ni el domingo', () => {
    // viernes → lunes: el único hábil del tramo es el lunes.
    expect(businessDaysRemaining(day('2026-09-11'), day('2026-09-14'))).toBe(1);
    // viernes → viernes siguiente: lun, mar, mié, jue, vie.
    expect(businessDaysRemaining(day('2026-09-11'), day('2026-09-18'))).toBe(5);
  });

  it('un fin de semana entero vale 0 días hábiles', () => {
    // viernes → domingo: no hay ningún hábil después del viernes.
    expect(businessDaysRemaining(day('2026-09-11'), day('2026-09-13'))).toBe(0);
  });

  it('es negativo cuando ya venció, contando hacia atrás', () => {
    // El ejemplo del contrato §3.7: consulta del martes 15/09, vencimiento 11/09.
    // Hábiles en (11/09, 15/09] = lunes 14 y martes 15 → -2.
    expect(businessDaysRemaining(day('2026-09-15'), day('2026-09-11'))).toBe(-2);
  });

  it('al día siguiente de vencer vale -1', () => {
    // vencía el lunes, hoy es martes.
    expect(businessDaysRemaining(day('2026-09-15'), day('2026-09-14'))).toBe(-1);
  });

  it('vencido el viernes y consultado el lunes vale -1, no -3', () => {
    // El sábado y el domingo no suman: el único hábil es el lunes.
    expect(businessDaysRemaining(day('2026-09-14'), day('2026-09-11'))).toBe(-1);
  });

  it('es simétrico: invertir las fechas invierte el signo', () => {
    const hoy = day('2026-09-15');
    const vence = day('2026-09-25');

    expect(businessDaysRemaining(hoy, vence)).toBe(8);
    expect(businessDaysRemaining(vence, hoy)).toBe(-8);
  });

  it('atraviesa cambios de mes y de año', () => {
    // 30/12/2026 es miércoles; 04/01/2027, lunes. Hábiles: jue 31, vie 1, lun 4.
    // Ojo: el 1 de enero es feriado, así que este número también depende de
    // P-02. Cuando se incorpore el calendario, este test pasa a esperar 2.
    expect(businessDaysRemaining(day('2026-12-30'), day('2027-01-04'))).toBe(3);
  });

  /*
   * INCOMPLETO A PROPÓSITO — P-02 de PENDIENTE_DEFINICION.md.
   *
   * Estos dos tests NO describen el comportamiento correcto: describen el
   * comportamiento actual, que es deliberadamente incompleto. Están acá para
   * que el defecto quede a la vista en vez de esconderse detrás de una suite
   * verde, que es lo que pasaría si simplemente no los escribiéramos.
   *
   * Cuando se defina el calendario de días no hábiles, estos dos tests TIENEN
   * que fallar. Ese es su trabajo: avisar que llegó el momento de cambiarlos.
   */
  describe('no excluye feriados ni feria judicial (P-02)', () => {
    it('cuenta un feriado nacional como día hábil', () => {
      // 25/12/2026 es viernes y es Navidad. Hoy no se excluye.
      expect(businessDaysRemaining(day('2026-12-24'), day('2026-12-25'))).toBe(1);
    });

    it('cuenta la feria judicial de enero como días hábiles', () => {
      // La feria de enero paraliza los plazos; este cómputo todavía no la conoce.
      // 04/01/2027 es lunes; 08/01, viernes. Da 4 hábiles como una semana común.
      expect(businessDaysRemaining(day('2027-01-04'), day('2027-01-08'))).toBe(4);
    });
  });
});
