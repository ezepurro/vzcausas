import { ValidationError } from '@shared/domain/domain-error';
import { JurisdictionCode } from '../../../core/domain/value-objects/jurisdiction-code';
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
