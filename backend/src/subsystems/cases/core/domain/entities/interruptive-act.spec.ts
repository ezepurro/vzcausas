import { ValidationError } from '@shared/domain/domain-error';
import { NOW, TODAY, day } from '../../test-support/case-fixtures';
import { InterruptiveAct, NewInterruptiveActInput } from './interruptive-act';

function input(overrides: Partial<NewInterruptiveActInput> = {}): NewInterruptiveActInput {
  return {
    id: 7,
    caseId: 1,
    name: 'Citación a juicio',
    actDate: day('2026-09-15'),
    notes: 'Decreto de fs. 212.',
    registeredByUserId: 5,
    registeredByLawyerId: 2,
    today: TODAY,
    now: NOW,
    ...overrides,
  };
}

function detailsOf(work: () => unknown): Record<string, unknown> | null {
  try {
    work();
    return null;
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).details;
  }
}

describe('InterruptiveAct.create', () => {
  // CA-31.1
  it('arma el acto con quién lo registró y cuándo', () => {
    const act = InterruptiveAct.create(input());

    expect(act.name).toBe('Citación a juicio');
    expect(act.actDate).toEqual(day('2026-09-15'));
    expect(act.notes).toBe('Decreto de fs. 212.');
    expect(act.registeredByUserId).toBe(5);
    expect(act.registeredByLawyerId).toBe(2);
    expect(act.registeredAt).toBe(NOW);
  });

  it('recorta los espacios y deja en null las observaciones vacías', () => {
    const act = InterruptiveAct.create(input({ name: '  Indagatoria  ', notes: '   ' }));

    expect(act.name).toBe('Indagatoria');
    expect(act.notes).toBeNull();
  });

  it('admite un acto de hoy', () => {
    expect(InterruptiveAct.create(input({ actDate: TODAY })).actDate).toEqual(TODAY);
  });

  // CA-31.8
  it.each([
    ['vacío', ''],
    ['en blanco', '   '],
  ])('rechaza un nombre %s', (_caso, name) => {
    expect(detailsOf(() => InterruptiveAct.create(input({ name })))).toEqual({
      name: 'El acto interruptivo es obligatorio.',
    });
  });

  it('rechaza un nombre de más de 255 caracteres', () => {
    expect(detailsOf(() => InterruptiveAct.create(input({ name: 'A'.repeat(256) })))).toHaveProperty('name');
  });

  it('admite un nombre de exactamente 255 caracteres', () => {
    expect(InterruptiveAct.create(input({ name: 'A'.repeat(255) })).name).toHaveLength(255);
  });

  it('rechaza una fecha posterior a hoy', () => {
    expect(detailsOf(() => InterruptiveAct.create(input({ actDate: day('2026-10-07') })))).toEqual({
      actDate: 'No puede ser posterior a hoy.',
    });
  });

  it('rechaza una fecha inválida', () => {
    expect(detailsOf(() => InterruptiveAct.create(input({ actDate: new Date('nope') })))).toHaveProperty('actDate');
  });

  it('rechaza observaciones de más de 2000 caracteres', () => {
    expect(detailsOf(() => InterruptiveAct.create(input({ notes: 'x'.repeat(2001) })))).toHaveProperty('notes');
  });

  it('informa todos los campos inválidos a la vez', () => {
    const details = detailsOf(() =>
      InterruptiveAct.create(input({ name: '', actDate: day('2026-12-01'), notes: 'x'.repeat(2001) })),
    );

    expect(Object.keys(details ?? {}).sort()).toEqual(['actDate', 'name', 'notes']);
  });
});
