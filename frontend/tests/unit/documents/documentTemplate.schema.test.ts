import { describe, expect, it } from 'vitest'
import { validateDocumentTemplate } from '@/features/documents/schemas/documentTemplate.schema'
import type { DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'

/**
 * La validación del alta de modelo formal (HU-34), antes de subir el archivo.
 * Los mensajes son los del contrato (V4 §3.10, `POST /document-templates`).
 * El modelo no tiene tipo (V4 D-56).
 */

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function file(name: string, bytes = 1024, type = DOCX): File {
    const f = new File(['x'], name, { type })
    Object.defineProperty(f, 'size', { value: bytes })
    return f
}

const VALID: DocumentTemplateFormValues = {
    name: 'Recurso de queja',
    jurisdictions: ['CRIMINAL'],
    copyToNewCases: true,
    file: file('recurso-de-queja.docx'),
}

describe('validateDocumentTemplate', () => {
    it('un modelo completo no tiene errores', () => {
        expect(validateDocumentTemplate(VALID)).toEqual({})
    })

    // CA-34.4
    it('el nombre, al menos un fuero y el archivo son obligatorios', () => {
        expect(validateDocumentTemplate({ ...VALID, name: ' ', jurisdictions: [], file: null })).toEqual({
            name: 'El nombre del modelo es obligatorio.',
            jurisdictions: 'Elegí al menos un fuero.',
            file: 'El archivo del modelo es obligatorio.',
        })
    })

    // CA-34.3
    it('sólo acepta documentos Word (.docx)', () => {
        expect(validateDocumentTemplate({ ...VALID, file: file('modelo.pdf', 1024, 'application/pdf') })).toEqual({
            file: 'El archivo tiene que ser .docx.',
        })
    })

    // CA-34.10: 10 MB justos sí, un byte más no.
    it('el archivo no puede pesar más de 10 MB', () => {
        const max = 10 * 1024 * 1024
        expect(validateDocumentTemplate({ ...VALID, file: file('modelo.docx', max) })).toEqual({})
        expect(validateDocumentTemplate({ ...VALID, file: file('modelo.docx', max + 1) })).toEqual({
            file: 'El archivo supera el tamaño máximo de 10 MB.',
        })
    })

    // V4 §3.10: el nombre, hasta 150.
    it('el nombre admite hasta 150 caracteres', () => {
        expect(validateDocumentTemplate({ ...VALID, name: 'a'.repeat(150) })).toEqual({})
        expect(validateDocumentTemplate({ ...VALID, name: 'a'.repeat(151) })).toEqual({
            name: 'Puede tener hasta 150 caracteres.',
        })
    })
})
