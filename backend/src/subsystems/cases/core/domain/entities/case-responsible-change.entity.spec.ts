import { CaseResponsibleChange, NewCaseResponsibleChangeInput } from './case-responsible-change.entity';

/* HU27, D-147 · Un cambio de responsable decide su `kind` y rechaza lo que no es un cambio. */
const CHANGED_AT = new Date('2026-11-19T13:15:00.000Z');

const input = (overrides: Partial<NewCaseResponsibleChangeInput> = {}): NewCaseResponsibleChangeInput => ({
  caseId: 1,
  previousLawyerId: 3,
  newLawyerId: 4,
  changedByUserId: 1,
  origin: 'MANUAL',
  changedAt: CHANGED_AT,
  ...overrides,
});

describe('CaseResponsibleChange', () => {
  it.each([
    ['pasa de un abogado a otro', { previousLawyerId: 3, newLawyerId: 4 }, 'REASSIGNED'],
    ['queda sin abogado', { previousLawyerId: 3, newLawyerId: null }, 'ORPHANED'],
    ['una huérfana recibe abogado', { previousLawyerId: null, newLawyerId: 4 }, 'ASSIGNED_FROM_ORPHAN'],
  ])('%s: kind %s', (_name, lawyers, kind) => {
    expect(CaseResponsibleChange.create(input(lawyers)).kind).toBe(kind);
  });

  it('conserva lo que se le dio', () => {
    const change = CaseResponsibleChange.create(input({ origin: 'LAWYER_REMOVAL', changedByUserId: 9 }));

    expect(change).toMatchObject({
      caseId: 1,
      previousLawyerId: 3,
      newLawyerId: 4,
      changedByUserId: 9,
      origin: 'LAWYER_REMOVAL',
      changedAt: CHANGED_AT,
    });
  });

  it('rechaza el mismo abogado antes y después', () => {
    expect(() => CaseResponsibleChange.create(input({ previousLawyerId: 3, newLawyerId: 3 }))).toThrow(
      /two different lawyers/,
    );
  });

  it('rechaza los dos abogados nulos', () => {
    expect(() => CaseResponsibleChange.create(input({ previousLawyerId: null, newLawyerId: null }))).toThrow(
      /both are null/,
    );
  });
});
