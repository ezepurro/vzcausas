import { AdministrativeCase } from '../entities/case/administrative-case.entity';
import { Amparo } from '../entities/case/amparo.entity';
import { CriminalCase } from '../entities/case/criminal-case.entity';
import { DayType } from '../value-objects/deadline/day-type';
import { JurisdictionCode } from '../value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../value-objects/case/procedural-role';
import {
  aNewCaseInput,
  day,
  HOMICIDE,
  INITIAL_STATES,
  NOW,
  ROBBERY,
  TODAY,
  validationDetailsOf,
} from '../../test-support/case-fixtures';
import { CaseFactory, NewCaseInput } from './case.factory';

/** Input of a valid administrative case: it needs a subject matter and a role of its jurisdiction. */
function anAdministrativeInput(overrides: Partial<NewCaseInput> = {}) {
  return aNewCaseInput({
    jurisdictionCode: JurisdictionCode.ADMINISTRATIVE,
    proceduralRole: ProceduralRole.RECURRENTE,
    subjectMatter: 'Se impugna la resolución que deniega la cobertura.',
    ...overrides,
  });
}

/** Input of a valid amparo: it needs a subject matter and a role of its jurisdiction. */
function anAmparoInput(overrides: Partial<NewCaseInput> = {}) {
  return aNewCaseInput({
    jurisdictionCode: JurisdictionCode.AMPARO,
    proceduralRole: ProceduralRole.ACTORA,
    subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
    ...overrides,
  });
}

describe('CaseFactory', () => {
  describe('qué causa construye', () => {
    it('arma una causa penal para el fuero penal', () => {
      const newCase = CaseFactory.create(aNewCaseInput());

      expect(newCase).toBeInstanceOf(CriminalCase);
      expect(newCase.jurisdictionCode).toBe(JurisdictionCode.CRIMINAL);
    });

    it('arma una causa administrativa para el fuero administrativo', () => {
      const newCase = CaseFactory.create(anAdministrativeInput());

      expect(newCase).toBeInstanceOf(AdministrativeCase);
      expect(newCase.jurisdictionCode).toBe(JurisdictionCode.ADMINISTRATIVE);
    });

    it('arma un amparo para el fuero de amparo', () => {
      const newCase = CaseFactory.create(anAmparoInput());

      expect(newCase).toBeInstanceOf(Amparo);
      expect(newCase.jurisdictionCode).toBe(JurisdictionCode.AMPARO);
    });
  });

  describe('estado inicial y datos de alta (CA-18.1, CA-18.7, CA-18.8)', () => {
    it('nace en el estado inicial de su fuero, sin acto procesal ni estado escrito a mano', () => {
      const newCase = CaseFactory.create(aNewCaseInput());

      expect(newCase.currentStateId).toBe(INITIAL_STATES.CRIMINAL.id);
      expect(newCase.currentCustomState).toBeNull();
      expect(newCase.currentProceduralActId).toBeNull();
      expect(newCase.proceduralActs).toEqual([]);
    });

    it('toma el fuero del estado inicial que recibe', () => {
      const newCase = CaseFactory.create(anAmparoInput());

      expect(newCase.jurisdictionId).toBe(INITIAL_STATES.AMPARO.jurisdictionId);
      expect(newCase.currentStateId).toBe(INITIAL_STATES.AMPARO.id);
    });

    it('queda vigente, con su abogado responsable, su cliente y quien la dio de alta', () => {
      const newCase = CaseFactory.create(aNewCaseInput({ clientId: 7, responsibleLawyerId: 9, createdByUserId: 4 }));

      expect(newCase.active).toBe(true);
      expect(newCase.clientId).toBe(7);
      expect(newCase.responsibleLawyerId).toBe(9);
      expect(newCase.createdByUserId).toBe(4);
      expect(newCase.createdAt).toEqual(NOW);
      expect(newCase.updatedAt).toEqual(NOW);
    });

    it('guarda el rol procesal, la carátula y el instructor', () => {
      const newCase = CaseFactory.create(
        aNewCaseInput({
          court: 'Juzgado de Control N° 3',
          instructorName: 'Dra. Verónica Ledesma',
          tribunalPhone: '0351 448-1200',
          instructorExtension: '214',
        }),
      );

      expect(newCase.proceduralRole).toBe(ProceduralRole.DEFENSA);
      expect(newCase.caption).toBe('GÓMEZ, Ariel Fernando p.s.a. Robo calificado');
      expect(newCase.court).toBe('Juzgado de Control N° 3');
      expect(newCase.instructor).toEqual({ name: 'Dra. Verónica Ledesma', phone: '0351 448-1200', extension: '214' });
    });

    it('quita los espacios de los textos y trata el texto en blanco como ausente', () => {
      const newCase = CaseFactory.create(
        aNewCaseInput({ caption: '  GÓMEZ p.s.a. Robo  ', court: '   ', instructorName: '', tribunalPhone: '  ' }),
      );

      expect(newCase.caption).toBe('GÓMEZ p.s.a. Robo');
      expect(newCase.court).toBeNull();
      expect(newCase.instructor).toEqual({ name: null, phone: null, extension: null });
    });
  });

  describe('número de SAC y fecha de inicio (CA-18.2)', () => {
    it('acepta un SAC de exactamente 8 dígitos', async () => {
      const newCase = CaseFactory.create(aNewCaseInput({ sacNumber: '00012345' }));

      expect(newCase.sacNumber).toBe('00012345');
    });

    it.each(['1234567', '123456789', '1234567a', '12 34 56'])('rechaza el SAC "%s"', async (sacNumber) => {
      const details = await validationDetailsOf(() => CaseFactory.create(aNewCaseInput({ sacNumber })));

      expect(details).toEqual({ sacNumber: 'Debe contener exactamente 8 dígitos.' });
    });

    it('con SAC, la fecha de inicio es obligatoria', async () => {
      const details = await validationDetailsOf(() => CaseFactory.create(aNewCaseInput({ startDate: undefined })));

      expect(details).toEqual({ startDate: 'Es obligatoria cuando se informa el número de SAC.' });
    });

    it('con SAC, la fecha de inicio es obligatoria aunque llegue nula', async () => {
      const details = await validationDetailsOf(() => CaseFactory.create(aNewCaseInput({ startDate: null })));

      expect(details).toEqual({ startDate: 'Es obligatoria cuando se informa el número de SAC.' });
    });

    it('con SAC, guarda la fecha de inicio que recibe', () => {
      const newCase = CaseFactory.create(aNewCaseInput({ startDate: day('2021-03-12') }));

      expect(newCase.startDate).toEqual(day('2021-03-12'));
    });

    it('sin SAC, la causa se registra sin fecha de inicio', () => {
      const newCase = CaseFactory.create(aNewCaseInput({ sacNumber: null, startDate: undefined }));

      expect(newCase.sacNumber).toBeNull();
    });

    it('sin SAC, un SAC en blanco cuenta como no informado', () => {
      const newCase = CaseFactory.create(aNewCaseInput({ sacNumber: '   ', startDate: undefined }));

      expect(newCase.sacNumber).toBeNull();
    });

    it('sin SAC, la fecha de inicio no se informa', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ sacNumber: null, startDate: day('2026-09-01') })),
      );

      expect(details).toEqual({ startDate: 'No se informa si la causa no tiene número de SAC.' });
    });

    it('sin SAC, la fecha de inicio queda vacía: no se inventa una', () => {
      const newCase = CaseFactory.create(aNewCaseInput({ sacNumber: null, startDate: undefined }));

      expect(newCase.startDate).toBeNull();
    });

    it('rechaza una fecha de inicio posterior a hoy', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ startDate: day('2026-10-07') })),
      );

      expect(details).toEqual({ startDate: 'No puede ser posterior a la fecha de hoy.' });
    });

    it('acepta una fecha de inicio igual a hoy', () => {
      const newCase = CaseFactory.create(aNewCaseInput({ startDate: TODAY }));

      expect(newCase.startDate).toEqual(TODAY);
    });

    it('rechaza una fecha de inicio inválida', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ startDate: new Date('no es una fecha') })),
      );

      expect(details).toEqual({ startDate: 'Debe ser una fecha válida (AAAA-MM-DD).' });
    });
  });

  describe('carátula y largos máximos', () => {
    it.each([undefined, '', '   '])('la carátula es obligatoria: %p', async (caption) => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ caption: caption as unknown as string })),
      );

      expect(details).toEqual({ caption: 'Es obligatoria.' });
    });

    it('acepta textos justo en el máximo', () => {
      expect(() =>
        CaseFactory.create(
          aNewCaseInput({
            caption: 'a'.repeat(255),
            court: 'a'.repeat(255),
            instructorName: 'a'.repeat(150),
            tribunalPhone: '1'.repeat(50),
            instructorExtension: '1'.repeat(20),
          }),
        ),
      ).not.toThrow();
    });

    it('rechaza los textos que pasan el máximo, con el máximo de cada campo', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          aNewCaseInput({
            caption: 'a'.repeat(256),
            court: 'a'.repeat(256),
            instructorName: 'a'.repeat(151),
            tribunalPhone: '1'.repeat(51),
            instructorExtension: '1'.repeat(21),
          }),
        ),
      );

      expect(details).toEqual({
        caption: 'Debe tener como máximo 255 caracteres.',
        court: 'Debe tener como máximo 255 caracteres.',
        instructorName: 'Debe tener como máximo 150 caracteres.',
        tribunalPhone: 'Debe tener como máximo 50 caracteres.',
        instructorExtension: 'Debe tener como máximo 20 caracteres.',
      });
    });

    it('rechaza una contraparte de más de 255 caracteres y un objeto de más de 800', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(anAmparoInput({ counterparty: 'a'.repeat(256), subjectMatter: 'a'.repeat(801) })),
      );

      expect(details).toEqual({
        counterparty: 'Debe tener como máximo 255 caracteres.',
        subjectMatter: 'Debe tener como máximo 800 caracteres.',
      });
    });

    it('acepta un objeto de exactamente 800 caracteres', () => {
      expect(() => CaseFactory.create(anAmparoInput({ subjectMatter: 'a'.repeat(800) }))).not.toThrow();
    });
  });

  describe('rol procesal según el fuero (CA-18.3)', () => {
    it('acepta Defensa y Querellante particular en el fuero penal', () => {
      expect(() => CaseFactory.create(aNewCaseInput({ proceduralRole: ProceduralRole.DEFENSA }))).not.toThrow();
      expect(() =>
        CaseFactory.create(aNewCaseInput({ proceduralRole: ProceduralRole.QUERELLANTE_PARTICULAR })),
      ).not.toThrow();
    });

    it('acepta Defensa y Recurrente en el fuero administrativo', () => {
      expect(() =>
        CaseFactory.create(anAdministrativeInput({ proceduralRole: ProceduralRole.DEFENSA })),
      ).not.toThrow();
      expect(() =>
        CaseFactory.create(anAdministrativeInput({ proceduralRole: ProceduralRole.RECURRENTE })),
      ).not.toThrow();
    });

    it('acepta Actora y Demandada en amparo', () => {
      expect(() => CaseFactory.create(anAmparoInput({ proceduralRole: ProceduralRole.ACTORA }))).not.toThrow();
      expect(() => CaseFactory.create(anAmparoInput({ proceduralRole: ProceduralRole.DEMANDADA }))).not.toThrow();
    });

    it.each([
      [JurisdictionCode.CRIMINAL, ProceduralRole.ACTORA],
      [JurisdictionCode.CRIMINAL, ProceduralRole.RECURRENTE],
      [JurisdictionCode.ADMINISTRATIVE, ProceduralRole.QUERELLANTE_PARTICULAR],
      [JurisdictionCode.ADMINISTRATIVE, ProceduralRole.DEMANDADA],
      [JurisdictionCode.AMPARO, ProceduralRole.DEFENSA],
      [JurisdictionCode.AMPARO, ProceduralRole.RECURRENTE],
    ])('en el fuero %s rechaza el rol %s', async (jurisdictionCode, proceduralRole) => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          aNewCaseInput({
            jurisdictionCode,
            proceduralRole,
            // The penal jurisdiction takes no subject matter; the others require it.
            subjectMatter: jurisdictionCode === JurisdictionCode.CRIMINAL ? undefined : 'Un objeto.',
          }),
        ),
      );

      expect(details).toEqual({ proceduralRole: 'El rol procesal no corresponde al fuero.' });
    });
  });

  describe('campos propios de cada fuero (CA-18.4)', () => {
    it('en administrativo guarda la contraparte y el objeto', () => {
      const newCase = CaseFactory.create(anAdministrativeInput({ counterparty: 'APROSS' })) as AdministrativeCase;

      expect(newCase.counterparty).toBe('APROSS');
      expect(newCase.subjectMatter).toBe('Se impugna la resolución que deniega la cobertura.');
    });

    it('en amparo guarda la contraparte y el objeto', () => {
      const newCase = CaseFactory.create(anAmparoInput({ counterparty: 'APROSS' })) as Amparo;

      expect(newCase.counterparty).toBe('APROSS');
      expect(newCase.subjectMatter).toBe('Que se ordene la cobertura integral del tratamiento.');
    });

    it('en administrativo y amparo la contraparte es opcional', () => {
      const administrative = CaseFactory.create(anAdministrativeInput()) as AdministrativeCase;
      const amparo = CaseFactory.create(anAmparoInput()) as Amparo;

      expect(administrative.counterparty).toBeNull();
      expect(amparo.counterparty).toBeNull();
    });

    it.each([JurisdictionCode.ADMINISTRATIVE, JurisdictionCode.AMPARO])(
      'en el fuero %s el objeto es obligatorio',
      async (jurisdictionCode) => {
        const role = jurisdictionCode === JurisdictionCode.AMPARO ? ProceduralRole.ACTORA : ProceduralRole.RECURRENTE;

        const details = await validationDetailsOf(() =>
          CaseFactory.create(aNewCaseInput({ jurisdictionCode, proceduralRole: role, subjectMatter: undefined })),
        );

        expect(details).toEqual({ subjectMatter: 'Es obligatorio en los fueros administrativo y de amparo.' });
      },
    );

    it('un objeto en blanco cuenta como faltante', async () => {
      const details = await validationDetailsOf(() => CaseFactory.create(anAmparoInput({ subjectMatter: '   ' })));

      expect(details).toEqual({ subjectMatter: 'Es obligatorio en los fueros administrativo y de amparo.' });
    });

    it('en el fuero penal no se cargan la contraparte ni el objeto', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ counterparty: 'APROSS', subjectMatter: 'Un objeto' })),
      );

      expect(details).toEqual({
        counterparty: 'No se informa en el fuero penal.',
        subjectMatter: 'No se informa en el fuero penal.',
      });
    });

    it('en administrativo y amparo no se cargan calificaciones legales', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          anAmparoInput({
            legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') }],
            legalQualificationRefs: [ROBBERY],
          }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'Solo corresponden al fuero penal.' });
    });
  });

  describe('datos propios de cada fuero (D-67)', () => {
    const acto = {
      harmfulActDate: day('2026-08-03'),
      harmfulActRenews: true,
      harmfulActRenewalDays: 30,
      harmfulActTermDays: 15,
      harmfulActTermDayType: DayType.BUSINESS,
    };

    describe('tasa de justicia (RN10)', () => {
      it.each([
        ['penal', () => aNewCaseInput()],
        ['administrativo', () => anAdministrativeInput()],
        ['amparo', () => anAmparoInput()],
      ])('en el fuero %s vale false si no se envía', (_fuero, input) => {
        expect(CaseFactory.create(input()).courtFeePaid).toBe(false);
      });

      it.each([
        ['penal', () => aNewCaseInput({ courtFeePaid: true })],
        ['administrativo', () => anAdministrativeInput({ courtFeePaid: true })],
        ['amparo', () => anAmparoInput({ courtFeePaid: true })],
      ])('en el fuero %s guarda lo que se envía', (_fuero, input) => {
        expect(CaseFactory.create(input()).courtFeePaid).toBe(true);
      });
    });

    describe('preso (solo penal)', () => {
      it('vale false si no se envía y guarda true si se envía', () => {
        expect((CaseFactory.create(aNewCaseInput()) as CriminalCase).clientDetained).toBe(false);
        expect((CaseFactory.create(aNewCaseInput({ clientDetained: true })) as CriminalCase).clientDetained).toBe(true);
      });

      it.each([
        ['administrativo', () => anAdministrativeInput({ clientDetained: false })],
        ['amparo', () => anAmparoInput({ clientDetained: true })],
      ])('en el fuero %s no se envía, ni siquiera en false', async (_fuero, input) => {
        const details = await validationDetailsOf(() => CaseFactory.create(input()));

        expect(details).toEqual({ clientDetained: 'Solo corresponde al fuero penal.' });
      });
    });

    describe('agotamiento de la vía administrativa (solo administrativo)', () => {
      it('es opcional y guarda la fecha que se envía', () => {
        const without = CaseFactory.create(anAdministrativeInput()) as AdministrativeCase;
        const withDate = CaseFactory.create(
          anAdministrativeInput({ administrativeRemedyExhaustedOn: day('2026-08-10') }),
        ) as AdministrativeCase;

        expect(without.administrativeRemedyExhaustedOn).toBeNull();
        expect(withDate.administrativeRemedyExhaustedOn).toEqual(day('2026-08-10'));
      });

      it('puede ser la de hoy, no una posterior', async () => {
        expect(() => CaseFactory.create(anAdministrativeInput({ administrativeRemedyExhaustedOn: TODAY }))).not.toThrow();

        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAdministrativeInput({ administrativeRemedyExhaustedOn: day('2026-10-07') })),
        );

        expect(details).toEqual({ administrativeRemedyExhaustedOn: 'No puede ser posterior a la fecha de hoy.' });
      });

      it('una fecha mal formada se informa por campo', async () => {
        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAdministrativeInput({ administrativeRemedyExhaustedOn: new Date('no-es-fecha') })),
        );

        expect(details).toEqual({ administrativeRemedyExhaustedOn: 'Debe ser una fecha válida (AAAA-MM-DD).' });
      });

      it.each([
        ['penal', () => aNewCaseInput({ administrativeRemedyExhaustedOn: day('2026-08-10') })],
        ['amparo', () => anAmparoInput({ administrativeRemedyExhaustedOn: day('2026-08-10') })],
      ])('en el fuero %s no se envía', async (_fuero, input) => {
        const details = await validationDetailsOf(() => CaseFactory.create(input()));

        expect(details).toEqual({ administrativeRemedyExhaustedOn: 'Solo corresponde al fuero administrativo.' });
      });
    });

    describe('medida cautelar y acto lesivo (solo amparo)', () => {
      it('sin enviar nada: la medida cautelar y la renovación valen false y no hay acto lesivo', () => {
        const amparo = CaseFactory.create(anAmparoInput()) as Amparo;

        expect(amparo).toMatchObject({
          injunctionGranted: false,
          harmfulActDate: null,
          harmfulActRenews: false,
          harmfulActRenewalDays: null,
          harmfulActTermDays: null,
          harmfulActTermDayType: null,
        });
        expect(amparo.harmfulAct).toBeNull();
      });

      it('guarda la medida cautelar y el acto lesivo completo', () => {
        const amparo = CaseFactory.create(anAmparoInput({ injunctionGranted: true, ...acto })) as Amparo;

        expect(amparo).toMatchObject({
          injunctionGranted: true,
          harmfulActDate: day('2026-08-03'),
          harmfulActRenews: true,
          harmfulActRenewalDays: 30,
          harmfulActTermDays: 15,
          harmfulActTermDayType: DayType.BUSINESS,
        });
        expect(amparo.harmfulAct).not.toBeNull();
      });

      it('un acto lesivo que no se renueva no lleva días de renovación', () => {
        const amparo = CaseFactory.create(
          anAmparoInput({ ...acto, harmfulActRenews: false, harmfulActRenewalDays: undefined }),
        ) as Amparo;

        expect(amparo).toMatchObject({ harmfulActRenews: false, harmfulActRenewalDays: null });
      });

      it('el plazo puede contarse en días corridos', () => {
        const amparo = CaseFactory.create(
          anAmparoInput({ ...acto, harmfulActTermDayType: DayType.CONSECUTIVE }),
        ) as Amparo;

        expect(amparo.harmfulActTermDayType).toBe(DayType.CONSECUTIVE);
      });

      it('con la fecha del acto lesivo, el plazo y su forma de contarlo son obligatorios', async () => {
        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAmparoInput({ harmfulActDate: day('2026-08-03') })),
        );

        expect(details).toEqual({
          harmfulActTermDays: 'Indicá el plazo para presentar el amparo.',
          harmfulActTermDayType: 'Indicá si el plazo se cuenta en días hábiles o corridos.',
        });
      });

      it('sin la fecha del acto lesivo no se envían el plazo ni su forma de contarlo', async () => {
        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAmparoInput({ harmfulActTermDays: 15, harmfulActTermDayType: DayType.BUSINESS })),
        );

        expect(details).toEqual({
          harmfulActTermDays: 'Solo se informa junto con la fecha del acto lesivo.',
          harmfulActTermDayType: 'Solo se informa junto con la fecha del acto lesivo.',
        });
      });

      it('si el acto lesivo se renueva, los días de renovación son obligatorios', async () => {
        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAmparoInput({ ...acto, harmfulActRenewalDays: undefined })),
        );

        expect(details).toEqual({ harmfulActRenewalDays: 'Indicá cada cuántos días se renueva el acto lesivo.' });
      });

      it('si no se renueva, no se envían los días de renovación', async () => {
        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAmparoInput({ ...acto, harmfulActRenews: false })),
        );

        expect(details).toEqual({ harmfulActRenewalDays: 'Solo se informa si el acto lesivo se renueva.' });
      });

      it.each([0, -3, 1.5])('los días de renovación y el plazo son enteros mayores o iguales a 1 (%s)', async (days) => {
        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAmparoInput({ ...acto, harmfulActRenewalDays: days, harmfulActTermDays: days })),
        );

        expect(details).toEqual({
          harmfulActRenewalDays: 'Debe ser un número entero mayor o igual a 1.',
          harmfulActTermDays: 'Debe ser un número entero mayor o igual a 1.',
        });
      });

      it('NONE no es una forma válida de contar el plazo', async () => {
        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAmparoInput({ ...acto, harmfulActTermDayType: DayType.NONE })),
        );

        expect(details).toEqual({ harmfulActTermDayType: 'Debe ser BUSINESS o CONSECUTIVE.' });
      });

      it('la fecha del acto lesivo puede ser la de hoy, no una posterior', async () => {
        expect(() => CaseFactory.create(anAmparoInput({ ...acto, harmfulActDate: TODAY }))).not.toThrow();

        const details = await validationDetailsOf(() =>
          CaseFactory.create(anAmparoInput({ ...acto, harmfulActDate: day('2026-10-07') })),
        );

        expect(details).toEqual({ harmfulActDate: 'No puede ser posterior a la fecha de hoy.' });
      });

      it('una renovación sin la fecha del acto lesivo se guarda, pero no hay plazo que calcular', () => {
        const amparo = CaseFactory.create(
          anAmparoInput({ harmfulActRenews: true, harmfulActRenewalDays: 30 }),
        ) as Amparo;

        expect(amparo).toMatchObject({ harmfulActRenews: true, harmfulActRenewalDays: 30 });
        expect(amparo.harmfulAct).toBeNull();
      });

      it.each([
        ['penal', () => aNewCaseInput({ injunctionGranted: false, ...acto })],
        ['administrativo', () => anAdministrativeInput({ injunctionGranted: false, ...acto })],
      ])('en el fuero %s ninguno de estos datos se envía', async (_fuero, input) => {
        const details = await validationDetailsOf(() => CaseFactory.create(input()));

        expect(details).toEqual({
          injunctionGranted: 'Solo corresponde al fuero de amparo.',
          harmfulActDate: 'Solo corresponde al fuero de amparo.',
          harmfulActRenews: 'Solo corresponde al fuero de amparo.',
          harmfulActRenewalDays: 'Solo corresponde al fuero de amparo.',
          harmfulActTermDays: 'Solo corresponde al fuero de amparo.',
          harmfulActTermDayType: 'Solo corresponde al fuero de amparo.',
        });
      });
    });

    it('varios datos inválidos se informan juntos, uno por campo (el ejemplo del contrato)', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          anAmparoInput({
            clientDetained: true,
            harmfulActDate: day('2026-08-03'),
            harmfulActRenews: true,
            harmfulActTermDayType: DayType.BUSINESS,
          }),
        ),
      );

      expect(details).toEqual({
        clientDetained: 'Solo corresponde al fuero penal.',
        harmfulActRenewalDays: 'Indicá cada cuántos días se renueva el acto lesivo.',
        harmfulActTermDays: 'Indicá el plazo para presentar el amparo.',
      });
    });
  });

  describe('calificaciones legales de una causa penal (CA-18.5)', () => {
    it('una causa penal puede registrarse sin calificaciones', () => {
      const newCase = CaseFactory.create(aNewCaseInput()) as CriminalCase;

      expect(newCase.offenses).toEqual([]);
    });

    it('cada calificación se convierte en un hecho con su fecha y su prescripción calculada', () => {
      const newCase = CaseFactory.create(
        aNewCaseInput({
          legalQualifications: [
            { legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') },
            { legalQualificationId: HOMICIDE.id, offenseDate: day('2022-05-01') },
          ],
          legalQualificationRefs: [ROBBERY, HOMICIDE],
        }),
      ) as CriminalCase;

      expect(newCase.offenses).toHaveLength(2);
      expect(newCase.offenses[0].legalQualificationId).toBe(ROBBERY.id);
      expect(newCase.offenses[0].offenseDate).toEqual(day('2021-02-27'));
      expect(newCase.offenses[0].prescriptionMonths).toBe(96);
      expect(newCase.offenses[0].prescriptionExpiresOn).toEqual(day('2029-02-27'));
      expect(newCase.offenses[1].legalQualificationId).toBe(HOMICIDE.id);
      expect(newCase.offenses[1].prescriptionExpiresOn).toEqual(day('2037-05-01'));
    });

    it('la fecha del hecho es obligatoria en cada calificación', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          aNewCaseInput({
            legalQualifications: [{ legalQualificationId: ROBBERY.id }],
            legalQualificationRefs: [ROBBERY],
          }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'Cada calificación legal requiere la fecha del hecho.' });
    });

    it('una fecha del hecho inválida cuenta como faltante', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          aNewCaseInput({
            legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: new Date('nada') }],
            legalQualificationRefs: [ROBBERY],
          }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'Cada calificación legal requiere la fecha del hecho.' });
    });

    it('la fecha del hecho no puede ser posterior a hoy', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          aNewCaseInput({
            legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2026-10-07') }],
            legalQualificationRefs: [ROBBERY],
          }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'La fecha del hecho no puede ser posterior a hoy.' });
    });

    it('la fecha del hecho de hoy es válida', () => {
      expect(() =>
        CaseFactory.create(
          aNewCaseInput({
            legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: TODAY }],
            legalQualificationRefs: [ROBBERY],
          }),
        ),
      ).not.toThrow();
    });

    it('una calificación no puede repetirse dentro de la causa', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          aNewCaseInput({
            legalQualifications: [
              { legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') },
              { legalQualificationId: ROBBERY.id, offenseDate: day('2022-01-10') },
            ],
            legalQualificationRefs: [ROBBERY],
          }),
        ),
      );

      expect(details).toEqual({ legalQualifications: 'No puede haber calificaciones legales repetidas.' });
    });
  });

  describe('errores juntos', () => {
    it('informa todos los campos inválidos en un único error, uno por campo', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(
          aNewCaseInput({
            sacNumber: '123',
            caption: '',
            proceduralRole: ProceduralRole.ACTORA,
            subjectMatter: 'Un objeto',
            startDate: day('2030-01-01'),
          }),
        ),
      );

      expect(details).toEqual({
        sacNumber: 'Debe contener exactamente 8 dígitos.',
        caption: 'Es obligatoria.',
        proceduralRole: 'El rol procesal no corresponde al fuero.',
        subjectMatter: 'No se informa en el fuero penal.',
        startDate: 'No puede ser posterior a la fecha de hoy.',
      });
    });

    it('suma los errores de referencia que recibe a los propios', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ caption: '' }), {
          clientId: 'No existe un cliente vigente con ese identificador.',
        }),
      );

      expect(details).toEqual({
        clientId: 'No existe un cliente vigente con ese identificador.',
        caption: 'Es obligatoria.',
      });
    });

    it('con un error de referencia y datos válidos igual rechaza', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput(), { responsibleLawyerId: 'No existe un abogado vigente.' }),
      );

      expect(details).toEqual({ responsibleLawyerId: 'No existe un abogado vigente.' });
    });

    it('no arma las calificaciones que el llamador ya informó como inexistentes', () => {
      expect(() =>
        CaseFactory.create(
          aNewCaseInput({
            legalQualifications: [{ legalQualificationId: 99, offenseDate: day('2021-02-27') }],
            legalQualificationRefs: [],
          }),
        ),
      ).not.toThrow();
    });
  });
});
