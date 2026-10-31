import { NotFoundError } from '@shared/domain/domain-error';
import { CaseListItem, CaseRepository } from '../../../domain/ports/case/case.repository';
import { CoverPdfPort } from '../../../domain/ports/case/cover-pdf.port';
import { JurisdictionCode } from '../../../domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../../domain/value-objects/case/procedural-role';
import { CoverSheet } from '../../../domain/value-objects/case/cover-sheet.vo';
import { UnusedCaseRepository } from '../../../test-support/case-fakes';
import { CLIENT, LAWYER, day } from '../../../test-support/case-fixtures';
import { GetCaseCover } from './get-case-cover.use-case';

/** Hands out the given items one per read, so a test can change the data between two emissions. */
class StubCaseQuery extends UnusedCaseRepository implements CaseRepository {
  askedFor: number[] = [];
  private reads = 0;

  constructor(private readonly items: Array<CaseListItem | null>) {
    super();
  }

  async findListItemById(id: number): Promise<CaseListItem | null> {
    this.askedFor.push(id);
    return this.items[Math.min(this.reads++, this.items.length - 1)];
  }
}

class RecordingCoverPdf implements CoverPdfPort {
  sheets: CoverSheet[] = [];

  async render(sheet: CoverSheet): Promise<Uint8Array> {
    this.sheets.push(sheet);
    return Buffer.from('%PDF-fake');
  }
}

function anItem(overrides: Partial<CaseListItem> = {}): CaseListItem {
  return {
    id: 7,
    sacNumber: '13284571',
    caption: 'Sánchez, Celia p.s.a. Robo calificado',
    court: 'Juzgado de Control N° 3',
    jurisdiction: JurisdictionCode.CRIMINAL,
    proceduralRole: ProceduralRole.DEFENSA,
    instructorName: null,
    tribunalPhone: null,
    instructorExtension: null,
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
    legalQualifications: [],
    lastInterruptiveActDate: null,
    prescription: null,
    prescriptionDeclaration: null,
    startDate: day('2026-09-01'),
    currentState: {
      proceduralStateId: 4,
      name: 'Alegato',
      custom: false,
      initial: false,
      proceduralActId: 18,
      dueDate: null,
      businessDaysRemaining: null,
      manuallyAdjusted: false,
    },
    folder: null,
    active: true,
    ...overrides,
  };
}

describe('GetCaseCover', () => {
  it('fails with CASE_NOT_FOUND and never renders when the case does not exist or was deactivated (CA-24.11)', async () => {
    const pdf = new RecordingCoverPdf();
    const useCase = new GetCaseCover(new StubCaseQuery([null]), pdf);

    await expect(useCase.execute({ id: 999 })).rejects.toMatchObject({ code: 'CASE_NOT_FOUND' });
    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
    expect(pdf.sheets).toEqual([]);
  });

  it('hands the sheet of the case to the port and returns the PDF with its file name', async () => {
    const query = new StubCaseQuery([anItem()]);
    const pdf = new RecordingCoverPdf();

    const result = await new GetCaseCover(query, pdf).execute({ id: 7 });

    expect(query.askedFor).toEqual([7]);
    expect(pdf.sheets).toHaveLength(1);
    expect(pdf.sheets[0].sacNumber).toBe('13284571');
    expect(pdf.sheets[0].defendant).toEqual(['GÓMEZ ARIEL FERNANDO', 'DEFENSOR: DR. MALENA RÍOS']);
    expect(Buffer.from(result.content).toString()).toBe('%PDF-fake');
    expect(result.fileName).toBe('Caratula_13284571.pdf');
  });

  it('follows the current data: a client changed between two emissions shows on the second (CA-24.8)', async () => {
    const query = new StubCaseQuery([
      anItem(),
      anItem({ client: { ...CLIENT, lastName: 'PÉREZ', firstName: 'Julia' } }),
    ]);
    const pdf = new RecordingCoverPdf();
    const useCase = new GetCaseCover(query, pdf);

    await useCase.execute({ id: 7 });
    await useCase.execute({ id: 7 });

    expect(pdf.sheets[0].defendant[0]).toBe('GÓMEZ ARIEL FERNANDO');
    expect(pdf.sheets[1].defendant[0]).toBe('PÉREZ JULIA');
  });

  it('a case without a Drive folder is still emitted (CA-24.9)', async () => {
    const pdf = new RecordingCoverPdf();

    const result = await new GetCaseCover(new StubCaseQuery([anItem({ folder: null })]), pdf).execute({ id: 7 });

    expect(pdf.sheets).toHaveLength(1);
    expect(result.fileName).toBe('Caratula_13284571.pdf');
  });
});
