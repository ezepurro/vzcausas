import { deadlineNoticeKind } from './deadline-notice-kind';

/** El preaviso por defecto de D-79: 3 días hábiles. */
const WARNING_DAYS = 3;

describe('deadlineNoticeKind', () => {
  // CA-51.3
  it('un vencimiento ya pasado se detecta como vencido', () => {
    expect(deadlineNoticeKind(-1, WARNING_DAYS)).toBe('OVERDUE');
    expect(deadlineNoticeKind(-20, WARNING_DAYS)).toBe('OVERDUE');
  });

  // CA-51.3
  it('el día del vencimiento es "vence hoy"', () => {
    expect(deadlineNoticeKind(0, WARNING_DAYS)).toBe('DEADLINE_DUE_TODAY');
  });

  // CA-51.3, V-12: toda la ventana, no solo el día exacto.
  it('dentro del preaviso, de 1 a N días hábiles, es preaviso', () => {
    expect(deadlineNoticeKind(1, WARNING_DAYS)).toBe('DEADLINE_WARNING');
    expect(deadlineNoticeKind(2, WARNING_DAYS)).toBe('DEADLINE_WARNING');
    expect(deadlineNoticeKind(3, WARNING_DAYS)).toBe('DEADLINE_WARNING');
  });

  it('fuera del preaviso todavía no corresponde nada', () => {
    expect(deadlineNoticeKind(4, WARNING_DAYS)).toBeNull();
    expect(deadlineNoticeKind(30, WARNING_DAYS)).toBeNull();
  });

  // D-79: el preaviso es configuración del servidor.
  it('respeta los días de preaviso que recibe', () => {
    expect(deadlineNoticeKind(5, 5)).toBe('DEADLINE_WARNING');
    expect(deadlineNoticeKind(2, 1)).toBeNull();
  });
});
