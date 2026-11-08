import { Logger } from '@nestjs/common';
import { InMemoryCaseFolderOutcomes } from '../../../../infrastructure/events/in-memory-case-folder-outcomes';
import { CaseSacAlreadyExistsError, CopyTemplatesWithoutFolderError } from '../../../domain/errors/case.errors';
import { AdministrativeCase } from '../../../domain/entities/case/administrative-case.entity';
import { Amparo } from '../../../domain/entities/case/amparo.entity';
import { CriminalCase } from '../../../domain/entities/case/criminal-case.entity';
import { ProceduralStateRef } from '../../../domain/ports/case/legal-parameters-lookup.port';
import { DayType } from '../../../domain/value-objects/deadline/day-type';
import { JurisdictionCode } from '../../../domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../../domain/value-objects/case/procedural-role';
import { FakeCaseFolderState, FakeEventPublisher } from '../../../test-support/case-folder-fakes';
import {
  FakeCaseRepository,
  FakeClock,
  FakeLegalParametersLookup,
  FakePeopleLookup,
} from '../../../test-support/case-fakes';
import {
  aRegisterCaseCommand,
  CLIENT,
  day,
  HOMICIDE,
  INITIAL_STATES,
  LAWYER,
  NOW,
  ROBBERY,
  TODAY,
  validationDetailsOf,
} from '../../../test-support/case-fixtures';
import { RegisterCaseCommand } from './register-case.interfaces';
import { RegisterCase } from './register-case.use-case';
import { CaseRegisteredEvent } from '../../../domain/ports/events/case-registered.event';
import { RequestCaseFolder } from './request-case-folder.use-case';

/**
 * Specs of the use case in isolation: every port is an in-memory fake, so
 * nothing touches a database, HTTP or another subsystem.
 *
 * Las reglas del alta (SAC y fecha de inicio, carátula, rol procesal, datos de cada
 * fuero, calificaciones) se prueban en `case.factory.spec.ts`. Acá queda la
 * coordinación: las referencias que se buscan en otros subsistemas, que sus errores
 * se sumen a los del formulario, la unicidad del SAC, lo que se guarda y la carpeta.
 */
describe('RegisterCase', () => {
  function build(options: { withoutInitialState?: JurisdictionCode; waitMs?: number } = {}) {
    const initialStates: Partial<Record<JurisdictionCode, ProceduralStateRef>> = { ...INITIAL_STATES };
    if (options.withoutInitialState) {
      delete initialStates[options.withoutInitialState];
    }
    const cases = new FakeCaseRepository(Object.values(INITIAL_STATES));
    const people = new FakePeopleLookup([LAWYER], [CLIENT]);
    const legalParameters = new FakeLegalParametersLookup(initialStates, [ROBBERY, HOMICIDE]);
    const folderState = new FakeCaseFolderState();
    const outcomes = new InMemoryCaseFolderOutcomes(options.waitMs ?? 1000);
    const events = new FakeEventPublisher();
    const requestCaseFolder = new RequestCaseFolder(
      cases,
      people,
      folderState,
      outcomes,
      new FakeClock(NOW, TODAY),
      events,
    );
    const useCase = new RegisterCase(
      cases,
      people,
      legalParameters,
      new FakeClock(NOW, TODAY),
      folderState,
      requestCaseFolder,
    );
    // By default `documents` answers right away with the folder created.
    events.onPublish = async ({ caseId }) => {
      await folderState.markCreated(caseId, 'drive-folder-1');
      outcomes.notify(caseId, 'CREATED');
      outcomes.notify(caseId, 'COPIED');
    };
    return { useCase, cases, folderState, outcomes, events, requestCaseFolder };
  }

  const administrativeCommand = (overrides: Partial<RegisterCaseCommand> = {}) =>
    aRegisterCaseCommand({
      jurisdiction: JurisdictionCode.ADMINISTRATIVE,
      proceduralRole: ProceduralRole.RECURRENTE,
      subjectMatter: 'Se impugna la resolución que deniega la cobertura.',
      counterparty: 'APROSS',
      ...overrides,
    });

  const amparoCommand = (overrides: Partial<RegisterCaseCommand> = {}) =>
    aRegisterCaseCommand({
      jurisdiction: JurisdictionCode.AMPARO,
      proceduralRole: ProceduralRole.ACTORA,
      subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
      counterparty: 'APROSS',
      ...overrides,
    });

  const robberyOn = (offenseDate: string) => ({ legalQualificationId: ROBBERY.id, offenseDate: day(offenseDate) });
  const homicideOn = (offenseDate: string) => ({ legalQualificationId: HOMICIDE.id, offenseDate: day(offenseDate) });

  describe('alta exitosa (CA-18.1)', () => {
    it('guarda la causa de cada fuero con su id; sólo la penal prescribe y sólo el amparo tiene acto lesivo', async () => {
      const { useCase, cases } = build();

      const criminal = await useCase.execute(aRegisterCaseCommand({ sacNumber: '11111111' }));
      const administrative = await useCase.execute(administrativeCommand());
      const amparo = await useCase.execute(amparoCommand());

      expect(cases.saved.map((saved) => saved.constructor)).toEqual([CriminalCase, AdministrativeCase, Amparo]);
      expect([criminal, administrative, amparo].map((result) => result.newCase.id)).toEqual([1, 2, 3]);
      expect(cases.saved[0].toSnapshot()).toEqual(criminal.newCase);
      expect((await cases.findById(1))?.toSnapshot()).toEqual(criminal.newCase);
      expect(administrative.newCase.offenses).toEqual([]);
      expect(amparo.newCase.offenses).toEqual([]);
      expect(administrative.prescription).toBeNull();
      expect(amparo.prescription).toBeNull();
      // Sin acto lesivo no hay plazo; en los otros fueros, nunca.
      expect([criminal, administrative, amparo].map((result) => result.harmfulActDeadline)).toEqual([null, null, null]);
    });

    // CA-18.8
    it('guarda los datos de la causa, quién la dio de alta y su responsable, y devuelve cliente y abogado', async () => {
      const { useCase } = build();

      const result = await useCase.execute(
        aRegisterCaseCommand({
          createdByUserId: 8,
          responsibleLawyerId: LAWYER.id,
          court: 'Juzgado de Control N° 3',
          instructorName: 'Dra. Verónica Ledesma',
          tribunalPhone: '0351 448-1200',
          instructorExtension: '214',
        }),
      );

      expect(result.newCase).toMatchObject({
        caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
        sacNumber: '12345678',
        court: 'Juzgado de Control N° 3',
        instructor: { name: 'Dra. Verónica Ledesma', phone: '0351 448-1200', extension: '214' },
        proceduralRole: ProceduralRole.DEFENSA,
        startDate: day('2026-09-01'),
        createdByUserId: 8,
        createdAt: NOW,
        active: true,
        clientId: CLIENT.id,
        responsibleLawyerId: LAWYER.id,
      });
      expect(result.client).toEqual(CLIENT);
      expect(result.responsibleLawyer).toEqual(LAWYER);
    });
  });

  describe('estado inicial (CA-18.7)', () => {
    it.each(Object.values(JurisdictionCode))('en el fuero %s nace en el estado inicial del fuero', async (jurisdiction) => {
      const { useCase } = build();
      const roleByJurisdiction = {
        [JurisdictionCode.CRIMINAL]: ProceduralRole.DEFENSA,
        [JurisdictionCode.ADMINISTRATIVE]: ProceduralRole.DEFENSA,
        [JurisdictionCode.AMPARO]: ProceduralRole.ACTORA,
      };

      const { newCase, currentState } = await useCase.execute(
        aRegisterCaseCommand({
          jurisdiction,
          proceduralRole: roleByJurisdiction[jurisdiction],
          subjectMatter: jurisdiction === JurisdictionCode.CRIMINAL ? undefined : 'Un objeto',
        }),
      );

      expect(newCase.currentStateId).toBe(INITIAL_STATES[jurisdiction].id);
      expect(newCase.jurisdictionId).toBe(INITIAL_STATES[jurisdiction].jurisdictionId);
      expect(newCase.currentProceduralActId).toBeNull();
      expect(currentState).toEqual(INITIAL_STATES[jurisdiction]);
    });

    it('un fuero sin estado inicial no admite causas: se informa con los demás datos inexistentes y nada se guarda', async () => {
      const { useCase, cases } = build({ withoutInitialState: JurisdictionCode.CRIMINAL });

      const details = await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ clientId: 99 })));

      expect(details).toEqual({
        clientId: 'No existe un cliente vigente con ese identificador.',
        jurisdiction: 'No existe un fuero con estado inicial.',
      });
      expect(cases.saved).toEqual([]);
    });
  });

  describe('prescripción (CA-18.6, §3.7)', () => {
    it('cada hecho se guarda con su prescripción ya calculada', async () => {
      const { useCase, cases } = build();

      const { newCase } = await useCase.execute(
        aRegisterCaseCommand({ legalQualifications: [robberyOn('2021-02-27'), homicideOn('2022-05-01')] }),
      );

      expect(newCase.offenses[0]).toMatchObject({
        legalQualificationId: ROBBERY.id,
        legalQualificationName: 'Robo calificado',
        prescriptionMonths: 96,
        offenseDate: day('2021-02-27'),
        prescriptionStartsOn: day('2021-02-27'),
      });
      expect(newCase.offenses.map((offense) => offense.prescriptionExpiresOn)).toEqual([day('2029-02-27'), day('2037-05-01')]);
      expect(cases.prescriptionsWhenSaved).toEqual([day('2029-02-27'), day('2037-05-01')]);
    });

    it('resume la calificación que prescribe primero, calculada al día de hoy', async () => {
      const { useCase } = build();

      const result = await useCase.execute(
        aRegisterCaseCommand({ legalQualifications: [homicideOn('2022-05-01'), robberyOn('2021-02-27')] }),
      );

      // Robo vence el 27/02/2029, antes que homicidio (01/05/2037). Al 06/10/2026
      // transcurrieron 2047 de 2922 días: 70,05 %, la alerta ya está encendida.
      expect(result.prescription).toEqual({
        legalQualificationId: ROBBERY.id,
        legalQualificationName: 'Robo calificado',
        startsOn: day('2021-02-27'),
        expiresOn: day('2029-02-27'),
        elapsedPercentage: 70,
        alert: true,
        expired: false,
        // Del 06/10/2026 al 27/02/2029.
        remainingDays: 875,
        lastInterruptiveActDate: null,
      });
    });

    // D-112: el alta devuelve el estado de cada calificación, como el detalle.
    it('devuelve el estado de prescripción de cada hecho, en el orden de los hechos', async () => {
      const { useCase } = build();

      const result = await useCase.execute(
        aRegisterCaseCommand({ legalQualifications: [homicideOn('2022-05-01'), robberyOn('2021-02-27')] }),
      );

      // Al 06/10/2026. Homicidio vence el 01/05/2037: 29,55 %. Robo vence el 27/02/2029: 70,05 %.
      expect(result.newCase.offenses.map((offense) => offense.legalQualificationId)).toEqual([HOMICIDE.id, ROBBERY.id]);
      expect(result.offensePrescriptions).toEqual([
        { elapsedPercentage: 30, alert: false, expired: false },
        { elapsedPercentage: 70, alert: true, expired: false },
      ]);
    });

    // D-74
    it('una causa penal sin calificaciones, o sin el campo, se registra y no computa prescripción', async () => {
      const { useCase, cases } = build();

      const empty = await useCase.execute(aRegisterCaseCommand({ sacNumber: '11111111', legalQualifications: [] }));
      const missing = await useCase.execute(aRegisterCaseCommand({ sacNumber: '22222222', legalQualifications: undefined }));

      expect([empty, missing].map((result) => [result.newCase.offenses, result.prescription])).toEqual([
        [[], null],
        [[], null],
      ]);
      expect(cases.saved).toHaveLength(2);
      expect(cases.prescriptionsWhenSaved).toEqual([]);
    });
  });

  describe('referencias y errores (CA-18.9)', () => {
    /** Una sola calificación inexistente entre varias alcanza para rechazar el alta. */
    it('informa todos los datos inexistentes juntos, cada uno sobre su campo, y no guarda nada', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(
          aRegisterCaseCommand({
            clientId: 98,
            responsibleLawyerId: 99,
            legalQualifications: [robberyOn('2021-02-27'), { legalQualificationId: 97, offenseDate: day('2021-02-27') }],
          }),
        ),
      );

      expect(details).toEqual({
        clientId: 'No existe un cliente vigente con ese identificador.',
        responsibleLawyerId: 'No existe un abogado vigente con ese identificador.',
        legalQualifications: 'Alguna calificación legal no existe o está dada de baja.',
      });
      expect(cases.saved).toEqual([]);
    });

    it('suma los datos inexistentes a los errores del formulario y de cada fuero', async () => {
      const { useCase, cases } = build();

      const form = await validationDetailsOf(() =>
        useCase.execute(aRegisterCaseCommand({ clientId: 99, caption: '', sacNumber: '123' })),
      );
      const jurisdiction = await validationDetailsOf(() =>
        useCase.execute(
          amparoCommand({ clientId: 999, harmfulActDate: day('2026-08-03'), harmfulActTermDayType: DayType.BUSINESS }),
        ),
      );

      expect(form).toEqual({
        clientId: 'No existe un cliente vigente con ese identificador.',
        caption: 'Es obligatoria.',
        sacNumber: 'Debe contener exactamente 8 dígitos.',
      });
      expect(jurisdiction).toEqual({
        clientId: 'No existe un cliente vigente con ese identificador.',
        harmfulActTermDays: 'Indicá el plazo para presentar el amparo.',
      });
      expect(cases.saved).toEqual([]);
    });

    it('si no se puede guardar, el error llega sin cambios', async () => {
      const { useCase, cases } = build();
      const failure = new Error('connection lost');
      cases.failOnSaveWith = failure;

      await expect(useCase.execute(aRegisterCaseCommand())).rejects.toBe(failure);
    });
  });

  describe('unicidad del SAC (CA-18.2, RN2)', () => {
    it('un SAC que ya existe responde CASE_SAC_ALREADY_EXISTS y no guarda nada', async () => {
      const { useCase, cases } = build();
      cases.takenSacNumbers.add('12345678');

      const error = await useCase.execute(aRegisterCaseCommand({ sacNumber: '12345678' })).catch((caught) => caught);

      expect(error).toBeInstanceOf(CaseSacAlreadyExistsError);
      expect(error.code).toBe('CASE_SAC_ALREADY_EXISTS');
      expect(cases.sacNumbersChecked).toEqual(['12345678']);
      expect(cases.saved).toEqual([]);
    });

    it('sin SAC la causa se registra sin consultar la unicidad', async () => {
      const { useCase, cases } = build();

      const { newCase } = await useCase.execute(aRegisterCaseCommand({ sacNumber: undefined, startDate: undefined }));

      expect(newCase.sacNumber).toBeNull();
      expect(newCase.startDate).toBeNull();
      expect(cases.sacNumbersChecked).toEqual([]);
      expect(cases.saved).toHaveLength(1);
    });

    it('primero valida los datos y recién después consulta la unicidad del SAC', async () => {
      const { useCase, cases } = build();
      cases.takenSacNumbers.add('12345678');

      await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ caption: '' })));

      expect(cases.sacNumbersChecked).toEqual([]);
    });
  });

  // D-67. Cada dato y su validación, en `case.factory.spec.ts`.
  it('guarda los datos propios de cada fuero y devuelve el plazo del acto lesivo calculado contra hoy', async () => {
    const { useCase, cases } = build();

    const criminal = await useCase.execute(
      aRegisterCaseCommand({ sacNumber: '11111111', clientDetained: true, courtFeePaid: true }),
    );
    const administrative = await useCase.execute(
      administrativeCommand({ administrativeRemedyExhaustedOn: day('2026-08-10') }),
    );
    const amparo = await useCase.execute(
      amparoCommand({
        injunctionGranted: true,
        courtFeePaid: true,
        harmfulActDate: day('2026-08-03'),
        harmfulActRenews: true,
        harmfulActRenewalDays: 30,
        harmfulActTermDays: 15,
        harmfulActTermDayType: DayType.BUSINESS,
      }),
    );

    expect(criminal.newCase).toMatchObject({ clientDetained: true, courtFeePaid: true });
    expect(administrative.newCase).toMatchObject({ administrativeRemedyExhaustedOn: day('2026-08-10'), courtFeePaid: false });
    expect(amparo.newCase).toMatchObject({
      injunctionGranted: true,
      harmfulActDate: day('2026-08-03'),
      harmfulActRenews: true,
      harmfulActRenewalDays: 30,
      harmfulActTermDays: 15,
      harmfulActTermDayType: DayType.BUSINESS,
      courtFeePaid: true,
    });
    // Hoy en estos specs es 06/10/2026: pasaron 64 días, dos renovaciones (02/09 y 02/10).
    expect(amparo.harmfulActDeadline).toMatchObject({ actDate: day('2026-10-02'), renewed: true });
    expect(cases.saved.map((saved) => saved.toSnapshot())).toEqual([criminal.newCase, administrative.newCase, amparo.newCase]);
  });

  describe('carpeta en la nube (HU39)', () => {
    beforeEach(() => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => jest.restoreAllMocks());

    it('por defecto pide la carpeta y devuelve el resultado en la respuesta', async () => {
      const { useCase, events, folderState } = build();

      const result = await useCase.execute(aRegisterCaseCommand());

      expect(events.published).toHaveLength(1);
      expect(result.folder).toMatchObject({ status: 'CREATED' });
      expect(folderState.cloudFolderIdOf(result.newCase.id)).toBe('drive-folder-1');
    });

    it('con createFolder en false no pide nada y la carpeta queda PENDING', async () => {
      const { useCase, events } = build();

      const result = await useCase.execute(aRegisterCaseCommand({ createFolder: false }));

      expect(events.published).toHaveLength(0);
      expect(result.folder).toMatchObject({ status: 'PENDING', url: null, path: null });
    });

    it('copyTemplates en true sin crear la carpeta se rechaza con el mensaje del contrato, antes de consultar o guardar nada', async () => {
      const { useCase, cases } = build();

      const error = await useCase
        .execute(aRegisterCaseCommand({ createFolder: false, copyTemplates: true }))
        .catch((caught) => caught);

      expect(error).toBeInstanceOf(CopyTemplatesWithoutFolderError);
      expect(error.details).toEqual({
        copyTemplates: 'Para copiar los modelos primero hay que crear la carpeta de la causa.',
      });
      expect(cases.sacNumbersChecked).toEqual([]);
      expect(cases.saved).toHaveLength(0);
    });

    it.each([
      { sent: undefined, requested: true }, // CA-40.1: viene marcada por defecto
      { sent: true, requested: true },
      { sent: false, requested: false }, // CA-40.4: desmarcada, carpeta vacía
    ])('con copyTemplates=$sent pide a documents copyTemplates=$requested', async ({ sent, requested }) => {
      const { useCase, events } = build();

      await useCase.execute(aRegisterCaseCommand({ copyTemplates: sent }));

      expect((events.published[0] as CaseRegisteredEvent).copyTemplates).toBe(requested);
    });

    it('devuelve en la carpeta los modelos que documents informó copiados (CA-40.2)', async () => {
      const { useCase, events, folderState, outcomes } = build();
      events.onPublish = async ({ caseId }) => {
        await folderState.markCreated(caseId, 'drive-folder-1');
        outcomes.notify(caseId, 'CREATED');
        folderState.setTemplates(caseId, 6, 0);
        outcomes.notify(caseId, 'COPIED');
      };

      const result = await useCase.execute(aRegisterCaseCommand());

      expect(result.folder).toMatchObject({ status: 'CREATED', templatesCopied: 6, templatesPending: 0 });
    });

    it('si la carpeta tarda más que el límite, la causa se registra igual y la carpeta sale CREATING', async () => {
      const { useCase, events, cases } = build({ waitMs: 10 });
      events.onPublish = null; // `documents` does not answer in time.

      const result = await useCase.execute(aRegisterCaseCommand());

      expect(cases.saved).toHaveLength(1);
      expect(result.folder?.status).toBe('CREATING');
    });

    it('si la carpeta falla, la causa se registra igual y la carpeta sale ERROR (CA-39.5)', async () => {
      const { useCase, events, folderState, outcomes, cases } = build();
      events.onPublish = async ({ caseId }) => {
        await folderState.markFailed(caseId);
        outcomes.notify(caseId, 'ERROR');
      };

      const result = await useCase.execute(aRegisterCaseCommand());

      expect(cases.saved).toHaveLength(1);
      expect(result.folder?.status).toBe('ERROR');
    });

    it('si pedir la carpeta explota, la causa se registra igual', async () => {
      const { useCase, requestCaseFolder, cases } = build();
      jest.spyOn(requestCaseFolder, 'execute').mockRejectedValue(new Error('boom'));

      const result = await useCase.execute(aRegisterCaseCommand());

      expect(cases.saved).toHaveLength(1);
      expect(result.folder?.status).toBe('PENDING');
    });
  });
});
