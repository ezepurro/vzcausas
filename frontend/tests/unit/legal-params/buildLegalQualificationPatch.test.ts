import { describe, expect, it } from 'vitest'
import {
    buildLegalQualificationPatch,
    isEmptyLegalQualificationPatch,
} from '@/features/legal-params/utils/buildLegalQualificationPatch'
import type {
    LegalQualification,
    LegalQualificationFormValues,
} from '@/features/legal-params/types/legalQualification'

/**
 * El cuerpo de `PATCH /legal-qualifications/{id}` (HU-49): sólo lo que cambió.
 * El contrato responde 400 a un PATCH vacío (CA-49.1), así que sin cambios la
 * pantalla no llama.
 */

const ORIGINAL: LegalQualification = {
    id: 8,
    name: 'Abuso de armas — art. 104 CP',
    prescriptionMonths: 78,
    activeCases: 2,
    active: true,
}

/** Lo que precarga el formulario al abrir la edición. */
const UNCHANGED: LegalQualificationFormValues = {
    name: 'Abuso de armas — art. 104 CP',
    years: '6',
    months: '6',
}

describe('buildLegalQualificationPatch', () => {
    it('sin cambios devuelve un parche vacío', () => {
        const patch = buildLegalQualificationPatch(ORIGINAL, UNCHANGED)

        expect(patch).toEqual({})
        expect(isEmptyLegalQualificationPatch(patch)).toBe(true)
    })

    it('recorta el nombre antes de comparar: un espacio de más no es un cambio', () => {
        expect(buildLegalQualificationPatch(ORIGINAL, { ...UNCHANGED, name: '  Abuso de armas — art. 104 CP ' })).toEqual({})
    })

    it('manda sólo el nombre si sólo cambió el nombre, recortado', () => {
        expect(buildLegalQualificationPatch(ORIGINAL, { ...UNCHANGED, name: ' Abuso de armas — art. 104 inc. 1 CP ' }))
            .toEqual({ name: 'Abuso de armas — art. 104 inc. 1 CP' })
    })

    /* CA-49.3: el plazo viaja como total de meses. */
    it('manda sólo el plazo, en meses, si sólo cambió el plazo', () => {
        const patch = buildLegalQualificationPatch(ORIGINAL, { ...UNCHANGED, years: '7', months: '0' })

        expect(patch).toEqual({ prescriptionMonths: 84 })
        expect(isEmptyLegalQualificationPatch(patch)).toBe(false)
    })

    it('el mismo plazo escrito de otra forma no es un cambio', () => {
        // Se compara en meses: "06" años y 6 meses siguen siendo 78.
        expect(buildLegalQualificationPatch(ORIGINAL, { ...UNCHANGED, years: '06' })).toEqual({})
    })

    it('manda los dos si cambiaron los dos', () => {
        expect(buildLegalQualificationPatch(ORIGINAL, { name: 'Otra', years: '2', months: '0' }))
            .toEqual({ name: 'Otra', prescriptionMonths: 24 })
    })
})
