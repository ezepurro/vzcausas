import { ValidationError } from '@shared/domain/domain-error';
import {
  CaseInTerminalStateError,
  CaseNotFoundError,
  CaseSacAlreadyExistsError,
  NotResponsibleLawyerError,
} from '../../../domain/errors/case.errors';
import { CaseListItem } from '../../../domain/ports/case/case.repository';
import { CASE_MODIFIED } from '../../../domain/ports/events/case-modified.event';
import {
  aCase,
  anActor,
  CLIENT,
  INITIAL_STATES,
  LAWYER,
  NOW,
  ROBBERY,
  STATES_TABLE,
  TODAY,
} from '../../../test-support/case-fixtures';
import {
  FakeAuditTrail,
  FakeCaseRepository,
  FakeClock,
  FakeLegalParametersLookup,
  FakePeopleLookup,
  FakeTransactionManager,
} from '../../../test-support/case-fakes';
import { FakeCaseFolderState, FakeEventPublisher } from '../../../test-support/case-folder-fakes';
import { GetCase } from './get-case.use-case';
import { UpdateCase, UpdateCaseCommand } from './update-case.use-case';

/*
 * HU19 · Modificar causa. Solo lo que es del caso de uso: el orden de los
 * chequeos, que un rechazo no escriba nada, las referencias, la auditoría y el
 * evento. Las reglas de los datos están en `case-modify.spec.ts`.
 */

const OTHER_LAWYER = { id: 7, lastName: 'Peralta', firstName: 'Ignacio', registrationNumber: '1-35207' };
const OTHER_CLIENT = { ...CLIENT, id: 9, lastName: 'FERREYRA', firstName: 'Lucas' };

function build() {
  const cases = new FakeCaseRepository([...Object.values(INITIAL_STATES), ...STATES_TABLE]);
  const existing = aCase();
  cases.add(existing);
  const audit = new FakeAuditTrail();
  const events = new FakeEventPublisher();
  const folders = new FakeCaseFolderState();
  // The response is `GetCase`'s; here it only has to be asked for the right case.
  const getCase = { execute: async ({ id }: { id: number }) => ({ id }) as unknown as CaseListItem } as GetCase;
  const useCase = new UpdateCase(
    cases,
    new FakePeopleLookup([LAWYER, OTHER_LAWYER], [CLIENT, OTHER_CLIENT]),
    new FakeLegalParametersLookup(INITIAL_STATES, [ROBBERY]),
    folders,
    audit,
    new FakeTransactionManager(),
    new FakeClock(NOW, TODAY),
    events,
    getCase,
  );
  return { useCase, cases, audit, events, folders, existing };
}

const command = (overrides: Partial<UpdateCaseCommand> = {}): UpdateCaseCommand => ({
  caseId: 1,
  changes: { court: 'Juzgado de Control N° 3' },
  actor: anActor({ userId: 5 }),
  ...overrides,
});

describe('UpdateCase', () => {
  // CA-19.1, CA-19.15
  it('guarda la modificación, la audita con los nombres de los campos y responde con GetCase', async () => {
    const { useCase, cases, audit } = build();

    const result = await useCase.execute(command({ changes: { court: 'Juzgado N° 3', courtFeePaid: true } }));

    expect(result).toEqual({ id: 1 });
    expect(cases.modifications).toHaveLength(1);
    expect(cases.modifications[0]).toMatchObject({ court: 'Juzgado N° 3', courtFeePaid: true });
    expect(audit.entries).toEqual([
      {
        actorUserId: 5,
        action: 'case.updated',
        entityType: 'Case',
        entityId: '1',
        occurredAt: NOW,
        metadata: { changedFields: ['court', 'courtFeePaid'] },
      },
    ]);
  });

  // CA-19.14
  it('una causa inexistente es 404 antes que los datos, y no escribe nada', async () => {
    const { useCase, cases, audit } = build();

    await expect(useCase.execute(command({ caseId: 999, changes: { caption: '' } }))).rejects.toBeInstanceOf(
      CaseNotFoundError,
    );
    expect(cases.modifications).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  // D-110
  it.each([
    ['otro abogado', { roleNames: ['LAWYER'], lawyerId: 99 }],
    ['un abogado sin ficha', { roleNames: ['LAWYER'], lawyerId: null }],
  ])('%s recibe 403 y no escribe nada', async (_name, actor) => {
    const { useCase, cases, audit, events } = build();

    const attempt = useCase.execute(command({ actor: anActor(actor) }));

    await expect(attempt).rejects.toThrow(NotResponsibleLawyerError);
    await expect(attempt).rejects.toThrow('Solo el abogado responsable de la causa puede modificarla.');
    expect(cases.modifications).toEqual([]);
    expect(audit.entries).toEqual([]);
    expect(events.published).toEqual([]);
  });

  // D-110
  it.each([
    ['ADMINISTRATOR', ['ADMINISTRATOR'], null],
    ['SECRETARY', ['SECRETARY'], null],
    ['LAWYER y SECRETARY, sin ser el responsable', ['LAWYER', 'SECRETARY'], 99],
  ])('%s modifica una causa ajena', async (_name, roleNames, lawyerId) => {
    const { useCase, cases } = build();

    await useCase.execute(command({ actor: anActor({ roleNames, lawyerId }) }));

    expect(cases.modifications).toHaveLength(1);
  });

  // D-110: primero 404, después 403
  it('una causa inexistente es 404 aunque el actor sea otro abogado', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute(command({ caseId: 999, actor: anActor({ lawyerId: 99 }) })),
    ).rejects.toBeInstanceOf(CaseNotFoundError);
  });

  // CA-19.8: las referencias, con los mensajes del alta
  it('un abogado que no está vigente se informa junto con los demás errores', async () => {
    const { useCase, cases } = build();

    const error = await useCase
      .execute(command({ changes: { responsibleLawyerId: 404, sacNumber: '1' } }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual({
      responsibleLawyerId: 'No existe un abogado vigente con ese identificador.',
      sacNumber: 'Debe contener exactamente 8 dígitos.',
    });
    expect(cases.modifications).toEqual([]);
  });

  it('una calificación que no existe o está dada de baja se informa', async () => {
    const { useCase } = build();

    const error = await useCase
      .execute(command({ changes: { legalQualifications: [{ legalQualificationId: 77, offenseDate: TODAY }] } }))
      .catch((e: unknown) => e);

    expect((error as ValidationError).details).toEqual({
      legalQualifications: 'Alguna calificación legal no existe o está dada de baja.',
    });
  });

  // CA-19.5
  it('un SAC de otra causa vigente es 409 y no escribe nada', async () => {
    const { useCase, cases, audit } = build();
    cases.takenSacNumbers.add('13284571');

    await expect(useCase.execute(command({ changes: { sacNumber: '13284571' } }))).rejects.toBeInstanceOf(
      CaseSacAlreadyExistsError,
    );
    expect(cases.modifications).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  it('si el SAC no cambió, no pregunta por él', async () => {
    const { useCase, cases, existing } = build();

    await useCase.execute(command({ changes: { sacNumber: existing.sacNumber, court: 'Juzgado N° 3' } }));

    expect(cases.sacNumbersChecked).toEqual([]);
  });

  // CA-19.13: lo propaga sin escribir
  it('lo que el fuero rechaza (422) no escribe nada', async () => {
    const { useCase, cases } = build();
    jest.spyOn(cases, 'findById').mockResolvedValue(
      Object.assign(aCase(), {
        modify: () => {
          throw new CaseInTerminalStateError(CaseInTerminalStateError.FOR_THIS_OPERATION);
        },
      }),
    );

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(CaseInTerminalStateError);
    expect(cases.modifications).toEqual([]);
  });

  // CA-19.9, CA-19.10
  describe('la carpeta en Drive', () => {
    it('si cambió el responsable y la carpeta existe, anuncia adónde moverla, después de guardar', async () => {
      const { useCase, cases, events, folders } = build();
      folders.set(1, 'CREATED');

      await useCase.execute(command({ changes: { responsibleLawyerId: OTHER_LAWYER.id } }));

      expect(cases.modifications).toHaveLength(1);
      expect(events.published).toEqual([
        {
          type: CASE_MODIFIED,
          eventId: expect.any(String),
          occurredAt: NOW.toISOString(),
          caseId: 1,
          caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
          lawyer: { id: OTHER_LAWYER.id, lastName: 'Peralta', firstName: 'Ignacio' },
          jurisdiction: { id: 1, label: 'Penal' },
          changed: ['responsibleLawyer'],
        },
      ]);
    });

    it.each([
      ['la causa no tiene carpeta', null, { caption: 'FERREYRA p.s.a. Robo' }],
      ['la carpeta se está creando', 'CREATING' as const, { caption: 'FERREYRA p.s.a. Robo' }],
      ['no cambió ni la carátula ni el responsable', 'CREATED' as const, { court: 'Juzgado N° 3' }],
    ])('no anuncia nada si %s', async (_case, status, changes) => {
      const { useCase, events, folders } = build();
      folders.set(1, status);

      await useCase.execute(command({ changes }));

      expect(events.published).toEqual([]);
    });

    it('si el anuncio falla, la modificación queda guardada y responde igual', async () => {
      const { useCase, cases, events, folders } = build();
      folders.set(1, 'CREATED');
      events.failWith = new Error('bus caído');

      await expect(useCase.execute(command({ changes: { caption: 'FERREYRA p.s.a. Robo' } }))).resolves.toEqual({
        id: 1,
      });
      expect(cases.modifications).toHaveLength(1);
    });
  });
});
