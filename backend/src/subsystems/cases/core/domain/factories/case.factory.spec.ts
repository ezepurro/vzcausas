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
  it('arma la causa de cada fuero, con el fuero del estado inicial que recibe', () => {
    const criminal = CaseFactory.create(aNewCaseInput());
    const administrative = CaseFactory.create(anAdministrativeInput());
    const amparo = CaseFactory.create(anAmparoInput());

    expect(criminal).toBeInstanceOf(CriminalCase);
    expect(administrative).toBeInstanceOf(AdministrativeCase);
    expect(amparo).toBeInstanceOf(Amparo);
    expect([criminal, administrative, amparo].map((newCase) => newCase.jurisdictionCode)).toEqual([
      JurisdictionCode.CRIMINAL,
      JurisdictionCode.ADMINISTRATIVE,
      JurisdictionCode.AMPARO,
    ]);
    expect(amparo.jurisdictionId).toBe(INITIAL_STATES.AMPARO.jurisdictionId);
    expect(amparo.currentStateId).toBe(INITIAL_STATES.AMPARO.id);
  });

  describe('estado inicial y datos de alta (CA-18.1, CA-18.7, CA-18.8)', () => {
    it('nace en el estado inicial de su fuero, sin acto procesal ni estado escrito a mano', () => {
      const newCase = CaseFactory.create(aNewCaseInput());

      expect(newCase.currentStateId).toBe(INITIAL_STATES.CRIMINAL.id);
      expect(newCase.currentCustomState).toBeNull();
      expect(newCase.currentProceduralActId).toBeNull();
      expect(newCase.proceduralActs).toEqual([]);
    });

    it('queda vigente con su responsable, su cliente, quien la dio de alta, su rol, su carátula y su instructor', () => {
      const newCase = CaseFactory.create(
        aNewCaseInput({
          clientId: 7,
          responsibleLawyerId: 9,
          createdByUserId: 4,
          court: 'Juzgado de Control N° 3',
          instructorName: 'Dra. Verónica Ledesma',
          tribunalPhone: '0351 448-1200',
          instructorExtension: '214',
        }),
      );

      expect(newCase).toMatchObject({
        active: true,
        clientId: 7,
        responsibleLawyerId: 9,
        createdByUserId: 4,
        createdAt: NOW,
        updatedAt: NOW,
        proceduralRole: ProceduralRole.DEFENSA,
        caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
        court: 'Juzgado de Control N° 3',
      });
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
    it('acepta un SAC de exactamente 8 dígitos y guarda la fecha de inicio que recibe', () => {
      const newCase = CaseFactory.create(aNewCaseInput({ sacNumber: '00012345', startDate: day('2021-03-12') }));

      expect(newCase.sacNumber).toBe('00012345');
      expect(newCase.startDate).toEqual(day('2021-03-12'));
    });

    it.each(['1234567', '123456789', '1234567a'])('rechaza el SAC "%s"', async (sacNumber) => {
      const details = await validationDetailsOf(() => CaseFactory.create(aNewCaseInput({ sacNumber })));

      expect(details).toEqual({ sacNumber: 'Debe contener exactamente 8 dígitos.' });
    });

    it('con SAC, la fecha de inicio es obligatoria, también si llega nula', async () => {
      for (const startDate of [undefined, null]) {
        const details = await validationDetailsOf(() => CaseFactory.create(aNewCaseInput({ startDate })));

        expect(details).toEqual({ startDate: 'Es obligatoria cuando se informa el número de SAC.' });
      }
    });

    it('sin SAC, o con uno en blanco, la causa se registra sin fecha de inicio: no se inventa una', () => {
      for (const sacNumber of [null, '   ']) {
        const newCase = CaseFactory.create(aNewCaseInput({ sacNumber, startDate: undefined }));

        expect(newCase.sacNumber).toBeNull();
        expect(newCase.startDate).toBeNull();
      }
    });

    it('sin SAC, la fecha de inicio no se informa', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ sacNumber: null, startDate: day('2026-09-01') })),
      );

      expect(details).toEqual({ startDate: 'No se informa si la causa no tiene número de SAC.' });
    });

    it('la fecha de inicio puede ser la de hoy, no una posterior', async () => {
      expect(CaseFactory.create(aNewCaseInput({ startDate: TODAY })).startDate).toEqual(TODAY);

      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ startDate: day('2026-10-07') })),
      );

      expect(details).toEqual({ startDate: 'No puede ser posterior a la fecha de hoy.' });
    });

    it('rechaza una fecha de inicio inválida', async () => {
      const details = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ startDate: new Date('no es una fecha') })),
      );

      expect(details).toEqual({ startDate: 'Debe ser una fecha válida (AAAA-MM-DD).' });
    });
  });

  describe('carátula y largos máximos', () => {
    it.each([undefined, '   '])('la carátula es obligatoria: %p', async (caption) => {
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

    it('acepta un objeto de 800 caracteres; rechaza una contraparte de más de 255 y un objeto de más de 800', async () => {
      expect(() => CaseFactory.create(anAmparoInput({ subjectMatter: 'a'.repeat(800) }))).not.toThrow();

      const details = await validationDetailsOf(() =>
        CaseFactory.create(anAmparoInput({ counterparty: 'a'.repeat(256), subjectMatter: 'a'.repeat(801) })),
      );

      expect(details).toEqual({
        counterparty: 'Debe tener como máximo 255 caracteres.',
        subjectMatter: 'Debe tener como máximo 800 caracteres.',
      });
    });
  });

  describe('rol procesal según el fuero (CA-18.3)', () => {
    it('acepta los dos roles de cada fuero', () => {
      const valid: [() => NewCaseInput, ProceduralRole][] = [
        [() => aNewCaseInput({ proceduralRole: ProceduralRole.DEFENSA }), ProceduralRole.DEFENSA],
        [() => aNewCaseInput({ proceduralRole: ProceduralRole.QUERELLANTE_PARTICULAR }), ProceduralRole.QUERELLANTE_PARTICULAR],
        [() => anAdministrativeInput({ proceduralRole: ProceduralRole.DEFENSA }), ProceduralRole.DEFENSA],
        [() => anAdministrativeInput({ proceduralRole: ProceduralRole.RECURRENTE }), ProceduralRole.RECURRENTE],
        [() => anAmparoInput({ proceduralRole: ProceduralRole.ACTORA }), ProceduralRole.ACTORA],
        [() => anAmparoInput({ proceduralRole: ProceduralRole.DEMANDADA }), ProceduralRole.DEMANDADA],
      ];

      for (const [input, role] of valid) {
        expect(CaseFactory.create(input()).proceduralRole).toBe(role);
      }
    });

    it.each([
      [JurisdictionCode.CRIMINAL, ProceduralRole.ACTORA],
      [JurisdictionCode.ADMINISTRATIVE, ProceduralRole.QUERELLANTE_PARTICULAR],
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
    it('en administrativo y amparo guarda el objeto, y la contraparte es opcional', () => {
      const administrative = CaseFactory.create(anAdministrativeInput({ counterparty: 'APROSS' })) as AdministrativeCase;
      const amparo = CaseFactory.create(anAmparoInput()) as Amparo;

      expect(administrative.counterparty).toBe('APROSS');
      expect(administrative.subjectMatter).toBe('Se impugna la resolución que deniega la cobertura.');
      expect(amparo.counterparty).toBeNull();
      expect(amparo.subjectMatter).toBe('Que se ordene la cobertura integral del tratamiento.');
    });

    it.each([
      ['administrativo, sin objeto', () => anAdministrativeInput({ subjectMatter: undefined })],
      ['amparo, con el objeto en blanco', () => anAmparoInput({ subjectMatter: '   ' })],
    ])('en el fuero %s responde que el objeto es obligatorio', async (_caso, input) => {
      const details = await validationDetailsOf(() => CaseFactory.create(input()));

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

    // RN10
    it('en todos los fueros la tasa de justicia vale false si no se envía y guarda lo que se envía', () => {
      const inputs = [aNewCaseInput, anAdministrativeInput, anAmparoInput];

      for (const input of inputs) {
        expect(CaseFactory.create(input()).courtFeePaid).toBe(false);
        expect(CaseFactory.create(input({ courtFeePaid: true })).courtFeePaid).toBe(true);
      }
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

      it('un acto lesivo que no se renueva no lleva días de renovación, y su plazo puede contarse en días corridos', () => {
        const amparo = CaseFactory.create(
          anAmparoInput({
            ...acto,
            harmfulActRenews: false,
            harmfulActRenewalDays: undefined,
            harmfulActTermDayType: DayType.CONSECUTIVE,
          }),
        ) as Amparo;

        expect(amparo).toMatchObject({
          harmfulActRenews: false,
          harmfulActRenewalDays: null,
          harmfulActTermDayType: DayType.CONSECUTIVE,
        });
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

      it.each([0, 1.5])('los días de renovación y el plazo son enteros mayores o iguales a 1 (%s)', async (days) => {
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
    const withQualification = (offenseDate?: Date) =>
      aNewCaseInput({
        legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate }],
        legalQualificationRefs: [ROBBERY],
      });

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

    it('la fecha del hecho es obligatoria en cada calificación; una inválida cuenta como faltante', async () => {
      for (const offenseDate of [undefined, new Date('nada')]) {
        const details = await validationDetailsOf(() => CaseFactory.create(withQualification(offenseDate)));

        expect(details).toEqual({ legalQualifications: 'Cada calificación legal requiere la fecha del hecho.' });
      }
    });

    it('la fecha del hecho puede ser la de hoy, no una posterior', async () => {
      expect(() => CaseFactory.create(withQualification(TODAY))).not.toThrow();

      const details = await validationDetailsOf(() => CaseFactory.create(withQualification(day('2026-10-07'))));

      expect(details).toEqual({ legalQualifications: 'La fecha del hecho no puede ser posterior a hoy.' });
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

    it('suma los errores de referencia que recibe a los propios, y con datos válidos igual rechaza', async () => {
      const withOwn = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput({ caption: '' }), {
          clientId: 'No existe un cliente vigente con ese identificador.',
        }),
      );
      const onlyReferences = await validationDetailsOf(() =>
        CaseFactory.create(aNewCaseInput(), { responsibleLawyerId: 'No existe un abogado vigente.' }),
      );

      expect(withOwn).toEqual({
        clientId: 'No existe un cliente vigente con ese identificador.',
        caption: 'Es obligatoria.',
      });
      expect(onlyReferences).toEqual({ responsibleLawyerId: 'No existe un abogado vigente.' });
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
