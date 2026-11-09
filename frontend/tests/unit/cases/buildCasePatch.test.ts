import { describe, expect, it } from 'vitest'
import { buildCasePatch } from '@/features/cases/utils/buildCasePatch'
import { caseToFormValues } from '@/features/cases/utils/caseForm'
import type { Case, CaseFormValues } from '@/features/cases/types/case'

/**
 * Modificar causa (HU19): viaja sólo lo que cambió respecto de la causa
 * abierta (CA-19.2, decisión del 28/10/2026 en TESTING.md §11), y si cambia el
 * SAC la fecha de inicio va con él (CA-19.6).
 *
 * El punto de partida de cada caso es lo que precarga el diálogo al abrirse:
 * `caseToFormValues` de la causa.
 */

/** La causa 1 del prototipo: penal, con SAC y una calificación; sin interno. */
const CRIMINAL: Case = {
    id: 1,
    sacNumber: '13284571',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    court: 'Fisc. de Distrito I, 2º turno',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    instructorName: 'Dra. Verónica Ledesma',
    tribunalPhone: '0351 448-1200',
    instructorExtension: null,
    counterparty: null,
    subjectMatter: null,
    clientDetained: false,
    injunctionGranted: null,
    harmfulActDate: null,
    harmfulActRenews: null,
    harmfulActRenewalDays: null,
    harmfulActTermDays: null,
    harmfulActTermDayType: null,
    harmfulActDeadline: null,
    administrativeRemedyExhaustedOn: null,
    courtFeePaid: true,
    client: {
        id: 1,
        lastName: 'GÓMEZ',
        firstName: 'Ariel Fernando',
        documentType: 'DNI',
        documentNumber: '34812905',
        address: 'Av. Colón 1250, Córdoba',
        phone: '351 415-2288',
        email: null,
        clientSince: '2021-03-01',
    },
    responsibleLawyer: { id: 2, lastName: 'Ríos', firstName: 'Malena', registrationNumber: '1-30122' },
    legalQualifications: [
        {
            id: 1,
            name: 'Robo calificado (art. 166 CP)',
            prescriptionMonths: 180,
            offenseDate: '2021-02-27',
            prescriptionStartsOn: '2021-02-27',
            prescriptionExpiresOn: '2036-02-27',
            elapsedPercentage: 38,
            alert: false,
            expired: false,
        },
        {
            id: 7,
            name: 'Hurto simple (art. 162 CP)',
            prescriptionMonths: 24,
            offenseDate: '2021-02-27',
            prescriptionStartsOn: '2021-02-27',
            prescriptionExpiresOn: '2023-02-27',
            elapsedPercentage: 100,
            alert: true,
            expired: true,
        },
    ],
    prescription: null,
    prescriptionDeclaration: null,
    startDate: '2021-03-15',
    currentState: {
        proceduralStateId: 1,
        name: 'Investigación penal preparatoria',
        custom: false,
        initial: false,
        proceduralActId: 1,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
    },
    folder: null,
    active: true,
}

/** Un amparo con acto lesivo que se renueva cada 30 días. */
const AMPARO: Case = {
    ...CRIMINAL,
    id: 22,
    caption: 'MOYANO, Daniela c/ APROSS — Amparo',
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
    counterparty: 'APROSS',
    subjectMatter: 'Se ordene la cobertura integral del tratamiento.',
    clientDetained: null,
    injunctionGranted: false,
    harmfulActDate: '2026-10-01',
    harmfulActRenews: true,
    harmfulActRenewalDays: 30,
    harmfulActTermDays: 15,
    harmfulActTermDayType: 'BUSINESS',
    legalQualifications: [],
}

/** Lo que precarga el diálogo, con algunos campos cambiados. */
function edit(c: Case, changes: Partial<CaseFormValues>): CaseFormValues {
    return { ...caseToFormValues(c), ...changes }
}

describe('buildCasePatch', () => {
    it('sin cambios no manda nada, aunque la causa tenga datos en null', () => {
        expect(buildCasePatch(CRIMINAL, caseToFormValues(CRIMINAL))).toEqual({})
        expect(buildCasePatch(AMPARO, caseToFormValues(AMPARO))).toEqual({})
    })

    it('un espacio de más no cuenta como cambio', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { court: '  Fisc. de Distrito I, 2º turno ' }))).toEqual({})
    })

    it('manda sólo el campo que cambió, recortado', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { court: ' Fisc. de Distrito I, 3º turno ' }))).toEqual({
            court: 'Fisc. de Distrito I, 3º turno',
        })
    })

    it('vaciar un campo anulable lo manda en null', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { instructorName: '   ' }))).toEqual({ instructorName: null })
    })

    it('el responsable viaja como número', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { responsibleLawyerId: '5' }))).toEqual({
            responsibleLawyerId: 5,
        })
    })

    // CA-19.7 (D-111): el cliente no se modifica, así que nunca viaja.
    it('el cliente no viaja aunque el formulario traiga otro', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { clientId: '2' }))).toEqual({})
    })

    // CA-19.6: la fecha de inicio va con el SAC.
    it('cambiar el SAC manda también la fecha de inicio, aunque no haya cambiado', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { sacNumber: '13284572' }))).toEqual({
            sacNumber: '13284572',
            startDate: '2021-03-15',
        })
    })

    it('quitar el SAC manda el SAC y la fecha de inicio en null', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { sacNumber: '', startDate: '' }))).toEqual({
            sacNumber: null,
            startDate: null,
        })
    })

    it('cambiar sólo la fecha de inicio manda sólo la fecha', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { startDate: '2021-03-16' }))).toEqual({
            startDate: '2021-03-16',
        })
    })

    // CA-19.13: una causa "Prescripta" no manda las calificaciones si nadie las tocó.
    it('las mismas calificaciones en otro orden no cuentan como cambio', () => {
        const reordered = edit(CRIMINAL, {
            legalQualifications: [
                { legalQualificationId: 7, offenseDate: '2021-02-27' },
                { legalQualificationId: 1, offenseDate: '2021-02-27' },
            ],
        })
        expect(buildCasePatch(CRIMINAL, reordered)).toEqual({})
    })

    it('cambiar la fecha del hecho de una calificación manda la lista completa', () => {
        const changed = edit(CRIMINAL, {
            legalQualifications: [
                { legalQualificationId: 1, offenseDate: '2021-02-26' },
                { legalQualificationId: 7, offenseDate: '2021-02-27' },
            ],
        })
        expect(buildCasePatch(CRIMINAL, changed)).toEqual({
            legalQualifications: [
                { legalQualificationId: 1, offenseDate: '2021-02-26' },
                { legalQualificationId: 7, offenseDate: '2021-02-27' },
            ],
        })
    })

    it('quitar todas las calificaciones manda la lista vacía', () => {
        expect(buildCasePatch(CRIMINAL, edit(CRIMINAL, { legalQualifications: [] }))).toEqual({
            legalQualifications: [],
        })
    })

    it('borrar la fecha del acto lesivo manda sólo la fecha en null', () => {
        expect(buildCasePatch(AMPARO, edit(AMPARO, { harmfulActDate: '' }))).toEqual({ harmfulActDate: null })
    })

    it('dejar de renovar el acto lesivo manda la renovación en false y sus días en null', () => {
        expect(buildCasePatch(AMPARO, edit(AMPARO, { harmfulActRenews: false }))).toEqual({
            harmfulActRenews: false,
            harmfulActRenewalDays: null,
        })
    })

    it('cambiar el plazo del amparo lo manda como número', () => {
        expect(buildCasePatch(AMPARO, edit(AMPARO, { harmfulActTermDays: '20' }))).toEqual({ harmfulActTermDays: 20 })
    })

    it('nunca manda un dato de otro fuero, aunque el formulario lo tenga', () => {
        expect(
            buildCasePatch(CRIMINAL, edit(CRIMINAL, { counterparty: 'APROSS', harmfulActDate: '2026-10-01' })),
        ).toEqual({})
        expect(buildCasePatch(AMPARO, edit(AMPARO, { clientDetained: true, legalQualifications: [] }))).toEqual({})
    })
})
