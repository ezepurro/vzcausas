import { describe, expect, it } from 'vitest'
import { addMonths } from '@/shared/mocks'
import { estimatedExpiry } from '@/features/cases/utils/prescription'

/**
 * La suma de meses de la prescripción en el mock. Decisión del equipo del
 * 13/11/2026: vale lo que hace el backend (`addPrescriptionMonths`), que en un
 * mes más corto cae en su último día. Antes el mock seguía al prototipo y se
 * pasaba al mes siguiente, así que el vencimiento del mock no coincidía con el
 * que estima el alta ni con el del backend.
 */
describe('addMonths del mock', () => {
    it.each([
        ['2021-08-31', 6, '2022-02-28'],
        ['2023-08-31', 6, '2024-02-29'],
        ['2022-01-31', 1, '2022-02-28'],
        ['2022-03-31', 1, '2022-04-30'],
        ['2020-02-29', 12, '2021-02-28'],
    ])('%s más %i meses cae en el último día del mes: %s', (from, months, expected) => {
        expect(addMonths(from, months)).toBe(expected)
    })

    it('un día que existe en el mes de destino se conserva', () => {
        expect(addMonths('2021-02-27', 96)).toBe('2029-02-27')
        expect(addMonths('2022-01-19', 72)).toBe('2028-01-19')
    })

    it('coincide con la estimación del alta de causa', () => {
        for (const [from, months] of [['2021-08-31', 6], ['2022-01-30', 13], ['2021-02-27', 96]] as const) {
            expect(addMonths(from, months)).toBe(estimatedExpiry(from, months))
        }
    })
})
