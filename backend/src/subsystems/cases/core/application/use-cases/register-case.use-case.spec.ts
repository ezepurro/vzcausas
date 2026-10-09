import { CaseSacAlreadyExistsError } from '../../domain/errors/case.errors';
import { AdministrativeCase } from '../../domain/entities/administrative';
import { Amparo } from '../../domain/entities/amparo';
import { CriminalCase } from '../../domain/entities/criminal';
import { ProceduralStateRef } from '../../domain/ports/legal-parameters-lookup.port';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../domain/value-objects/procedural-role';
import {
  FakeCaseRepository,
  FakeClock,
  FakeLegalParametersLookup,
  FakePeopleLookup,
} from '../../test-support/case-fakes';
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
} from '../../test-support/case-fixtures';
import { RegisterCaseCommand } from '../common/register-case.interfaces';
import { RegisterCase } from './register-case.use-case';

/**
 * Specs of the use case in isolation: every port is an in-memory fake, so
 * nothing touches a database, HTTP or another subsystem.
 */
describe('RegisterCase', () => {
  function build(options: { withoutInitialState?: JurisdictionCode } = {}) {
    const initialStates: Partial<Record<JurisdictionCode, ProceduralStateRef>> = { ...INITIAL_STATES };
    if (options.withoutInitialState) {
      delete initialStates[options.withoutInitialState];
    }
    const cases = new FakeCaseRepository(Object.values(INITIAL_STATES));
    const people = new FakePeopleLookup([LAWYER], [CLIENT]);
    const legalParameters = new FakeLegalParametersLookup(initialStates, [ROBBERY, HOMICIDE]);
    const useCase = new RegisterCase(cases, people, legalParameters, new FakeClock(NOW, TODAY));
    return { useCase, cases };
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

  describe('alta exitosa (CA-18.1)', () => {
    it('registra una causa penal y la deja guardada con su id', async () => {
      const { useCase, cases } = build();

      const result = await useCase.execute(aRegisterCaseCommand());

      expect(result.newCase).toBeInstanceOf(CriminalCase);
      expect(result.newCase.id).toBe(1);
      expect(cases.saved).toEqual([result.newCase]);
      expect(await cases.findById(1)).toBe(result.newCase);
    });

    it('registra una causa administrativa', async () => {
      const { useCase, cases } = build();

      const result = await useCase.execute(administrativeCommand());

      expect(result.newCase).toBeInstanceOf(AdministrativeCase);
      expect(cases.saved).toHaveLength(1);
    });

    it('registra un amparo', async () => {
      const { useCase, cases } = build();

      const result = await useCase.execute(amparoCommand());

      expect(result.newCase).toBeInstanceOf(Amparo);
      expect(cases.saved).toHaveLength(1);
    });

    it('guarda los datos de la causa y quién la dio de alta', async () => {
      const { useCase } = build();

      const { newCase } = await useCase.execute(
        aRegisterCaseCommand({
          createdByUserId: 8,
          court: 'Juzgado de Control N° 3',
          instructorName: 'Dra. Verónica Ledesma',
          tribunalPhone: '0351 448-1200',
          instructorExtension: '214',
        }),
      );

      expect(newCase.caption).toBe('GÓMEZ, Ariel Fernando p.s.a. Robo calificado');
      expect(newCase.sacNumber).toBe('12345678');
      expect(newCase.court).toBe('Juzgado de Control N° 3');
      expect(newCase.instructor).toEqual({ name: 'Dra. Verónica Ledesma', phone: '0351 448-1200', extension: '214' });
      expect(newCase.proceduralRole).toBe(ProceduralRole.DEFENSA);
      expect(newCase.startDate).toEqual(day('2026-09-01'));
      expect(newCase.createdByUserId).toBe(8);
      expect(newCase.createdAt).toEqual(NOW);
      expect(newCase.active).toBe(true);
    });

    it('devuelve el cliente y el abogado responsable de la causa', async () => {
      const { useCase } = build();

      const result = await useCase.execute(aRegisterCaseCommand());

      expect(result.client).toEqual(CLIENT);
      expect(result.responsibleLawyer).toEqual(LAWYER);
      expect(result.newCase.clientId).toBe(CLIENT.id);
    });

    it('una causa administrativa o de amparo no devuelve hechos', async () => {
      const { useCase } = build();

      const administrative = await useCase.execute(administrativeCommand());
      const amparo = await useCase.execute(amparoCommand());

      expect(administrative.offenses).toEqual([]);
      expect(amparo.offenses).toEqual([]);
    });

    it('asigna un id distinto a cada causa', async () => {
      const { useCase } = build();

      const first = await useCase.execute(aRegisterCaseCommand({ sacNumber: '11111111' }));
      const second = await useCase.execute(aRegisterCaseCommand({ sacNumber: '22222222' }));

      expect([first.newCase.id, second.newCase.id]).toEqual([1, 2]);
    });
  });

  describe('abogado responsable (CA-18.8)', () => {
    it('la causa queda con el abogado responsable que se eligió', async () => {
      const { useCase } = build();

      const { newCase } = await useCase.execute(aRegisterCaseCommand({ responsibleLawyerId: LAWYER.id }));

      expect(newCase.responsibleLawyerId).toBe(LAWYER.id);
    });

    it('no se registra sin un abogado responsable vigente', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ responsibleLawyerId: 99 })));

      expect(details).toEqual({ responsibleLawyerId: 'No existe un abogado vigente con ese identificador.' });
      expect(cases.saved).toEqual([]);
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
      expect(currentState).toEqual(INITIAL_STATES[jurisdiction]);
    });

    it('el estado actual del resultado es el que se lee de la base, "Iniciada"', async () => {
      const { useCase } = build();

      const { currentState } = await useCase.execute(aRegisterCaseCommand());

      expect(currentState.name).toBe('Iniciada');
      expect(currentState.isInitial).toBe(true);
    });

    it('no tiene acto procesal vigente, ni estado escrito a mano, ni movimientos', async () => {
      const { useCase } = build();

      const { newCase } = await useCase.execute(aRegisterCaseCommand());

      expect(newCase.currentProceduralActId).toBeNull();
      expect(newCase.currentCustomState).toBeNull();
      expect(newCase.proceduralActs).toEqual([]);
    });

    it('un fuero sin estado inicial no admite causas: error sobre el fuero y nada guardado', async () => {
      const { useCase, cases } = build({ withoutInitialState: JurisdictionCode.CRIMINAL });

      const details = await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand()));

      expect(details).toEqual({ jurisdiction: 'No existe un fuero con estado inicial.' });
      expect(cases.saved).toEqual([]);
    });
  });

  describe('cómputo de la prescripción (CA-18.6)', () => {
    const robberyOn = (offenseDate: string) => ({ legalQualificationId: ROBBERY.id, offenseDate: day(offenseDate) });
    const homicideOn = (offenseDate: string) => ({ legalQualificationId: HOMICIDE.id, offenseDate: day(offenseDate) });

    it('calcula el vencimiento como fecha del hecho más los meses de la calificación', async () => {
      const { useCase } = build();

      const { offenses } = await useCase.execute(
        aRegisterCaseCommand({ legalQualifications: [robberyOn('2021-02-27'), homicideOn('2022-05-01')] }),
      );

      expect(offenses.map((offense) => offense.prescriptionExpiresOn)).toEqual([day('2029-02-27'), day('2037-05-01')]);
    });

    it('cada hecho conserva su calificación, su fecha y su prescripción', async () => {
      const { useCase } = build();

      const { offenses } = await useCase.execute(aRegisterCaseCommand({ legalQualifications: [robberyOn('2021-02-27')] }));

      expect(offenses).toHaveLength(1);
      expect(offenses[0].legalQualificationId).toBe(ROBBERY.id);
      expect(offenses[0].legalQualificationName).toBe('Robo calificado');
      expect(offenses[0].prescriptionMonths).toBe(96);
      expect(offenses[0].offenseDate).toEqual(day('2021-02-27'));
      expect(offenses[0].prescriptionStartsOn).toEqual(day('2021-02-27'));
    });

    it('la prescripción ya está calculada en el momento de guardar, no después', async () => {
      const { useCase, cases } = build();

      await useCase.execute(aRegisterCaseCommand({ legalQualifications: [robberyOn('2021-02-27'), homicideOn('2022-05-01')] }));

      expect(cases.prescriptionsWhenSaved).toEqual([day('2029-02-27'), day('2037-05-01')]);
    });

    it('la fecha de inicio de la causa no interviene en el cómputo', async () => {
      const { useCase } = build();

      const early = await useCase.execute(
        aRegisterCaseCommand({
          sacNumber: '11111111',
          startDate: day('2021-03-01'),
          legalQualifications: [robberyOn('2021-02-27')],
        }),
      );
      const late = await useCase.execute(
        aRegisterCaseCommand({
          sacNumber: '22222222',
          startDate: day('2026-10-01'),
          legalQualifications: [robberyOn('2021-02-27')],
        }),
      );

      expect(early.offenses[0].prescriptionExpiresOn).toEqual(late.offenses[0].prescriptionExpiresOn);
    });

    it('una causa penal sin calificaciones se registra y no computa prescripción', async () => {
      const { useCase, cases } = build();

      const result = await useCase.execute(aRegisterCaseCommand({ legalQualifications: [] }));

      expect(result.offenses).toEqual([]);
      expect(cases.prescriptionsWhenSaved).toEqual([]);
      expect(cases.saved).toHaveLength(1);
    });

    it('una causa penal sin el campo de calificaciones también se registra', async () => {
      const { useCase } = build();

      const result = await useCase.execute(aRegisterCaseCommand({ legalQualifications: undefined }));

      expect(result.offenses).toEqual([]);
    });
  });

  describe('calificaciones inválidas (CA-18.5)', () => {
    it('rechaza una calificación sin fecha del hecho', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(aRegisterCaseCommand({ legalQualifications: [{ legalQualificationId: ROBBERY.id }] })),
      );

      expect(details).toEqual({ legalQualifications: 'Cada calificación legal requiere la fecha del hecho.' });
      expect(cases.saved).toEqual([]);
    });

    it('rechaza una fecha del hecho posterior a hoy', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(
          aRegisterCaseCommand({ legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2026-10-07') }] }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'La fecha del hecho no puede ser posterior a hoy.' });
      expect(cases.saved).toEqual([]);
    });

    it('rechaza una calificación repetida', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(
          aRegisterCaseCommand({
            legalQualifications: [
              { legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') },
              { legalQualificationId: ROBBERY.id, offenseDate: day('2022-02-27') },
            ],
          }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'No puede haber calificaciones legales repetidas.' });
      expect(cases.saved).toEqual([]);
    });

    it('rechaza calificaciones en un fuero que no es el penal', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(
          amparoCommand({ legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') }] }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'Solo corresponden al fuero penal.' });
      expect(cases.saved).toEqual([]);
    });
  });

  describe('datos inexistentes o dados de baja (CA-18.9)', () => {
    it('informa el cliente inexistente sobre el campo clientId', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ clientId: 99 })));

      expect(details).toEqual({ clientId: 'No existe un cliente vigente con ese identificador.' });
      expect(cases.saved).toEqual([]);
    });

    it('informa la calificación legal inexistente o dada de baja sobre legalQualifications', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(
          aRegisterCaseCommand({ legalQualifications: [{ legalQualificationId: 99, offenseDate: day('2021-02-27') }] }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'Alguna calificación legal no existe o está dada de baja.' });
      expect(cases.saved).toEqual([]);
    });

    it('si una de varias calificaciones no existe, rechaza el alta', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(
          aRegisterCaseCommand({
            legalQualifications: [
              { legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') },
              { legalQualificationId: 99, offenseDate: day('2021-02-27') },
            ],
          }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'Alguna calificación legal no existe o está dada de baja.' });
      expect(cases.saved).toEqual([]);
    });

    it('informa todos los datos inexistentes juntos, cada uno sobre su campo', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(
          aRegisterCaseCommand({
            clientId: 98,
            responsibleLawyerId: 99,
            legalQualifications: [{ legalQualificationId: 97, offenseDate: day('2021-02-27') }],
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

    it('suma los datos inexistentes a los errores de validación del formulario', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(aRegisterCaseCommand({ clientId: 99, caption: '', sacNumber: '123' })),
      );

      expect(details).toEqual({
        clientId: 'No existe un cliente vigente con ese identificador.',
        caption: 'Es obligatoria.',
        sacNumber: 'Debe contener exactamente 8 dígitos.',
      });
    });

    it('si falta el estado inicial del fuero informa también los demás datos inexistentes', async () => {
      const { useCase } = build({ withoutInitialState: JurisdictionCode.CRIMINAL });

      const details = await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ clientId: 99 })));

      expect(details).toEqual({
        clientId: 'No existe un cliente vigente con ese identificador.',
        jurisdiction: 'No existe un fuero con estado inicial.',
      });
    });
  });

  describe('datos inválidos', () => {
    it('rechaza un rol procesal que no corresponde al fuero (CA-18.3)', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(aRegisterCaseCommand({ proceduralRole: ProceduralRole.ACTORA })),
      );

      expect(details).toEqual({ proceduralRole: 'El rol procesal no corresponde al fuero.' });
      expect(cases.saved).toEqual([]);
    });

    it('rechaza una carátula vacía', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ caption: '   ' })));

      expect(details).toEqual({ caption: 'Es obligatoria.' });
      expect(cases.saved).toEqual([]);
    });

    it('rechaza un amparo sin objeto del reclamo (CA-18.4)', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() => useCase.execute(amparoCommand({ subjectMatter: undefined })));

      expect(details).toEqual({ subjectMatter: 'Es obligatorio en los fueros administrativo y de amparo.' });
      expect(cases.saved).toEqual([]);
    });

    it('rechaza contraparte y objeto en una causa penal (CA-18.4)', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(aRegisterCaseCommand({ counterparty: 'APROSS', subjectMatter: 'Un objeto' })),
      );

      expect(details).toEqual({
        counterparty: 'No se informa en el fuero penal.',
        subjectMatter: 'No se informa en el fuero penal.',
      });
      expect(cases.saved).toEqual([]);
    });

    it('rechaza varios datos inválidos a la vez, cada uno sobre su campo', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(aRegisterCaseCommand({ caption: '', proceduralRole: ProceduralRole.DEMANDADA, sacNumber: 'abc' })),
      );

      expect(details).toEqual({
        caption: 'Es obligatoria.',
        proceduralRole: 'El rol procesal no corresponde al fuero.',
        sacNumber: 'Debe contener exactamente 8 dígitos.',
      });
    });
  });

  describe('número de SAC y fecha de inicio (CA-18.2)', () => {
    it('rechaza un SAC que no tiene 8 dígitos', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ sacNumber: '1234567' })));

      expect(details).toEqual({ sacNumber: 'Debe contener exactamente 8 dígitos.' });
      expect(cases.saved).toEqual([]);
    });

    it('con SAC, la fecha de inicio es obligatoria', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ startDate: undefined })));

      expect(details).toEqual({ startDate: 'Es obligatoria cuando se informa el número de SAC.' });
      expect(cases.saved).toEqual([]);
    });

    it('sin SAC, la causa se registra igual y la fecha de inicio no se informa', async () => {
      const { useCase, cases } = build();

      const { newCase } = await useCase.execute(aRegisterCaseCommand({ sacNumber: undefined, startDate: undefined }));

      expect(newCase.sacNumber).toBeNull();
      expect(cases.saved).toHaveLength(1);
    });

    it('sin SAC, rechaza una fecha de inicio informada', async () => {
      const { useCase, cases } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(aRegisterCaseCommand({ sacNumber: undefined, startDate: day('2026-09-01') })),
      );

      expect(details).toEqual({ startDate: 'No se informa si la causa no tiene número de SAC.' });
      expect(cases.saved).toEqual([]);
    });

    it('rechaza una fecha de inicio posterior a hoy', async () => {
      const { useCase } = build();

      const details = await validationDetailsOf(() =>
        useCase.execute(aRegisterCaseCommand({ startDate: day('2026-10-07') })),
      );

      expect(details).toEqual({ startDate: 'No puede ser posterior a la fecha de hoy.' });
    });

    it('rechaza un SAC que ya existe en el sistema (RN2)', async () => {
      const { useCase, cases } = build();
      cases.takenSacNumbers.add('12345678');

      await expect(useCase.execute(aRegisterCaseCommand({ sacNumber: '12345678' }))).rejects.toBeInstanceOf(
        CaseSacAlreadyExistsError,
      );
      expect(cases.saved).toEqual([]);
    });

    it('un SAC repetido responde con el código CASE_SAC_ALREADY_EXISTS', async () => {
      const { useCase, cases } = build();
      cases.takenSacNumbers.add('12345678');

      await expect(useCase.execute(aRegisterCaseCommand())).rejects.toMatchObject({
        code: 'CASE_SAC_ALREADY_EXISTS',
      });
    });

    it('consulta la unicidad del SAC que se informó', async () => {
      const { useCase, cases } = build();

      await useCase.execute(aRegisterCaseCommand({ sacNumber: '12345678' }));

      expect(cases.sacNumbersChecked).toEqual(['12345678']);
    });

    it('sin SAC no consulta la unicidad', async () => {
      const { useCase, cases } = build();

      await useCase.execute(aRegisterCaseCommand({ sacNumber: undefined, startDate: undefined }));

      expect(cases.sacNumbersChecked).toEqual([]);
    });

    it('primero valida los datos y recién después consulta la unicidad del SAC', async () => {
      const { useCase, cases } = build();
      cases.takenSacNumbers.add('12345678');

      await validationDetailsOf(() => useCase.execute(aRegisterCaseCommand({ caption: '' })));

      expect(cases.sacNumbersChecked).toEqual([]);
    });
  });

  describe('fallas de la persistencia', () => {
    it('si no se puede guardar, el error llega sin cambios', async () => {
      const { useCase, cases } = build();
      const failure = new Error('connection lost');
      cases.failOnSaveWith = failure;

      await expect(useCase.execute(aRegisterCaseCommand())).rejects.toBe(failure);
    });
  });
});
