import { ValidationError } from '@shared/domain/domain-error';
import { RegisterCaseResult } from '../../../core/application/common/register-case.interfaces';
import { CaseFactory, NewCaseInput } from '../../../core/domain/factories/case.factory';
import { CaseListItem } from '../../../core/domain/ports/case-query.port';
import { DayType } from '../../../core/domain/value-objects/day-type';
import { JurisdictionCode } from '../../../core/domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../../core/domain/value-objects/procedural-role';
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
import type { ListCasesQueryDto } from '../dtos/list-cases.query.dto';

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
    expect(CaseHttpMapper.toResponse(anItem())).toEqual({
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

  it('la carpeta de la causa sale tal como la lee la consulta', () => {
    const folder = {
      status: 'CREATED' as const,
      url: 'https://drive.google.com/drive/folders/abc',
      path: '/VZ Causas/Ríos, Malena/Penal/GÓMEZ',
      templatesCopied: 0,
      templatesPending: 0,
    };

    expect(CaseHttpMapper.toResponse(anItem({ folder })).folder).toEqual(folder);
  });

  it('una causa anterior a las carpetas sale con folder en null', () => {
    expect(CaseHttpMapper.toResponse(anItem({ folder: null })).folder).toBeNull();
  });

  it('una fecha nula sale nula, no como string', () => {
    const response = CaseHttpMapper.toResponse(
      anItem({
        currentState: { ...anItem().currentState, dueDate: null, businessDaysRemaining: null },
      }),
    );

    expect(response.currentState.dueDate).toBeNull();
    expect(response.currentState.businessDaysRemaining).toBeNull();
  });

  it('una prescripción sin calcular sale nula', () => {
    const [qualification] = anItem().legalQualifications;
    const response = CaseHttpMapper.toResponse(
      anItem({ legalQualifications: [{ ...qualification, prescriptionExpiresOn: null }] }),
    );

    expect(response.legalQualifications[0].prescriptionExpiresOn).toBeNull();
    // La fecha del hecho sigue saliendo: es dato cargado, no calculado.
    expect(response.legalQualifications[0].offenseDate).toBe('2021-02-27');
  });

  it('no inventa ni pierde campos: exactamente los 28 del contrato implementados', () => {
    // Faltan a propósito `prescription` y `prescriptionDeclaration` (V4 §3.7): el cómputo
    // de la prescripción de la causa y HU33 no están en este paso.
    expect(Object.keys(CaseHttpMapper.toResponse(anItem())).sort()).toEqual(
      [
        'active',
        'administrativeRemedyExhaustedOn',
        'caption',
        'client',
        'clientDetained',
        'counterparty',
        'court',
        'courtFeePaid',
        'currentState',
        'folder',
        'harmfulActDate',
        'harmfulActDeadline',
        'harmfulActRenewalDays',
        'harmfulActRenews',
        'harmfulActTermDayType',
        'harmfulActTermDays',
        'id',
        'injunctionGranted',
        'instructorExtension',
        'instructorName',
        'jurisdiction',
        'legalQualifications',
        'proceduralRole',
        'responsibleLawyer',
        'sacNumber',
        'startDate',
        'subjectMatter',
        'tribunalPhone',
      ].sort(),
    );
  });

  it('un amparo lleva contraparte y objeto; una penal los lleva nulos', () => {
    const amparo = CaseHttpMapper.toResponse(
      anItem({
        jurisdiction: JurisdictionCode.AMPARO,
        proceduralRole: ProceduralRole.ACTORA,
        counterparty: 'APROSS',
        subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
        legalQualifications: [],
      }),
    );

    expect(amparo).toMatchObject({
      jurisdiction: 'AMPARO',
      proceduralRole: 'ACTORA',
      counterparty: 'APROSS',
      subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
      legalQualifications: [],
    });
    expect(CaseHttpMapper.toResponse(anItem())).toMatchObject({
      counterparty: null,
      subjectMatter: null,
    });
  });

  it('un estado escrito a mano manda el texto como nombre y el id en null', () => {
    const response = CaseHttpMapper.toResponse(
      anItem({
        currentState: {
          ...anItem().currentState,
          proceduralStateId: null,
          name: 'Con acusación, pero con oposición',
          custom: true,
        },
      }),
    );

    expect(response.currentState).toMatchObject({
      proceduralStateId: null,
      name: 'Con acusación, pero con oposición',
      custom: true,
    });
  });
});

describe('CaseHttpMapper.fromRegisterResult', () => {
  function aResult(overrides: Partial<NewCaseInput> = {}): RegisterCaseResult {
    const input = aNewCaseInput(overrides);
    return {
      newCase: CaseFactory.create(input),
      client: CLIENT,
      responsibleLawyer: LAWYER,
      offenses: [],
      currentState: INITIAL_STATES[input.jurisdictionCode],
      harmfulActDeadline: null,
      folder: { status: 'CREATING', url: null, path: null, templatesCopied: 0, templatesPending: 0 },
    };
  }

  it('una causa recién registrada sale en el estado inicial, sin acto ni vencimiento', () => {
    const response = CaseHttpMapper.fromRegisterResult(aResult());

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

  it('la respuesta del alta incluye la carpeta como quedó al responder', () => {
    const response = CaseHttpMapper.fromRegisterResult(aResult());

    expect(response.folder).toEqual({
      status: 'CREATING',
      url: null,
      path: null,
      templatesCopied: 0,
      templatesPending: 0,
    });
  });

  it('en el fuero penal la contraparte y el objeto salen nulos', () => {
    const response = CaseHttpMapper.fromRegisterResult(aResult());

    expect(response).toMatchObject({
      jurisdiction: 'CRIMINAL',
      counterparty: null,
      subjectMatter: null,
    });
  });

  it('en un amparo salen los dos, que es la rama del instanceof', () => {
    const response = CaseHttpMapper.fromRegisterResult(
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

    it('penal: sale clientDetained y los demás datos son null', () => {
      const response = CaseHttpMapper.fromRegisterResult(aResult({ clientDetained: true, courtFeePaid: true }));

      expect(response).toMatchObject({
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

      const response = CaseHttpMapper.fromRegisterResult({ ...result, harmfulActDeadline: deadline });

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

    it('amparo sin acto lesivo: injunctionGranted y harmfulActRenews salen false, el resto null', () => {
      const response = CaseHttpMapper.fromRegisterResult(
        aResult({
          jurisdictionCode: JurisdictionCode.AMPARO,
          proceduralRole: ProceduralRole.ACTORA,
          subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
        }),
      );

      expect(response).toMatchObject({
        injunctionGranted: false,
        harmfulActDate: null,
        harmfulActRenews: false,
        harmfulActRenewalDays: null,
        harmfulActTermDays: null,
        harmfulActTermDayType: null,
        harmfulActDeadline: null,
      });
    });

    it('administrativo: sale la fecha de agotamiento de la vía y el resto de los datos es null', () => {
      const response = CaseHttpMapper.fromRegisterResult(
        aResult({
          jurisdictionCode: JurisdictionCode.ADMINISTRATIVE,
          proceduralRole: ProceduralRole.RECURRENTE,
          subjectMatter: 'Descargo frente a la imputación.',
          administrativeRemedyExhaustedOn: day('2026-08-10'),
        }),
      );

      expect(response).toMatchObject({
        clientDetained: null,
        injunctionGranted: null,
        harmfulActDeadline: null,
        administrativeRemedyExhaustedOn: '2026-08-10',
      });
    });
  });

  it('produce la misma forma que toResponse: las mismas 28 claves', () => {
    // Las tres respuestas del contrato son el mismo recurso. Si una ruta
    // agrega o pierde un campo, acá se ve.
    expect(Object.keys(CaseHttpMapper.fromRegisterResult(aResult())).sort()).toEqual(
      Object.keys(CaseHttpMapper.toResponse(anItem())).sort(),
    );
  });
});

describe('CaseHttpMapper.toSearchCriteria', () => {
  it('aplica los valores por defecto del contrato cuando no viene paginación', () => {
    const criteria = CaseHttpMapper.toSearchCriteria(aQuery());

    expect(criteria.page).toBe(1);
    expect(criteria.limit).toBe(20);
  });

  it('un search vacío no viaja como filtro', () => {
    expect(CaseHttpMapper.toSearchCriteria(aQuery({ search: '   ' })).search).toBeUndefined();
    expect(CaseHttpMapper.toSearchCriteria(aQuery({ search: ' gómez ' })).search).toBe('gómez');
  });

  it('reenvía los filtros simples tal cual', () => {
    const criteria = CaseHttpMapper.toSearchCriteria(
      aQuery({
        jurisdiction: JurisdictionCode.AMPARO,
        responsibleLawyerId: 3,
        clientId: 7,
        openDeadline: true,
      }),
    );

    expect(criteria).toMatchObject({
      jurisdiction: JurisdictionCode.AMPARO,
      responsibleLawyerId: 3,
      clientId: 7,
      openDeadline: true,
    });
  });

  describe('filtro de estado: tres parámetros, un solo valor (CA-20.4)', () => {
    it('traduce cada uno a su variante', () => {
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
    });

    it('sin ninguno de los tres, no hay filtro de estado', () => {
      expect(CaseHttpMapper.toSearchCriteria(aQuery()).state).toBeUndefined();
    });

    it('withoutProceduralActs=false no filtra nada', () => {
      // El parámetro existe para pedir "solo las iniciadas", no para excluirlas.
      expect(CaseHttpMapper.toSearchCriteria(aQuery({ withoutProceduralActs: false })).state).toBeUndefined();
    });

    it('rechaza proceduralStateId combinado con customState', () => {
      const query = aQuery({ proceduralStateId: 4, customState: 'Con oposición' });

      try {
        CaseHttpMapper.toSearchCriteria(query);
        throw new Error('Se esperaba un error y no se lanzó ninguno.');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('INVALID_REQUEST');
        expect((error as ValidationError).details).toEqual({
          customState: 'No puede combinarse con proceduralStateId.',
        });
      }
    });

    it('rechaza withoutProceduralActs combinado con cualquiera de los otros dos', () => {
      const combinaciones = [
        aQuery({ withoutProceduralActs: true, proceduralStateId: 4 }),
        aQuery({ withoutProceduralActs: true, customState: 'Con oposición' }),
        aQuery({ withoutProceduralActs: false, proceduralStateId: 4 }),
      ];

      for (const query of combinaciones) {
        try {
          CaseHttpMapper.toSearchCriteria(query);
          throw new Error('Se esperaba un error y no se lanzó ninguno.');
        } catch (error) {
          expect((error as ValidationError).code).toBe('INVALID_REQUEST');
          expect((error as ValidationError).details).toEqual({
            withoutProceduralActs: 'No puede combinarse con proceduralStateId ni con customState.',
          });
        }
      }
    });
  });
});
