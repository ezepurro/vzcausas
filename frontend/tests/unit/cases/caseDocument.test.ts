import { describe, expect, it } from 'vitest'
import { documentDownloadName, documentTypeLabel, formatFileSize } from '@/features/cases/utils/caseDocument'

/**
 * El renglón de cada documento en la tarjeta "Documentación" (HU38, CA-38.4):
 * el tipo como lo muestra el prototipo y el peso. El tipo sale de la extensión
 * o, si no hay, del `mimeType` (V5 §3.12).
 */
describe('documentTypeLabel', () => {
    it('reconoce las extensiones del prototipo', () => {
        expect(documentTypeLabel({ extension: 'pdf', mimeType: 'application/pdf' })).toBe('PDF')
        expect(documentTypeLabel({ extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe('DOC')
        expect(documentTypeLabel({ extension: 'doc', mimeType: 'application/msword' })).toBe('DOC')
        expect(documentTypeLabel({ extension: 'jpg', mimeType: 'image/jpeg' })).toBe('IMG')
        expect(documentTypeLabel({ extension: 'png', mimeType: 'image/png' })).toBe('IMG')
    })

    it('una extensión que no conoce es un archivo genérico', () => {
        expect(documentTypeLabel({ extension: 'xlsx', mimeType: 'application/vnd.ms-excel' })).toBe('ARCH')
    })

    it('un documento de Google, sin extensión, es DOC; una hoja de cálculo de Google, no', () => {
        expect(documentTypeLabel({ extension: null, mimeType: 'application/vnd.google-apps.document' })).toBe('DOC')
        expect(documentTypeLabel({ extension: null, mimeType: 'application/vnd.google-apps.spreadsheet' })).toBe('ARCH')
    })
})

describe('formatFileSize', () => {
    it('muestra bytes, KB redondeados y MB con un decimal', () => {
        expect(formatFileSize(512)).toBe('512 B')
        expect(formatFileSize(90_112)).toBe('88 KB')
        expect(formatFileSize(1_310_720)).toBe('1,3 MB')
    })

    it('sin tamaño (un documento nativo de Google) no hay nada que mostrar', () => {
        expect(formatFileSize(null)).toBeNull()
    })
})

/**
 * El nombre con que se guarda "Descargar" (CA-38.7). Un nativo de Google sale
 * exportado a PDF (V5 `:7595`), así que gana ".pdf", como el nombre que pone el
 * backend.
 */
describe('documentDownloadName', () => {
    it('un archivo común se guarda con su nombre', () => {
        expect(documentDownloadName({ name: 'Cédula de notificación.pdf', mimeType: 'application/pdf' })).toBe('Cédula de notificación.pdf')
        expect(documentDownloadName({ name: 'Escrito.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe('Escrito.docx')
    })

    it('un documento o una hoja de cálculo de Google se guarda como PDF', () => {
        expect(documentDownloadName({ name: 'Notas de la indagatoria', mimeType: 'application/vnd.google-apps.document' })).toBe('Notas de la indagatoria.pdf')
        expect(documentDownloadName({ name: 'Planilla de gastos', mimeType: 'application/vnd.google-apps.spreadsheet' })).toBe('Planilla de gastos.pdf')
    })
})
