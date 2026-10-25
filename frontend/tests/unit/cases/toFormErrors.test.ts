import { describe, expect, it } from 'vitest'
import { toFormErrors } from '@/features/cases/utils/toFormErrors'
import { toInterruptiveActFormErrors } from '@/features/cases/utils/toInterruptiveActFormErrors'
import { toPrescriptionDeclarationFormErrors } from '@/features/cases/utils/toPrescriptionDeclarationFormErrors'

describe('toFormErrors (alta de causa)', () => {
    it('pasa los campos que el formulario muestra', () => {
        expect(toFormErrors({ clientId: 'No existe un cliente vigente.', sacNumber: 'Ocho dígitos.' })).toEqual({
            clientId: 'No existe un cliente vigente.',
            sacNumber: 'Ocho dígitos.',
        })
    })

    it('descarta las casillas y las claves que el formulario no pinta', () => {
        expect(
            toFormErrors({
                courtFeePaid: 'property courtFeePaid should not exist',
                createFolder: 'property createFolder should not exist',
                copyTemplates: 'Para copiar los modelos primero hay que crear la carpeta de la causa.',
            }),
        ).toEqual({})
    })

    it('sin details no hay errores', () => {
        expect(toFormErrors(null)).toEqual({})
    })
})

describe('toInterruptiveActFormErrors', () => {
    it('pasa los campos del modal y descarta el resto', () => {
        expect(
            toInterruptiveActFormErrors({ actDate: 'No puede ser posterior a hoy.', caseId: 'Debe ser un número entero válido.' }),
        ).toEqual({ actDate: 'No puede ser posterior a hoy.' })
    })
})

describe('toPrescriptionDeclarationFormErrors', () => {
    it('pasa los campos del modal y descarta el resto', () => {
        expect(
            toPrescriptionDeclarationFormErrors({ resolution: 'Es obligatoria.', caseId: 'Debe ser un número entero válido.' }),
        ).toEqual({ resolution: 'Es obligatoria.' })
    })
})
