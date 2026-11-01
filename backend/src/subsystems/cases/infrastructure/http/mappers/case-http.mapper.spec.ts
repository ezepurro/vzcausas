import { ConfigService } from '@nestjs/config';
import { ValidationError } from '@shared/domain/domain-error';
import { RegisterCaseResult } from '../../../core/application/use-cases/case/register-case.interfaces';
import { CaseFactory, NewCaseInput } from '../../../core/domain/factories/case.factory';
import { CaseListItem } from '../../../core/domain/ports/case/case.repository';
import { DayType } from '../../../core/domain/value-objects/deadline/day-type';
import { JurisdictionCode } from '../../../core/domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../../core/domain/value-objects/case/procedural-role';
import {
  CLIENT,
  INITIAL_STATES,
  LAWYER,
  aNewCaseInput,
  day,
} from '../../../core/test-support/case-fixtures';
import { CaseHttpMapper } from './case-http.mapper';

// `import type`: traer la clase en runtime cargaría `class-transformer` y sus
// decoradores, que piden `reflect-metadata` — y esta suite unitaria no lo carga.
// No hace falta: lo que se prueba acá es la traducción, que sólo lee propiedades.
// Que los decoradores del DTO validen de verdad lo cubre el spec de integración,
// que pasa por el ValidationPipe real.
import type { ListCasesQueryDto } from '../dtos/case/list-cases.query.dto';

const config = { getOrThrow: () => 'America/Argentina/Cordoba' } as unknown as ConfigService;
const mapper = new CaseHttpMapper(config);

/** El DTO como lo entrega el pipe: ya transformado. */
function aQuery(overrides: Partial<ListCasesQueryDto> = {}): ListCasesQueryDto {
  return overrides as ListCasesQueryDto;
}

/** Read model con todos los campos cargados, para fijar el mapeo completo. */
function anItem(overrides: Partial<CaseListItem> = {}): CaseListItem {
  return {
    id: 1,
    sacNumber: '13284571',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    court: 'Juzgado de Control N° 3 · Córdoba',
    jurisdiction: JurisdictionCode.CRIMINAL,
    proceduralRole: ProceduralRole.DEFENSA,
    instructorName: 'Dra. Verónica Ledesma',
    tribunalPhone: '0351 448-1200',
    instructorExtension: '214',
    counterparty: null,
    subjectMatter: null,
    clientDetained: false,
    injunctionGranted: null,
    harmfulActDate: null,
    harmfulActRenews: null,
    harmfulActRenewalDays: null,
    harmfulActTermDays: null,
    harmfulActTermDayType: null,
    harmfulActDeadline: null,
    administrativeRemedyExhaustedOn: null,
    courtFeePaid: false,
    client: CLIENT,
    responsibleLawyer: LAWYER,
    legalQualifications: [
      {
        id: 1,
        name: 'Robo calificado — art. 167 inc. 2 CP',
        prescriptionMonths: 96,
        offenseDate: day('2021-02-27'),
        prescriptionStartsOn: day('2021-02-27'),
        prescriptionExpiresOn: day('2029-02-27'),
      },
    ],
    lastInterruptiveActDate: null,
    prescription: null,
    prescriptionDeclaration: null,
    startDate: day('2021-03-12'),
    currentState: {
      proceduralStateId: 12,
      name: 'Oposición al requerimiento de elevación',
      custom: false,
      initial: false,
      proceduralActId: 31,
      dueDate: day('2026-09-16'),
      businessDaysRemaining: 1,
      manuallyAdjusted: false,
    },
    folder: null,
    active: true,
    ...overrides,
  };
}

describe('CaseHttpMapper.toResponse', () => {
  it('mapea el recurso completo con las fechas como YYYY-MM-DD', () => {
    // Es el ejemplo del contrato §3.7, campo por campo.
    expect(mapper.toResponse(anItem())).toEqual({
      id: 1,
      sacNumber: '13284571',
      caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
      court: 'Juzgado de Control N° 3 · Córdoba',
      jurisdiction: 'CRIMINAL',
      // Decisión del equipo (08/10/2026): el código viaja en castellano.
      // El contrato §2 todavía dice DEFENSE y hay que actualizarlo.
      proceduralRole: 'DEFENSA',
      instructorName: 'Dra. Verónica Ledesma',
      tribunalPhone: '0351 448-1200',
      instructorExtension: '214',
      counterparty: null,
      subjectMatter: null,
      clientDetained: false,
      injunctionGranted: null,
      harmfulActDate: null,
      harmfulActRenews: null,
      harmfulActRenewalDays: null,
      harmfulActTermDays: null,
      harmfulActTermDayType: null,
      harmfulActDeadline: null,
      administrativeRemedyExhaustedOn: null,
      courtFeePaid: false,
      client: {
        id: CLIENT.id,
        lastName: 'GÓMEZ',
        firstName: 'Ariel Fernando',
        dni: '34812905',
        phone: null,
        email: null,
        clientSince: '2021-03-12',
      },
      responsibleLawyer: { id: 2, lastName: 'Ríos', firstName: 'Malena', registrationNumber: '1-36842' },
      legalQualifications: [
        {
          id: 1,
          name: 'Robo calificado — art. 167 inc. 2 CP',
          prescriptionMonths: 96,
          offenseDate: '2021-02-27',
          prescriptionStartsOn: '2021-02-27',
          prescriptionExpiresOn: '2029-02-27',
        },
      ],
      prescription: null,
      prescriptionDeclaration: null,
      startDate: '2021-03-12',
      currentState: {
        proceduralStateId: 12,
        name: 'Oposición al requerimiento de elevación',
        custom: false,
        initial: false,
        proceduralActId: 31,
        dueDate: '2026-09-16',
        businessDaysRemaining: 1,
        manuallyAdjusted: false,
      },
      folder: null,
      active: true,
    });
  });

  /** `remainingDays` es del resumen diario (HU32): el `prescription` del contrato no lo tiene. */
  it('la prescripción que rige sale con sus fechas como YYYY-MM-DD y sin remainingDays (§3.7)', () => {
    const response = mapper.toResponse(
      anItem({
        prescription: {
          legalQualificationId: 1,
          legalQualificationName: 'Robo calificado — art. 167 inc. 2 CP',
          startsOn: day('2024-07-04'),
          expiresOn: day('2032-07-04'),
          elapsedPercentage: 27,
          alert: false,
          expired: false,
          remainingDays: 2098,
          lastInterruptiveActDate: day('2024-07-04'),
        },
      }),
    );

    expect(response.prescription).toEqual({
      legalQualificationId: 1,
      legalQualificationName: 'Robo calificado — art. 167 inc. 2 CP',
      startsOn: '2024-07-04',
      expiresOn: '2032-07-04',
      elapsedPercentage: 27,
      alert: false,
      expired: false,
      lastInterruptiveActDate: '2024-07-04',
    });
  });

  it('la declaración de prescripción sale con registeredAt en la hora de Córdoba', () => {
    const response = mapper.toResponse(
      anItem({
        prescriptionDeclaration: {
          prescriptionDate: day('2026-09-15'),
          resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
          grounds: null,
          registeredBy: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
          registeredAt: new Date('2026-09-15T15:20:00.000Z'),
        },
      }),
    );

    expect(response.prescriptionDeclaration).toEqual({
      prescriptionDate: '2026-09-15',
      resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
      grounds: null,
      registeredBy: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
      registeredAt: '2026-09-15T12:20:00-03:00',
    });
  });

});

describe('CaseHttpMapper.fromRegisterResult', () => {
  function aResult(overrides: Partial<NewCaseInput> = {}): RegisterCaseResult {
    const input = aNewCaseInput(overrides);
    return {
      newCase: CaseFactory.create(input).toSnapshot(),
      client: CLIENT,
      responsibleLawyer: LAWYER,
      currentState: INITIAL_STATES[input.jurisdictionCode],
      harmfulActDeadline: null,
      prescription: null,
      folder: { status: 'CREATING', url: null, path: null, templatesCopied: 0, templatesPending: 0 },
    };
  }

  it('una causa recién registrada sale en el estado inicial, sin acto, vencimiento ni declaración', () => {
    const response = mapper.fromRegisterResult(aResult());

    expect(response.prescriptionDeclaration).toBeNull();
    expect(response.currentState).toEqual({
      // La columna guarda el id real de "Iniciada", pero el contrato pide null:
      // mandarlo haría que el frontend lo buscara en /procedural-states.
      proceduralStateId: null,
      name: 'Iniciada',
      custom: false,
      initial: true,
      proceduralActId: null,
      dueDate: null,
      businessDaysRemaining: null,
      manuallyAdjusted: false,
    });
  });

  it('la contraparte y el objeto salen en un amparo, que es la rama del instanceof, y nulos en el penal', () => {
    expect(mapper.fromRegisterResult(aResult())).toMatchObject({
      jurisdiction: 'CRIMINAL',
      counterparty: null,
      subjectMatter: null,
    });

    const response = mapper.fromRegisterResult(
      aResult({
        jurisdictionCode: JurisdictionCode.AMPARO,
        proceduralRole: ProceduralRole.ACTORA,
        counterparty: 'APROSS',
        subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
      }),
    );

    expect(response).toMatchObject({
      jurisdiction: 'AMPARO',
      proceduralRole: 'ACTORA',
      counterparty: 'APROSS',
      subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
    });
  });

  describe('datos propios de cada fuero (D-67)', () => {
    const harmfulAct = {
      harmfulActDate: day('2026-08-03'),
      harmfulActRenews: true,
      harmfulActRenewalDays: 30,
      harmfulActTermDays: 15,
      harmfulActTermDayType: DayType.BUSINESS,
    };

    it('penal y administrativo: sale cada dato propio y los de los otros fueros son null', () => {
      const criminal = mapper.fromRegisterResult(aResult({ clientDetained: true, courtFeePaid: true }));
      const administrative = mapper.fromRegisterResult(
        aResult({
          jurisdictionCode: JurisdictionCode.ADMINISTRATIVE,
          proceduralRole: ProceduralRole.RECURRENTE,
          subjectMatter: 'Descargo frente a la imputación.',
          administrativeRemedyExhaustedOn: day('2026-08-10'),
        }),
      );

      expect(criminal).toMatchObject({
        clientDetained: true,
        injunctionGranted: null,
        harmfulActDate: null,
        harmfulActRenews: null,
        harmfulActRenewalDays: null,
        harmfulActTermDays: null,
        harmfulActTermDayType: null,
        harmfulActDeadline: null,
        administrativeRemedyExhaustedOn: null,
        courtFeePaid: true,
      });
      expect(administrative).toMatchObject({
        clientDetained: null,
        injunctionGranted: null,
        harmfulActDeadline: null,
        administrativeRemedyExhaustedOn: '2026-08-10',
      });
    });

    it('amparo: salen la medida cautelar y el acto lesivo, con las fechas como YYYY-MM-DD', () => {
      const result = aResult({
        jurisdictionCode: JurisdictionCode.AMPARO,
        proceduralRole: ProceduralRole.ACTORA,
        subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
        injunctionGranted: true,
        ...harmfulAct,
      });
      const deadline = { actDate: day('2026-09-02'), renewed: true, dueDate: day('2026-09-23'), businessDaysRemaining: 6 };

      const response = mapper.fromRegisterResult({ ...result, harmfulActDeadline: deadline });

      expect(response).toMatchObject({
        clientDetained: null,
        injunctionGranted: true,
        harmfulActDate: '2026-08-03',
        harmfulActRenews: true,
        harmfulActRenewalDays: 30,
        harmfulActTermDays: 15,
        harmfulActTermDayType: 'BUSINESS',
        harmfulActDeadline: { actDate: '2026-09-02', renewed: true, dueDate: '2026-09-23', businessDaysRemaining: 6 },
        administrativeRemedyExhaustedOn: null,
        courtFeePaid: false,
      });
    });

  });

  it('produce la misma forma que toResponse: las mismas 30 claves', () => {
    // Las tres respuestas del contrato son el mismo recurso. Si una ruta
    // agrega o pierde un campo, acá se ve.
    expect(Object.keys(mapper.fromRegisterResult(aResult())).sort()).toEqual(
      Object.keys(mapper.toResponse(anItem())).sort(),
    );
  });
});

describe('CaseHttpMapper.toSearchCriteria', () => {
  it('aplica la paginación por defecto del contrato, recorta el search y reenvía los filtros simples', () => {
    const criteria = CaseHttpMapper.toSearchCriteria(
      aQuery({ search: ' gómez ', jurisdiction: JurisdictionCode.AMPARO, responsibleLawyerId: 3, clientId: 7, openDeadline: true }),
    );

    expect(criteria).toMatchObject({
      page: 1,
      limit: 20,
      search: 'gómez',
      jurisdiction: JurisdictionCode.AMPARO,
      responsibleLawyerId: 3,
      clientId: 7,
      openDeadline: true,
    });
    // Un search vacío no viaja como filtro.
    expect(CaseHttpMapper.toSearchCriteria(aQuery({ search: '   ' })).search).toBeUndefined();
  });

  it('normaliza el fuero y rechaza uno inexistente con INVALID_REQUEST (§5.3)', () => {
    expect(CaseHttpMapper.toSearchCriteria(aQuery({ jurisdiction: ' criminal ' })).jurisdiction).toBe(
      JurisdictionCode.CRIMINAL,
    );
    expect(CaseHttpMapper.toSearchCriteria(aQuery({ jurisdiction: '' })).jurisdiction).toBeUndefined();

    try {
      CaseHttpMapper.toSearchCriteria(aQuery({ jurisdiction: 'PENAL' }));
      throw new Error('Se esperaba un error y no se lanzó ninguno.');
    } catch (error) {
      expect((error as ValidationError).code).toBe('INVALID_REQUEST');
      expect((error as ValidationError).details).toEqual({
        jurisdiction: 'No existe un fuero procesal con ese nombre.',
      });
    }
  });

  describe('filtro de estado: tres parámetros, un solo valor (CA-20.4)', () => {
    it('traduce cada uno a su variante; sin ninguno, o con withoutProceduralActs=false, no hay filtro', () => {
      expect(CaseHttpMapper.toSearchCriteria(aQuery({ proceduralStateId: 4 })).state).toEqual({
        kind: 'proceduralState',
        proceduralStateId: 4,
      });

      expect(CaseHttpMapper.toSearchCriteria(aQuery({ customState: 'Con oposición' })).state).toEqual({
        kind: 'custom',
        customState: 'Con oposición',
      });

      expect(CaseHttpMapper.toSearchCriteria(aQuery({ withoutProceduralActs: true })).state).toEqual({
        kind: 'withoutProceduralActs',
      });

      expect(CaseHttpMapper.toSearchCriteria(aQuery()).state).toBeUndefined();
      // El parámetro existe para pedir "solo las iniciadas", no para excluirlas.
      expect(CaseHttpMapper.toSearchCriteria(aQuery({ withoutProceduralActs: false })).state).toBeUndefined();
    });

    it('rechaza dos filtros de estado combinados con INVALID_REQUEST, sobre el campo que sobra', () => {
      const combinaciones: [ListCasesQueryDto, Record<string, string>][] = [
        [
          aQuery({ proceduralStateId: 4, customState: 'Con oposición' }),
          { customState: 'No puede combinarse con proceduralStateId.' },
        ],
        ...[
          aQuery({ withoutProceduralActs: true, proceduralStateId: 4 }),
          aQuery({ withoutProceduralActs: true, customState: 'Con oposición' }),
          aQuery({ withoutProceduralActs: false, proceduralStateId: 4 }),
        ].map((query): [ListCasesQueryDto, Record<string, string>] => [
          query,
          { withoutProceduralActs: 'No puede combinarse con proceduralStateId ni con customState.' },
        ]),
      ];

      for (const [query, details] of combinaciones) {
        try {
          CaseHttpMapper.toSearchCriteria(query);
          throw new Error('Se esperaba un error y no se lanzó ninguno.');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).code).toBe('INVALID_REQUEST');
          expect((error as ValidationError).details).toEqual(details);
        }
      }
    });
  });
});
