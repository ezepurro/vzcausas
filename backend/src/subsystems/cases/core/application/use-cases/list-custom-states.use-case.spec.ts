import { ValidationError } from '@shared/domain/domain-error';
import {
  CaseListItem,
  CasePage,
  CaseRepository,
  CaseSearchCriteria,
} from '../../domain/ports/case.repository';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { UnusedCaseRepository } from '../../test-support/case-fakes';
import { ListCustomStates } from './list-custom-states.use-case';

class SpyCaseQuery extends UnusedCaseRepository implements CaseRepository {
  askedFor: JurisdictionCode | undefined | 'nunca' = 'nunca';

  constructor(private readonly states: string[] = []) {
    super();
  }

  async search(_criteria: CaseSearchCriteria): Promise<CasePage> {
    return { items: [], totalItems: 0 };
  }

  async findListItemById(): Promise<CaseListItem | null> {
    return null;
  }

  async listCustomStates(jurisdiction?: JurisdictionCode): Promise<string[]> {
    this.askedFor = jurisdiction;
    return this.states;
  }
}

describe('ListCustomStates', () => {
  it('devuelve lo que da el puerto, tal cual', async () => {
    const query = new SpyCaseQuery(['Con acusación, pero con oposición']);

    expect(await new ListCustomStates(query).execute()).toEqual([
      'Con acusación, pero con oposición',
    ]);
  });

  it('sin fuero, no filtra', async () => {
    const query = new SpyCaseQuery();

    await new ListCustomStates(query).execute();

    expect(query.askedFor).toBeUndefined();
  });

  it('normaliza el fuero a mayúsculas', async () => {
    const query = new SpyCaseQuery();

    await new ListCustomStates(query).execute({ jurisdiction: ' criminal ' });

    expect(query.askedFor).toBe(JurisdictionCode.CRIMINAL);
  });

  it('un fuero vacío es "sin filtro", no un error', async () => {
    const query = new SpyCaseQuery();

    await new ListCustomStates(query).execute({ jurisdiction: '  ' });

    expect(query.askedFor).toBeUndefined();
  });

  it('rechaza un fuero inexistente con INVALID_REQUEST', async () => {
    const query = new SpyCaseQuery();

    // "PENAL" es el rótulo, no el código: el código es CRIMINAL.
    await expect(new ListCustomStates(query).execute({ jurisdiction: 'PENAL' })).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      details: { jurisdiction: 'No existe un fuero procesal con ese nombre.' },
    });

    expect(query.askedFor).toBe('nunca');
  });

  it('el error es de validación, o sea 400', async () => {
    await expect(
      new ListCustomStates(new SpyCaseQuery()).execute({ jurisdiction: 'XX' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
