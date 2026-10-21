import { prescriptionNoticeKind } from './prescription-notice-kind';

describe('prescriptionNoticeKind', () => {
  it('por debajo del 70 % no corresponde ningún aviso', () => {
    expect(prescriptionNoticeKind({ alert: false, expired: false })).toBeNull();
  });

  // CA-52.2
  it('al 70 % o más, sin cumplir el plazo, corresponde la alerta', () => {
    expect(prescriptionNoticeKind({ alert: true, expired: false })).toBe('PRESCRIPTION_ALERT');
  });

  // CA-52.2, V-02: una sola de las dos, nunca la alerta junto con el plazo cumplido.
  it('con el plazo cumplido corresponde solo la prescripción cumplida, aunque también esté en alerta', () => {
    expect(prescriptionNoticeKind({ alert: true, expired: true })).toBe('PRESCRIPTION_EXPIRED');
  });

  // `summarizePrescription` nunca da esta combinación (cumplido implica 100 %),
  // pero la decisión no depende de eso: el plazo cumplido manda.
  it('el plazo cumplido manda aunque la alerta venga en false', () => {
    expect(prescriptionNoticeKind({ alert: false, expired: true })).toBe('PRESCRIPTION_EXPIRED');
  });
});
