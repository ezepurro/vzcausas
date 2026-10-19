import { describe, expect, it } from 'vitest'
import { validatePrescriptionDeclaration } from '@/features/cases/schemas/prescriptionDeclaration.schema'
import type { PrescriptionDeclarationFormValues } from '@/features/cases/types/prescriptionDeclaration'
import { usePrototypeToday } from '../../setup/clock'

/**
 * La validación del modal "Marcar prescripta" (HU-33). Los mensajes son los
 * del contrato (V4 §3.7, `POST /cases/{caseId}/prescription`).
 */

const VALID: PrescriptionDeclarationFormValues = {
    prescriptionDate: '2026-09-15',
    resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
    grounds: '',
}

describe('validatePrescriptionDeclaration', () => {
    usePrototypeToday()

    // CA-33.3: el fundamento es opcional.
    it('una marca completa no tiene errores', () => {
        expect(validatePrescriptionDeclaration(VALID)).toEqual({})
    })

    // CA-33.3
    it('la fecha y la resolución son obligatorias', () => {
        expect(validatePrescriptionDeclaration({ ...VALID, prescriptionDate: '', resolution: ' ' })).toEqual({
            prescriptionDate: 'La fecha de la prescripción es obligatoria.',
            resolution: 'La resolución que declara la prescripción es obligatoria.',
        })
    })

    // CA-33.3: hoy sí, mañana no.
    it('la fecha no puede ser posterior a hoy', () => {
        expect(validatePrescriptionDeclaration({ ...VALID, prescriptionDate: '2026-09-16' })).toEqual({
            prescriptionDate: 'No puede ser posterior a hoy.',
        })
    })

    // V4 §3.7: resolución hasta 255, fundamento hasta 2000.
    it('la resolución admite hasta 255 caracteres y el fundamento hasta 2000', () => {
        expect(
            validatePrescriptionDeclaration({ ...VALID, resolution: 'a'.repeat(256), grounds: 'b'.repeat(2001) }),
        ).toEqual({
            resolution: 'Puede tener hasta 255 caracteres.',
            grounds: 'Puede tener hasta 2000 caracteres.',
        })
    })
})
