import { ValidationError } from '@shared/domain/domain-error';
import {
  CaseInTerminalStateError,
  EmptyCaseUpdateError,
  LegalQualificationAlreadyPrescribedError,
} from '../../errors/case.errors';
import { DayType } from '../../value-objects/deadline/day-type';
import { JurisdictionCode } from '../../value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../value-objects/case/procedural-role';
import { PrescriptionDeclaration } from '../../value-objects/prescription/prescription-declaration.vo';
import {
  aCase,
  aCaseInState,
  anActor,
  anAdministrativeCase,
  ARCHIVED,
  day,
  HOMICIDE,
  NOW,
  PRESCRIBED,
  ROBBERY,
  TODAY,
} from '../../../test-support/case-fixtures';
import { Amparo } from './amparo.entity';
import { Case } from './case.entity';
import { CaseChanges, CaseModificationContext } from './case-changes';
import { CriminalCase } from './criminal-case.entity';

/* HU19 · Modificar causa: las reglas de `Case.modify` y de cada fuero. */

const LATER = new Date('2026-10-07T10:00:00.000Z');

const context = (overrides: Partial<CaseModificationContext> = {}): CaseModificationContext => ({
  today: TODAY,
  now: LATER,
  referenceErrors: {},
  legalQualificationRefs: [ROBBERY, HOMICIDE],
  ...overrides,
});

function detailsOf(target: Case, changes: CaseChanges, ctx = context()): Record<string, unknown> | null {
  try {
    target.modify(changes, ctx);
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
    return (error as ValidationError).details;
  }
  throw new Error('Se esperaba un ValidationError.');
}

const anAmparo = (overrides: Parameters<typeof aCase>[0] = {}) =>
  aCase({
    jurisdictionCode: JurisdictionCode.AMPARO,
    proceduralRole: ProceduralRole.ACTORA,
    subjectMatter: 'Se reclama la cobertura del tratamiento.',
    harmfulActDate: day('2026-09-01'),
    harmfulActTermDays: 15,
    harmfulActTermDayType: DayType.BUSINESS,
    ...overrides,
  }) as Amparo;

/** A criminal case marked as prescribed (HU33): in "Prescripta", with its declaration. */
const aPrescribedCase = () =>
  CriminalCase.hydrate({
    id: 1,
    sacNumber: '12345678',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    court: null,
    jurisdictionId: 1,
    proceduralRole: ProceduralRole.DEFENSA,
    instructor: { name: null, phone: null, extension: null },
    clientId: 1,
    responsibleLawyerId: 2,
    startDate: day('2026-09-01'),
    courtFeePaid: false,
    currentStateId: 26,
    currentCustomState: null,
    currentProceduralActId: null,
    currentStateTerminal: true,
    proceduralActs: [],
    active: true,
    deactivation: null,
    createdByUserId: 5,
    createdAt: NOW,
    updatedAt: NOW,
    offenses: [],
    clientDetained: false,
    prescriptionDeclaration: PrescriptionDeclaration.hydrate({
      prescriptionDate: day('2026-09-15'),
      resolution: 'Sentencia N° 214',
      grounds: null,
      registeredByUserId: 5,
      registeredAt: NOW,
    }),
  });

describe('Case.modify', () => {
  // CA-19.1
  it('cambia solo lo enviado, deja lo omitido y vacía un anulable enviado en null', () => {
    const target = aCase({ court: 'Fisc. de Distrito I', instructorName: 'Dra. Ledesma' });

    const changes = target.modify({ caption: ' FERREYRA, Lucas p.s.a. Robo ', court: null }, context());

    expect(target.caption).toBe('FERREYRA, Lucas p.s.a. Robo');
    expect(target.court).toBeNull();
    expect(target.instructor.name).toBe('Dra. Ledesma');
    expect(changes.fields).toEqual(['caption', 'court']);
    expect(target.updatedAt).toBe(LATER);
  });

  it('enviar el valor que ya tiene no es un cambio, y no toca la fecha de modificación', () => {
    const target = aCase();

    const changes = target.modify({ caption: target.caption, sacNumber: target.sacNumber }, context());

    expect(changes.isEmpty()).toBe(true);
    expect(target.updatedAt).toBe(NOW);
  });

  // CA-19.2
  it('sin ningún campo es un error propio', () => {
    expect(() => aCase().modify({}, context())).toThrow(EmptyCaseUpdateError);
  });

  // CA-19.5, CA-19.6
  describe('SAC y fecha de inicio', () => {
    it('quitar el SAC exige quitar también la fecha de inicio', () => {
      expect(detailsOf(aCase(), { sacNumber: null })).toEqual({
        startDate: 'Sin número de SAC la causa no tiene fecha de inicio.',
      });
      const target = aCase();
      target.modify({ sacNumber: null, startDate: null }, context());
      expect([target.sacNumber, target.startDate]).toEqual([null, null]);
    });

    it('agregar un SAC a una causa sin fecha exige la fecha', () => {
      const withoutSac = aCase({ sacNumber: null, startDate: null });

      expect(detailsOf(withoutSac, { sacNumber: '13284571' })).toEqual({
        startDate: 'Es obligatoria cuando se informa el número de SAC.',
      });
    });

    it.each([
      [{ sacNumber: '1328457' }, { sacNumber: 'Debe contener exactamente 8 dígitos.' }],
      [{ startDate: day('2026-10-07') }, { startDate: 'No puede ser posterior a la fecha de hoy.' }],
    ])('%j es inválido', (changes, expected) => {
      expect(detailsOf(aCase(), changes)).toEqual(expected);
    });
  });

  it('una carátula vacía o un campo que la causa siempre tiene, en null, se rechazan', () => {
    expect(detailsOf(aCase(), { caption: '  ', courtFeePaid: null })).toEqual({
      caption: 'Es obligatoria.',
      courtFeePaid: 'No puede quedar vacío.',
    });
  });

  it('el rol procesal tiene que ser del fuero', () => {
    expect(detailsOf(aCase(), { proceduralRole: ProceduralRole.ACTORA })).toEqual({
      proceduralRole: 'El rol procesal no corresponde al fuero.',
    });
  });

  // CA-19.4
  it.each<[string, () => Case, CaseChanges, Record<string, string>]>([
    ['penal con objeto', () => aCase(), { subjectMatter: 'x' }, { subjectMatter: 'No se informa en el fuero penal.' }],
    [
      'amparo con calificaciones',
      () => anAmparo(),
      { legalQualifications: [] },
      { legalQualifications: 'Solo corresponden al fuero penal.' },
    ],
    [
      'administrativo con acto lesivo',
      () => anAdministrativeCase(),
      { harmfulActDate: day('2026-09-01') },
      { harmfulActDate: 'Solo corresponde al fuero de amparo.' },
    ],
    ['amparo con detenido', () => anAmparo(), { clientDetained: true }, { clientDetained: 'Solo corresponde al fuero penal.' }],
  ])('un dato de otro fuero se rechaza: %s', (_case, build, changes, expected) => {
    expect(detailsOf(build(), changes)).toEqual(expected);
  });

  it('informa todo junto, con los errores de referencia del caso de uso, y no aplica nada', () => {
    const target = aCase();
    const before = target.toSnapshot();

    const details = detailsOf(
      target,
      { caption: 'Nueva', sacNumber: '1', responsibleLawyerId: 99 },
      context({ referenceErrors: { responsibleLawyerId: 'No existe un abogado vigente con ese identificador.' } }),
    );

    expect(details).toEqual({
      responsibleLawyerId: 'No existe un abogado vigente con ese identificador.',
      sacNumber: 'Debe contener exactamente 8 dígitos.',
    });
    expect(target.toSnapshot()).toEqual(before);
  });

  // CA-19.9
  it('cambiar responsable o carátula mueve la carpeta', () => {
    const target = aCase();

    expect(target.modify({ responsibleLawyerId: 5 }, context()).folderChanges()).toEqual(['responsibleLawyer']);
    expect(target.modify({ caption: 'FERREYRA p.s.a. Robo' }, context()).folderChanges()).toEqual(['caption']);
  });

  // CA-19.13
  it('una causa archivada se puede corregir', () => {
    const archived = aCaseInState({ currentStateId: ARCHIVED.id });

    expect(archived.modify({ court: 'Juzgado de Control N° 3' }, context()).fields).toEqual(['court']);
  });
});

describe('CriminalCase.modify', () => {
  // CA-19.11
  it('las calificaciones reemplazan la lista entera, y [] la vacía', () => {
    const target = aCase({
      legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') }],
      legalQualificationRefs: [ROBBERY],
    }) as CriminalCase;

    target.modify({ legalQualifications: [{ legalQualificationId: HOMICIDE.id, offenseDate: day('2021-02-27') }] }, context());
    expect(target.offenses.map((offense) => offense.legalQualificationId)).toEqual([HOMICIDE.id]);
    expect(target.offenses[0].prescriptionExpiresOn).toEqual(day('2036-02-27'));

    expect(target.modify({ legalQualifications: [] }, context()).fields).toEqual(['legalQualifications']);
    expect(target.offenses).toEqual([]);
  });

  it('las mismas calificaciones en otro orden no son un cambio', () => {
    const items = [
      { legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') },
      { legalQualificationId: HOMICIDE.id, offenseDate: day('2021-02-27') },
    ];
    const target = aCase({ legalQualifications: items, legalQualificationRefs: [ROBBERY, HOMICIDE] });

    expect(target.modify({ legalQualifications: [...items].reverse() }, context()).isEmpty()).toBe(true);
  });

  it('valida las calificaciones con las reglas del alta', () => {
    expect(
      detailsOf(aCase(), { legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2026-10-07') }] }),
    ).toEqual({ legalQualifications: 'La fecha del hecho no puede ser posterior a hoy.' });
  });

  // CA-19.13: el negocio antes que los datos
  it('una causa prescripta no admite calificaciones: 422, aunque los datos también estén mal', () => {
    const prescribed = aPrescribedCase();

    expect(() => prescribed.modify({ legalQualifications: [], caption: '' }, context())).toThrow(CaseInTerminalStateError);
    expect(prescribed.modify({ court: 'Juzgado N° 3' }, context()).fields).toEqual(['court']);
  });
});

// D-113, CA-33.18: una calificación declarada prescripta queda fija.
describe('CriminalCase.modify con una calificación declarada prescripta', () => {
  const ROBBERY_ITEM = { legalQualificationId: ROBBERY.id, offenseDate: day('2021-02-27') };
  const HOMICIDE_ITEM = { legalQualificationId: HOMICIDE.id, offenseDate: day('2021-02-27') };
  const withRobberyDeclared = () => {
    const target = aCase({ legalQualifications: [ROBBERY_ITEM, HOMICIDE_ITEM], legalQualificationRefs: [ROBBERY, HOMICIDE] }) as CriminalCase;
    target.declareQualificationPrescription({
      legalQualificationId: ROBBERY.id,
      data: { prescriptionDate: day('2026-09-15'), resolution: 'Auto N° 88', grounds: null },
      prescribedState: PRESCRIBED,
      actor: anActor({ userId: 9, roleNames: ['ADMINISTRATOR'], lawyerId: null }),
      today: TODAY,
      now: LATER,
    });
    return target;
  };

  it('no se puede quitar la calificación declarada', () => {
    const attempt = () => withRobberyDeclared().modify({ legalQualifications: [HOMICIDE_ITEM] }, context());

    expect(attempt).toThrow(LegalQualificationAlreadyPrescribedError);
    expect(attempt).toThrow('No se puede quitar ni modificar una calificación legal declarada prescripta.');
  });

  it('no se puede cambiar la fecha del hecho de la calificación declarada', () => {
    expect(() =>
      withRobberyDeclared().modify(
        { legalQualifications: [{ ...ROBBERY_ITEM, offenseDate: day('2021-03-01') }, HOMICIDE_ITEM] },
        context(),
      ),
    ).toThrow(LegalQualificationAlreadyPrescribedError);
  });

  it('se puede quitar la que no está declarada, y la declarada conserva su declaración', () => {
    const target = withRobberyDeclared();

    expect(target.modify({ legalQualifications: [ROBBERY_ITEM] }, context()).fields).toEqual(['legalQualifications']);
    expect(target.offenses.map((offense) => offense.legalQualificationId)).toEqual([ROBBERY.id]);
    expect(target.offenses[0].prescriptionDeclaration).toMatchObject({ resolution: 'Auto N° 88' });
  });
});

describe('Amparo.modify', () => {
  // CA-19.12
  it('cambiar el acto lesivo lo valida como en el alta', () => {
    const target = anAmparo();

    target.modify({ harmfulActTermDays: 30 }, context());
    expect(target.harmfulActTermDays).toBe(30);

    expect(detailsOf(target, { harmfulActDate: day('2026-10-07') })).toEqual({
      harmfulActDate: 'No puede ser posterior a la fecha de hoy.',
    });
  });

  it('harmfulActDate en null borra el acto lesivo y todos sus datos', () => {
    const target = anAmparo({ harmfulActRenews: true, harmfulActRenewalDays: 30 });

    const changes = target.modify({ harmfulActDate: null }, context());

    expect(target.harmfulAct).toBeNull();
    expect([
      target.harmfulActDate,
      target.harmfulActRenews,
      target.harmfulActRenewalDays,
      target.harmfulActTermDays,
      target.harmfulActTermDayType,
    ]).toEqual([null, false, null, null, null]);
    expect(changes.fields).toEqual([
      'harmfulActDate',
      'harmfulActRenews',
      'harmfulActRenewalDays',
      'harmfulActTermDays',
      'harmfulActTermDayType',
    ]);
  });
});
