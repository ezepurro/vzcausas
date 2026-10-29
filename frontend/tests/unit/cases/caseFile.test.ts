import { describe, expect, it } from 'vitest'
import type { CaseDocument } from '@/features/cases/types/caseDocument'
import type { GeneratedCaseFile } from '@/features/cases/types/caseFile'
import {
    caseFileNamePreview,
    caseFileSummary,
    excludedDocuments,
    generatedCaseFileMeta,
    initialSelection,
    moveItem,
    opposingPartyField,
    selectedDocuments,
    toCaseFileFormErrors,
    toCreateCaseFileBody,
} from '@/features/cases/utils/caseFile'

function doc(id: string, overrides: Partial<CaseDocument> = {}): CaseDocument {
    return {
        id,
        name: `${id}.pdf`,
        extension: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        createdAt: '2026-09-15T10:00:00-03:00',
        modifiedAt: '2026-09-15T10:00:00-03:00',
        uploadedBy: 'Gestión Estudio',
        url: `https://drive.google.com/file/d/${id}/view`,
        convertibleToPdf: true,
        caseFile: null,
        ...overrides,
    }
}

const ESCRITO = doc('escrito')
const CEDULA = doc('cedula', { sizeBytes: 2048 })
const PLANILLA = doc('planilla', { extension: null, sizeBytes: null, convertibleToPdf: false })
const EXPEDIENTE_V1 = doc('exp1', { caseFile: { id: 4, version: 1 } })
const FOLDER = [ESCRITO, CEDULA, PLANILLA, EXPEDIENTE_V1]

describe('selección de documentos (HU25)', () => {
    it('arranca con los convertibles que no son expediente, en el orden de la carpeta', () => {
        expect(initialSelection(FOLDER)).toEqual(['escrito', 'cedula'])
    })

    it('los no incluidos son los que se ofrecen y no se eligieron: nunca un expediente (CA-25.3)', () => {
        expect(excludedDocuments(FOLDER, ['cedula']).map((d) => d.id)).toEqual(['escrito', 'planilla'])
    })

    it('los elegidos salen en el orden de la selección y sin ids que ya no están', () => {
        expect(selectedDocuments(FOLDER, ['cedula', 'borrado', 'escrito']).map((d) => d.id)).toEqual(['cedula', 'escrito'])
    })
})

describe('moveItem', () => {
    it('sube y baja un elemento', () => {
        expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
        expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    })

    it('fuera de rango deja la lista como estaba', () => {
        expect(moveItem(['a', 'b'], 0, 2)).toEqual(['a', 'b'])
        expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b'])
    })
})

describe('opposingPartyField (D-92)', () => {
    it('defensa: se pide el querellante', () => {
        expect(opposingPartyField({ jurisdiction: 'CRIMINAL', proceduralRole: 'DEFENSA' })?.label).toBe('Querellante')
    })

    it('querellante particular: se pide el imputado', () => {
        expect(opposingPartyField({ jurisdiction: 'CRIMINAL', proceduralRole: 'QUERELLANTE_PARTICULAR' })?.label).toBe('Imputado')
    })

    it('fuera del penal no se pide', () => {
        expect(opposingPartyField({ jurisdiction: 'AMPARO', proceduralRole: 'ACTORA' })).toBeNull()
    })
})

describe('resultado', () => {
    it('estima la versión siguiente a la más alta de la carpeta (CA-25.6)', () => {
        expect(caseFileNamePreview({ id: 1, sacNumber: '13284571' }, FOLDER)).toBe('Expediente_13284571_v2.pdf')
        expect(caseFileNamePreview({ id: 23, sacNumber: null }, [])).toBe('Expediente_causa-23_v1.pdf')
    })

    it('cuenta la carátula como una parte más y suma los pesos conocidos', () => {
        expect(caseFileSummary([ESCRITO, CEDULA, PLANILLA])).toBe(
            '4 partes en un solo PDF · 3 KB aprox. Se guarda en la carpeta de la causa en Drive.',
        )
        expect(caseFileSummary([])).toBe('1 parte en un solo PDF. Se guarda en la carpeta de la causa en Drive.')
    })

    it('arma "Versión 2 · 3 partes · 561 KB" con la respuesta (CA-25.9)', () => {
        const result = {
            document: doc('nuevo', { sizeBytes: 574464, caseFile: { id: 5, version: 2 } }),
            version: 2,
            pageCount: 9,
            parts: [
                { position: 1, kind: 'COVER', documentId: null, name: 'Carátula' },
                { position: 2, kind: 'DOCUMENT', documentId: 'escrito', name: 'escrito.pdf' },
                { position: 3, kind: 'DOCUMENT', documentId: 'cedula', name: 'cedula.pdf' },
            ],
            generatedBy: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
            generatedAt: '2026-09-15T10:48:00-03:00',
        } satisfies GeneratedCaseFile
        expect(generatedCaseFileMeta(result)).toBe('Versión 2 · 3 partes · 561 KB')
    })
})

describe('toCreateCaseFileBody', () => {
    it('sin textos no manda cover, y respeta el orden de los documentos (CA-25.1)', () => {
        expect(toCreateCaseFileBody({ opposingParty: '', notes: '  ' }, ['b', 'a'], 'CRIMINAL')).toEqual({
            documentIds: ['b', 'a'],
        })
    })

    it('en el penal manda la parte y las observaciones, recortadas (CA-25.5)', () => {
        expect(
            toCreateCaseFileBody({ opposingParty: ' PERALTA Juan\nAPODERADO: Sosa ', notes: ' Conexa ' }, ['a'], 'CRIMINAL'),
        ).toEqual({ cover: { opposingParty: 'PERALTA Juan\nAPODERADO: Sosa', notes: 'Conexa' }, documentIds: ['a'] })
    })

    it('fuera del penal nunca manda la parte', () => {
        expect(toCreateCaseFileBody({ opposingParty: 'X', notes: 'Obs' }, ['a'], 'ADMINISTRATIVE')).toEqual({
            cover: { notes: 'Obs' },
            documentIds: ['a'],
        })
    })
})

describe('toCaseFileFormErrors', () => {
    it('lleva cada detalle del 400 a su campo', () => {
        expect(
            toCaseFileFormErrors({
                documentIds: 'Elegí al menos un documento.',
                cover: 'La parte de la carátula solo corresponde al fuero penal.',
                'cover.notes': 'Puede tener hasta 500 caracteres.',
                otro: 'se descarta',
            }),
        ).toEqual({
            documentIds: 'Elegí al menos un documento.',
            opposingParty: 'La parte de la carátula solo corresponde al fuero penal.',
            notes: 'Puede tener hasta 500 caracteres.',
        })
        expect(toCaseFileFormErrors(null)).toEqual({})
    })
})
