import { Logger } from '@nestjs/common';
import { CaseNotFoundError, NotResponsibleLawyerError } from '../../../domain/errors/case.errors';
import { CASE_DEACTIVATED } from '../../../domain/ports/events/case-deactivated.event';
import { FakeCaseFolderState, FakeEventPublisher } from '../../../test-support/case-folder-fakes';
import { aCase, anActor, INITIAL_STATES, NOW, STATES_TABLE, TODAY, validationDetailsOf } from '../../../test-support/case-fixtures';
import { FakeAuditTrail, FakeCaseRepository, FakeClock, FakeTransactionManager } from '../../../test-support/case-fakes';
import { DeactivateCase, DeactivateCaseCommand } from './deactivate-case.use-case';

/*
 * HU21 · Registrar baja de una causa. Solo lo que es del caso de uso: el 404,
 * que un rechazo no escriba nada y la auditoría. Las reglas del motivo están
 * en `shared/domain/deactivation.vo.spec.ts` y las de la causa en `case.entity.spec.ts`.
 */

function build() {
  const cases = new FakeCaseRepository([...Object.values(INITIAL_STATES), ...STATES_TABLE]);
  const existing = aCase();
  cases.add(existing);
  const audit = new FakeAuditTrail();
  const folders = new FakeCaseFolderState();
  const events = new FakeEventPublisher();
  const useCase = new DeactivateCase(
    cases,
    audit,
    new FakeTransactionManager(),
    new FakeClock(NOW, TODAY),
    folders,
    events,
  );
  return { useCase, cases, audit, existing, folders, events };
}

const command = (overrides: Partial<DeactivateCaseCommand> = {}): DeactivateCaseCommand => ({
  caseId: 1,
  input: { reason: 'Causa duplicada: se registró dos veces.' },
  actor: anActor({ userId: 5, roleNames: ['SECRETARY'], lawyerId: null }),
  ...overrides,
});

describe('DeactivateCase', () => {
  // CA-21.1, CA-21.3
  it('guarda la baja y la audita con quién y cuándo, sin el motivo', async () => {
    const { useCase, cases, audit, existing } = build();

    await useCase.execute(command());

    expect(cases.deactivations).toEqual([existing]);
    expect(existing.active).toBe(false);
    expect(existing.deactivation).toMatchObject({
      reason: 'Causa duplicada: se registró dos veces.',
      deactivatedByUserId: 5,
      deactivatedAt: NOW,
    });
    expect(audit.entries).toEqual([
      { actorUserId: 5, action: 'case.deactivated', entityType: 'Case', entityId: '1', occurredAt: NOW },
    ]);
  });

  // D-110
  it('otro abogado recibe 403 y no se escribe nada', async () => {
    const { useCase, cases, audit, existing, events } = build();

    const attempt = useCase.execute(command({ actor: anActor({ roleNames: ['LAWYER'], lawyerId: 99 }) }));

    await expect(attempt).rejects.toThrow(NotResponsibleLawyerError);
    await expect(attempt).rejects.toThrow('Solo el abogado responsable de la causa puede darla de baja.');
    expect(cases.deactivations).toEqual([]);
    expect(existing.active).toBe(true);
    expect(audit.entries).toEqual([]);
    expect(events.published).toEqual([]);
  });

  // D-110
  it.each([
    ['el abogado responsable', anActor()],
    ['un ADMINISTRATOR', anActor({ roleNames: ['ADMINISTRATOR'], lawyerId: null })],
  ])('%s da de baja', async (_name, actor) => {
    const { useCase, cases } = build();

    await useCase.execute(command({ actor }));

    expect(cases.deactivations).toHaveLength(1);
  });

  // D-110: primero 404, después 403
  it('una causa inexistente es 404 aunque el actor sea otro abogado', async () => {
    const { useCase } = build();

    await expect(useCase.execute(command({ caseId: 999, actor: anActor({ lawyerId: 99 }) }))).rejects.toThrow(
      CaseNotFoundError,
    );
  });

  // CA-21.5
  it('una causa inexistente es 404 y no se escribe nada', async () => {
    const { useCase, cases, audit } = build();

    await expect(useCase.execute(command({ caseId: 999 }))).rejects.toThrow(CaseNotFoundError);

    expect(cases.deactivations).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  // CA-21.5
  it('una causa ya dada de baja es 404: la segunda baja no escribe ni audita', async () => {
    const { useCase, cases, audit, existing } = build();
    await useCase.execute(command());

    await expect(useCase.execute(command({ input: { reason: 'Otra vez' } }))).rejects.toThrow(CaseNotFoundError);

    expect(cases.deactivations).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(existing.deactivation?.reason).toBe('Causa duplicada: se registró dos veces.');
  });

  it('si otra baja ganó entre la lectura y la escritura, es 404 y no se audita (CA-21.5)', async () => {
    const { useCase, cases, audit } = build();
    cases.alreadyDeactivatedOnSave = true;

    await expect(useCase.execute(command())).rejects.toThrow(CaseNotFoundError);

    expect(audit.entries).toEqual([]);
  });

  // CA-21.2
  it('un motivo de más de 500 caracteres es 400 y no se escribe nada', async () => {
    const { useCase, cases, audit, existing } = build();

    expect(await validationDetailsOf(() => useCase.execute(command({ input: { reason: 'a'.repeat(501) } })))).toEqual({
      reason: 'Debe tener hasta 500 caracteres.',
    });
    expect(cases.deactivations).toEqual([]);
    expect(audit.entries).toEqual([]);
    expect(existing.active).toBe(true);
  });

  // D-104 (revisado): la carpeta sigue a la baja, y Drive no hace fallar la baja
  describe('la carpeta en Drive', () => {
    beforeEach(() => jest.spyOn(Logger.prototype, 'error').mockImplementation());

    afterEach(() => jest.restoreAllMocks());

    it('con la carpeta creada, anuncia la baja después de guardarla', async () => {
      const { useCase, cases, events, folders } = build();
      folders.set(1, 'CREATED');

      await useCase.execute(command());

      expect(cases.deactivations).toHaveLength(1);
      expect(events.published).toEqual([
        { type: CASE_DEACTIVATED, eventId: expect.any(String), occurredAt: NOW.toISOString(), caseId: 1 },
      ]);
    });

    it.each([
      ['la causa no tiene carpeta', null],
      ['la carpeta se está creando', 'CREATING' as const],
      ['la carpeta quedó en error', 'ERROR' as const],
    ])('no anuncia nada si %s', async (_case, status) => {
      const { useCase, events, folders } = build();
      folders.set(1, status);

      await useCase.execute(command());

      expect(events.published).toEqual([]);
    });

    it('un rechazo no anuncia nada', async () => {
      const { useCase, events, folders } = build();
      folders.set(1, 'CREATED');

      await expect(useCase.execute(command({ caseId: 999 }))).rejects.toThrow(CaseNotFoundError);

      expect(events.published).toEqual([]);
    });

    it('si el anuncio falla, la baja queda guardada y responde igual (CA-21.1)', async () => {
      const { useCase, cases, events, folders } = build();
      folders.set(1, 'CREATED');
      events.failWith = new Error('bus caído');

      await expect(useCase.execute(command())).resolves.toBeUndefined();

      expect(cases.deactivations).toHaveLength(1);
    });
  });
});
