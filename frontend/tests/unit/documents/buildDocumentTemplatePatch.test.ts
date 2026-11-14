import { describe, expect, it } from 'vitest'
import { buildDocumentTemplatePatch, hasChanges } from '@/features/documents/utils/buildDocumentTemplatePatch'
import type { DocumentTemplate, DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'

/**
 * Lo que cambió en "Modificar modelo formal" (HU36): todo es opcional, pero un
 * PATCH vacío es un 400 (CA-36.1), así que sin cambios no se manda nada. El
 * cuerpo es `multipart/form-data`; lo arma aparte `toUpdateDocumentTemplateBody`.
 *
 * @backend CA-36.6 CA-36.7
 * (las copias del archivo en las subcarpetas de cada fuero y que las causas
 * no cambien los resuelve el backend)
 */

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** "Recurso de casación" (4) del mock: penal, se copia, `casacion.docx`. */
const CASACION: DocumentTemplate = {
    id: 4,
    name: 'Recurso de casación',
    jurisdictions: ['CRIMINAL'],
    fileName: 'casacion.docx',
    copyToNewCases: true,
    lastVersionAt: '2026-05-02T10:00:00-03:00',
    lastVersionBy: { id: 6, lastName: 'Ferreyra', firstName: 'Matías' },
    usageCount: 4,
    active: true,
}

/** El formulario recién abierto: los datos del modelo y ningún archivo nuevo. */
const SAME: DocumentTemplateFormValues = {
    name: 'Recurso de casación',
    jurisdictions: ['CRIMINAL'],
    copyToNewCases: true,
    file: null,
}

describe('buildDocumentTemplatePatch', () => {
    // CA-36.1: una petición sin ningún campo es un 400, así que no se manda.
    it('sin cambios devuelve un cambio vacío', () => {
        const patch = buildDocumentTemplatePatch(CASACION, SAME)
        expect(patch).toEqual({})
        expect(hasChanges(patch)).toBe(false)
    })

    // CA-36.1: viaja sólo lo que cambió, recortado.
    it('manda sólo el nombre si sólo cambió el nombre, y un espacio de más no es un cambio', () => {
        expect(buildDocumentTemplatePatch(CASACION, { ...SAME, name: ' Recurso de casación  ' })).toEqual({})
        const patch = buildDocumentTemplatePatch(CASACION, { ...SAME, name: '  Recurso de casación penal ' })
        expect(patch).toEqual({ name: 'Recurso de casación penal' })
        expect(hasChanges(patch)).toBe(true)
    })

    // CA-36.2 (D-125): la lista reemplaza a la anterior entera; el orden no importa.
    it('los mismos fueros en otro orden no son un cambio; otro conjunto viaja entero', () => {
        const both: DocumentTemplate = { ...CASACION, jurisdictions: ['CRIMINAL', 'AMPARO'] }
        expect(buildDocumentTemplatePatch(both, { ...SAME, jurisdictions: ['AMPARO', 'CRIMINAL'] })).toEqual({})
        expect(buildDocumentTemplatePatch(CASACION, { ...SAME, jurisdictions: ['CRIMINAL', 'AMPARO'] })).toEqual({
            jurisdictions: ['CRIMINAL', 'AMPARO'],
        })
        expect(buildDocumentTemplatePatch(both, { ...SAME, jurisdictions: ['AMPARO'] })).toEqual({
            jurisdictions: ['AMPARO'],
        })
    })

    // CA-36.4: el archivo es opcional; si se elige uno, reemplaza al del modelo.
    it('el archivo viaja sólo si se eligió uno nuevo', () => {
        const file = new File(['x'], 'casacion-2026.docx', { type: DOCX })
        expect(buildDocumentTemplatePatch(CASACION, SAME)).not.toHaveProperty('file')
        expect(buildDocumentTemplatePatch(CASACION, { ...SAME, file })).toEqual({ file })
    })

    // CA-36.1: "Copiar en las causas nuevas de los fueros elegidos".
    it('cambiar si se copia a las causas nuevas lo manda', () => {
        expect(buildDocumentTemplatePatch(CASACION, { ...SAME, copyToNewCases: false })).toEqual({ copyToNewCases: false })
    })
})
