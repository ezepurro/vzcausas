import { describe, expect, it } from 'vitest'
import { clearCaseDraft, readCaseDraft, writeCaseDraft } from '@/features/cases/utils/caseDraft'
import { emptyCaseForm } from '@/features/cases/utils/caseForm'
import { clearDrafts, draftKey } from '@/shared/lib/drafts'
import type { CaseFormValues } from '@/features/cases/types/case'

/**
 * El borrador del alta de causa: un caché del formulario en `sessionStorage`.
 * No es un criterio de HU18: ver `features/cases/CAMBIOS.md`.
 */

const USER = 7
const KEY = draftKey('case', USER)

const loaded = (): CaseFormValues => ({
    ...emptyCaseForm(),
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    clientId: '1',
    legalQualifications: [{ legalQualificationId: 1, offenseDate: '2021-02-27' }],
})

describe('caseDraft', () => {
    it('lo que se guarda se lee igual', () => {
        writeCaseDraft(USER, loaded())

        expect(readCaseDraft(USER)).toEqual(loaded())
    })

    it('el formulario vacío no se guarda, y borra lo que hubiera', () => {
        writeCaseDraft(USER, loaded())
        writeCaseDraft(USER, emptyCaseForm())

        expect(sessionStorage.getItem(KEY)).toBeNull()
        expect(readCaseDraft(USER)).toBeNull()
    })

    it('el borrador de un usuario no lo ve otro', () => {
        writeCaseDraft(USER, loaded())

        expect(readCaseDraft(USER + 1)).toBeNull()
    })

    it('clearCaseDraft lo borra', () => {
        writeCaseDraft(USER, loaded())
        clearCaseDraft(USER)

        expect(readCaseDraft(USER)).toBeNull()
    })

    describe('un borrador con otra forma se descarta y se borra', () => {
        const cases: [string, unknown][] = [
            ['le falta un campo', (() => {
                const { createFolder: _, ...rest } = loaded()
                return rest
            })()],
            ['le sobra un campo', { ...loaded(), oldField: 'x' }],
            ['un campo de texto es un número', { ...loaded(), caption: 12 }],
            ['una casilla es texto', { ...loaded(), createFolder: 'true' }],
            ['las calificaciones no son una lista', { ...loaded(), legalQualifications: {} }],
            ['una calificación no tiene id', { ...loaded(), legalQualifications: [{ offenseDate: '' }] }],
            ['no es un objeto', [1, 2, 3]],
        ]

        it.each(cases)('%s', (_, stored) => {
            sessionStorage.setItem(KEY, JSON.stringify(stored))

            expect(readCaseDraft(USER)).toBeNull()
            expect(sessionStorage.getItem(KEY)).toBeNull()
        })

        it('un JSON roto', () => {
            sessionStorage.setItem(KEY, '{"caption":')

            expect(readCaseDraft(USER)).toBeNull()
            expect(sessionStorage.getItem(KEY)).toBeNull()
        })
    })

    it('clearDrafts borra todos los borradores y nada más', () => {
        writeCaseDraft(USER, loaded())
        writeCaseDraft(USER + 1, loaded())
        sessionStorage.setItem('otra-cosa', 'queda')

        clearDrafts()

        expect(readCaseDraft(USER)).toBeNull()
        expect(readCaseDraft(USER + 1)).toBeNull()
        expect(sessionStorage.getItem('otra-cosa')).toBe('queda')
    })
})
