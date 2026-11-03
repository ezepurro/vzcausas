import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ValidationError } from '@shared/domain/domain-error';
import { CaseFolderNotAvailableError, CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CaseListItem, CaseRepository } from '../../../domain/ports/case/case.repository';
import {
  CaseDocumentFile,
  CaseDocumentItem,
  CaseDocumentsPort,
  GenerateCaseFileInput,
  GeneratedCaseFile,
} from '../../../domain/ports/case/case-documents.port';
import { CoverPdfPort } from '../../../domain/ports/case/cover-pdf.port';
import { CoverSheet } from '../../../domain/value-objects/case/cover-sheet.vo';
import { JurisdictionCode } from '../../../domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../../domain/value-objects/case/procedural-role';
import { UnusedCaseRepository } from '../../../test-support/case-fakes';
import { FakeCaseFolderState } from '../../../test-support/case-folder-fakes';
import { CLIENT, LAWYER } from '../../../test-support/case-fixtures';
import { GenerateCaseFile } from './generate-case-file.use-case';

/* HU25 · Generar el expediente: lo que decide `cases` antes de pedírselo a `documents`. */

const CASE_ID = 7;
const ACTOR: AuthenticatedUser = { userId: 5, roleNames: ['SECRETARY'], lawyerId: null, permissions: [] };
const COVER_BYTES = Buffer.from('%PDF-caratula');

/** Only what the cover sheet reads; the rest of the read model plays no part here. */
const anItem = (overrides: Partial<CaseListItem> = {}) =>
  ({
    id: CASE_ID,
    sacNumber: '13284571',
    caption: 'Sánchez, Celia p.s.a. Robo calificado',
    court: 'Juzgado de Control N° 3',
    jurisdiction: JurisdictionCode.CRIMINAL,
    proceduralRole: ProceduralRole.DEFENSA,
    instructorName: null,
    counterparty: null,
    client: CLIENT,
    responsibleLawyer: LAWYER,
    ...overrides,
  }) as CaseListItem;

class StubCases extends UnusedCaseRepository implements CaseRepository {
  item: CaseListItem | null = anItem();

  async findListItemById(): Promise<CaseListItem | null> {
    return this.item;
  }
}

class RecordingCoverPdf implements CoverPdfPort {
  sheets: CoverSheet[] = [];

  async render(sheet: CoverSheet): Promise<Uint8Array> {
    this.sheets.push(sheet);
    return COVER_BYTES;
  }
}

const GENERATED = { version: 1, pageCount: 2 } as GeneratedCaseFile;

class RecordingDocuments implements CaseDocumentsPort {
  generated: GenerateCaseFileInput[] = [];

  async list(): Promise<CaseDocumentItem[]> {
    throw new Error('No se usa en este spec.');
  }

  async download(): Promise<CaseDocumentFile> {
    throw new Error('No se usa en este spec.');
  }

  async generateCaseFile(input: GenerateCaseFileInput): Promise<GeneratedCaseFile> {
    this.generated.push(input);
    return GENERATED;
  }
}

let folders: FakeCaseFolderState;
let cases: StubCases;
let coverPdf: RecordingCoverPdf;
let documents: RecordingDocuments;

const generate = (request: Parameters<GenerateCaseFile['execute']>[0]['request'] = { documentIds: ['a', 'b'] }) =>
  new GenerateCaseFile(folders, cases, coverPdf, documents).execute({ caseId: CASE_ID, request, actor: ACTOR });

beforeEach(async () => {
  folders = new FakeCaseFolderState();
  cases = new StubCases();
  coverPdf = new RecordingCoverPdf();
  documents = new RecordingDocuments();
  await folders.markCreated(CASE_ID, 'folder-ref');
});

describe('GenerateCaseFile', () => {
  it('un pedido sin documentos responde 400 sin leer la causa (CA-25.2)', async () => {
    folders.remove(CASE_ID);

    await expect(generate({ documentIds: [] })).rejects.toBeInstanceOf(ValidationError);
  });

  it('una causa inexistente o dada de baja es 404, sin dibujar ni llamar a documents (CA-25.12)', async () => {
    folders.remove(CASE_ID);

    await expect(generate()).rejects.toBeInstanceOf(CaseNotFoundError);
    expect(coverPdf.sheets).toEqual([]);
    expect(documents.generated).toEqual([]);
  });

  it.each([['PENDING'], ['CREATING'], ['ERROR'], [null]] as const)(
    'con la carpeta en %s es 422, sin dibujar ni llamar a documents (CA-25.7)',
    async (status) => {
      folders.set(CASE_ID, status);

      await expect(generate()).rejects.toBeInstanceOf(CaseFolderNotAvailableError);
      expect(coverPdf.sheets).toEqual([]);
      expect(documents.generated).toEqual([]);
    },
  );

  it('la parte de la carátula en un amparo es 400, antes de dibujar (CA-25.5)', async () => {
    cases.item = anItem({ jurisdiction: JurisdictionCode.AMPARO, proceduralRole: ProceduralRole.ACTORA });

    await expect(generate({ documentIds: ['a'], cover: { opposingParty: 'X' } })).rejects.toMatchObject({
      details: { cover: 'La parte de la carátula solo corresponde al fuero penal.' },
    });
    expect(coverPdf.sheets).toEqual([]);
  });

  it('dibuja la carátula con lo de cover y le pasa a documents la carpeta, el SAC, la carátula, los ids y el actor (CA-25.1, 25.5)', async () => {
    const result = await generate({ documentIds: ['b', 'a'], cover: { notes: 'Conexa', opposingParty: 'Peralta' } });

    expect(coverPdf.sheets[0]).toMatchObject({ observations: ['CONEXA'], plaintiff: ['PERALTA'] });
    expect(documents.generated).toEqual([
      {
        caseId: CASE_ID,
        sacNumber: '13284571',
        cloudFolderId: 'folder-ref',
        coverPdf: COVER_BYTES,
        documentIds: ['b', 'a'],
        actor: ACTOR,
      },
    ]);
    expect(result).toBe(GENERATED);
  });
});
