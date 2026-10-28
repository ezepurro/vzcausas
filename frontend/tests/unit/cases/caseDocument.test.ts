import { describe, expect, it } from 'vitest'
import { documentTypeLabel, formatFileSize } from '@/features/cases/utils/caseDocument'

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
