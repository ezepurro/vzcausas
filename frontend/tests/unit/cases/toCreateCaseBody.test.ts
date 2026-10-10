import { describe, expect, it } from 'vitest'
import { toCreateCaseBody } from '@/features/cases/utils/toCreateCaseBody'
import { changeJurisdiction, emptyCaseForm } from '@/features/cases/utils/caseForm'
import type { CaseFormValues } from '@/features/cases/types/case'

/**
 * De los valores del formulario al cuerpo de `POST /cases`.
 *
 * Lo que está vacío no viaja, y lo que es de un fuero no viaja en otro: el
 * contrato responde `400` si llegan calificaciones en un amparo o una
 * contraparte en el penal.
 */

const CRIMINAL: CaseFormValues = {
    ...emptyCaseForm(),
    sacNumber: '13284571',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    court: 'Juzgado de Control N° 3 · Córdoba',
    instructorName: 'Dra. Verónica Ledesma',
    tribunalPhone: '0351 448-1200',
    instructorExtension: '214',
    clientId: '1',
    proceduralRole: 'DEFENSA',
    legalQualifications: [{ legalQualificationId: 1, offenseDate: '2021-02-27' }],
    responsibleLawyerId: '3',
    startDate: '2021-03-12',
}

const AMPARO: CaseFormValues = {
    ...changeJurisdiction(CRIMINAL, 'AMPARO'),
    counterparty: 'APROSS',
    subjectMatter: 'Se ordene a APROSS la cobertura integral del tratamiento.',
}

describe('toCreateCaseBody', () => {
    /* CA-18.1: lo que la causa necesita siempre. */
    it('arma el cuerpo de una causa penal completa', () => {
        expect(toCreateCaseBody(CRIMINAL)).toEqual({
            sacNumber: '13284571',
            jurisdiction: 'CRIMINAL',
            caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
            court: 'Juzgado de Control N° 3 · Córdoba',
            instructorName: 'Dra. Verónica Ledesma',
            tribunalPhone: '0351 448-1200',
            instructorExtension: '214',
            clientId: 1,
            proceduralRole: 'DEFENSA',
            legalQualifications: [{ legalQualificationId: 1, offenseDate: '2021-02-27' }],
            responsibleLawyerId: 3,
            startDate: '2021-03-12',
        })
    })

    it('el cliente y el responsable viajan como números, no como el texto del select', () => {
        const body = toCreateCaseBody(CRIMINAL)

        expect(body.clientId).toBe(1)
        expect(body.responsibleLawyerId).toBe(3)
    })

    it('recorta los espacios de los textos', () => {
        const body = toCreateCaseBody({
            ...CRIMINAL,
            caption: '  GÓMEZ, Ariel Fernando p.s.a. Robo calificado  ',
            court: '  Juzgado de Control N° 3  ',
            instructorName: '  Dra. Verónica Ledesma  ',
        })

        expect(body.caption).toBe('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')
        expect(body.court).toBe('Juzgado de Control N° 3')
        expect(body.instructorName).toBe('Dra. Verónica Ledesma')
    })

    describe('número de SAC (CA-18.2)', () => {
        it('si no se informó, no viaja', () => {
            expect(toCreateCaseBody({ ...CRIMINAL, sacNumber: '' })).not.toHaveProperty('sacNumber')
            expect(toCreateCaseBody({ ...CRIMINAL, sacNumber: '   ' })).not.toHaveProperty('sacNumber')
        })

        it('si se informó, viaja recortado', () => {
            expect(toCreateCaseBody({ ...CRIMINAL, sacNumber: ' 13284571 ' }).sacNumber).toBe('13284571')
        })
    })

    it('el tribunal, el instructor, su teléfono y su interno vacíos no viajan', () => {
        const body = toCreateCaseBody({
            ...CRIMINAL,
            court: '',
            instructorName: '',
            tribunalPhone: '  ',
            instructorExtension: '',
        })

        expect(body).not.toHaveProperty('court')
        expect(body).not.toHaveProperty('instructorName')
        expect(body).not.toHaveProperty('tribunalPhone')
        expect(body).not.toHaveProperty('instructorExtension')
    })

    /* CA-18.2: la fecha de inicio va con el SAC. */
    describe('fecha de inicio (CA-18.2)', () => {
        it('con SAC viaja', () => {
            expect(toCreateCaseBody(CRIMINAL).startDate).toBe('2021-03-12')
        })

        it('vacía no viaja', () => {
            expect(toCreateCaseBody({ ...CRIMINAL, startDate: '' })).not.toHaveProperty('startDate')
        })

        it('sin SAC no viaja, aunque haya quedado una cargada', () => {
            expect(toCreateCaseBody({ ...CRIMINAL, sacNumber: '' })).not.toHaveProperty('startDate')
        })
    })

    describe('fuero penal (CA-18.4 y CA-18.5)', () => {
        it('manda cada calificación con su fecha del hecho', () => {
            const body = toCreateCaseBody({
                ...CRIMINAL,
                legalQualifications: [
                    { legalQualificationId: 3, offenseDate: '2026-08-30' },
                    { legalQualificationId: 4, offenseDate: '2026-09-02' },
                ],
            })

            expect(body.legalQualifications).toEqual([
                { legalQualificationId: 3, offenseDate: '2026-08-30' },
                { legalQualificationId: 4, offenseDate: '2026-09-02' },
            ])
        })

        /* CA-18.5: sin ninguna, el campo no viaja. */
        it('sin calificaciones, el campo no viaja', () => {
            expect(toCreateCaseBody({ ...CRIMINAL, legalQualifications: [] })).not.toHaveProperty('legalQualifications')
        })

        /* CA-18.4: la contraparte y el objeto no se cargan en el penal. */
        it('no manda la contraparte ni el objeto, aunque hayan quedado cargados', () => {
            const body = toCreateCaseBody({ ...CRIMINAL, counterparty: 'APROSS', subjectMatter: 'Cobertura.' })

            expect(body).not.toHaveProperty('counterparty')
            expect(body).not.toHaveProperty('subjectMatter')
        })
    })

    describe('fueros administrativo y de amparo (CA-18.4)', () => {
        it('arma el cuerpo con la contraparte y el objeto', () => {
            expect(toCreateCaseBody(AMPARO)).toMatchObject({
                jurisdiction: 'AMPARO',
                proceduralRole: 'ACTORA',
                counterparty: 'APROSS',
                subjectMatter: 'Se ordene a APROSS la cobertura integral del tratamiento.',
            })
        })

        it('no manda calificaciones legales, aunque hayan quedado cargadas', () => {
            const body = toCreateCaseBody({
                ...AMPARO,
                legalQualifications: [{ legalQualificationId: 1, offenseDate: '2021-02-27' }],
            })

            expect(body).not.toHaveProperty('legalQualifications')
        })

        it('la contraparte vacía no viaja, pero el objeto sí porque es obligatorio', () => {
            const body = toCreateCaseBody({ ...AMPARO, counterparty: '  ' })

            expect(body).not.toHaveProperty('counterparty')
            expect(body.subjectMatter).toBe('Se ordene a APROSS la cobertura integral del tratamiento.')
        })

        it('recorta el objeto', () => {
            expect(toCreateCaseBody({ ...AMPARO, subjectMatter: '  Cobertura integral.  ' }).subjectMatter).toBe(
                'Cobertura integral.',
            )
        })
    })
})
