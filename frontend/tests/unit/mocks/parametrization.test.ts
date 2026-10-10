/**
 * Lo que V3 cambió o agregó fuera de causas y actos: quién puede leer y
 * escribir cada recurso, las calificaciones legales, los clientes y las reglas
 * nuevas de los estados procesales.
 */

import { describe, expect, it } from 'vitest'
import {
    db,
    type Case,
    type Client,
    type Lawyer,
    type LegalQualification,
    type ProceduralState,
} from '@/shared/mocks'
import { call, dataOf, errorOf, usePrototypeToday } from './helpers'

interface Paginated<T> {
    data: T[]
    pagination: { page: number; limit: number; totalItems: number; totalPages: number }
}

const getCase = (id: number) => dataOf<Case>(call('GET', `/cases/${id}`, { as: 'gestion' }))

/** Los estados vigentes de un fuero, tal como los devuelve el listado. */
const statesOf = (jurisdiction: string) =>
    (call('GET', '/procedural-states', { as: 'gestion', query: { jurisdiction, limit: '100' } }).body as Paginated<ProceduralState>).data

describe('mock · permisos por perfil (V3 §4)', () => {
    usePrototypeToday()

    it.each([
        ['/lawyers'],
        ['/lawyers/3'],
        ['/procedural-states'],
        ['/procedural-states/4'],
        ['/legal-qualifications'],
        ['/legal-qualifications/1'],
        ['/clients'],
        ['/clients/1'],
        ['/cases'],
        ['/cases/1'],
        ['/cases/custom-states'],
    ])('GET %s lo lee cualquier perfil', (path) => {
        for (const who of ['fvazquez', 'mrios', 'gestion']) {
            expect(call('GET', path, { as: who }).status, `${who} en ${path}`).toBe(200)
        }
        expect(call('GET', path).status).toBe(401)
    })

    it('/users sigue siendo sólo del administrador', () => {
        expect(call('GET', '/users', { as: 'fvazquez' }).status).toBe(200)
        expect(call('GET', '/users', { as: 'mrios' }).status).toBe(403)
        expect(call('GET', '/users', { as: 'gestion' }).status).toBe(403)
    })

    it.each([
        ['POST', '/lawyers'],
        ['PATCH', '/lawyers/9'],
        ['DELETE', '/lawyers/9'],
        ['POST', '/procedural-states'],
        ['PATCH', '/procedural-states/2'],
        ['DELETE', '/procedural-states/2'],
        ['POST', '/legal-qualifications'],
        ['PATCH', '/legal-qualifications/1'],
        ['DELETE', '/legal-qualifications/1'],
    ] as const)('%s %s lo escribe sólo el administrador', (method, path) => {
        for (const who of ['mrios', 'gestion']) {
            const response = call(method, path, { as: who, body: {} })
            expect(response.status, `${who} en ${method} ${path}`).toBe(403)
            expect(errorOf(response).message).toBe('Se requiere el rol ADMINISTRATOR para realizar esta operación.')
        }
    })

    it('registrar un cliente es sólo de la Secretaría (D-05)', () => {
        const body = { lastName: 'TORRES', firstName: 'Bruno', dni: '35778120' }

        expect(call('POST', '/clients', { as: 'gestion', body }).status).toBe(201)
        for (const who of ['fvazquez', 'mrios']) {
            const response = call('POST', '/clients', { as: who, body })
            expect(response.status).toBe(403)
            expect(errorOf(response).message).toBe('Se requiere el rol SECRETARY para realizar esta operación.')
        }
    })
})

describe('mock · /legal-qualifications', () => {
    usePrototypeToday()

    it('lista las vigentes en orden alfabético, con las causas activas que las usan', () => {
        const { data, pagination } = call('GET', '/legal-qualifications', { as: 'gestion' }).body as Paginated<LegalQualification>

        expect(pagination.totalItems).toBe(8)
        expect(data.map((q) => q.name)).toEqual([
            'Abuso de armas — art. 104 CP',
            'Amenazas coactivas — art. 149 bis CP',
            'Homicidio simple — art. 79 CP',
            'Hurto simple — art. 162 CP',
            'Infracción Ley 23.737 — art. 5 inc. c',
            'Lesiones graves — art. 90 CP',
            'Robo calificado — art. 167 inc. 2 CP',
            'Violación de domicilio — art. 150 CP',
        ])
        // Amenazas coactivas: las causas 7, 13 y 17. Hurto simple: sólo la 9, que está archivada.
        expect(data.find((q) => q.id === 4)?.activeCases).toBe(3)
        expect(data.find((q) => q.id === 6)?.activeCases).toBe(0)
        expect(data.find((q) => q.id === 5)?.activeCases).toBe(0)
    })

    it('busca también por el artículo', () => {
        const { data } = call('GET', '/legal-qualifications', { as: 'gestion', query: { search: 'art. 162' } }).body as Paginated<LegalQualification>

        expect(data.map((q) => q.id)).toEqual([6])
    })

    it('una calificación dada de baja no existe para el cliente', () => {
        expect(call('GET', '/legal-qualifications/9', { as: 'gestion' }).status).toBe(404)
        expect(errorOf(call('GET', '/legal-qualifications/abc', { as: 'gestion' })).code).toBe('INVALID_PATH_PARAMETER')
    })

    it('registra una calificación con su prescripción en meses', () => {
        const response = call('POST', '/legal-qualifications', {
            as: 'fvazquez',
            body: { name: '  Estafa — art. 172 CP ', prescriptionMonths: 72 },
        })

        expect(response.status).toBe(201)
        // Sin `activeCases`: es un dato de consulta, sólo de los `GET` (D-32).
        expect(dataOf<LegalQualification>(response)).toEqual({
            id: 10,
            name: 'Estafa — art. 172 CP',
            prescriptionMonths: 72,
            active: true,
        })
        expect(dataOf<LegalQualification>(call('GET', '/legal-qualifications/10', { as: 'gestion' })).activeCases).toBe(0)
    })

    it('valida el nombre y los meses', () => {
        const response = call('POST', '/legal-qualifications', { as: 'fvazquez', body: { name: ' ', prescriptionMonths: 0 } })

        expect(response.status).toBe(400)
        expect(errorOf(response).details).toEqual({
            name: 'No puede estar vacío.',
            prescriptionMonths: 'Debe ser un número entero mayor o igual a 1.',
        })
    })

    it('la denominación es única entre las vigentes, sin distinguir mayúsculas', () => {
        const taken = call('POST', '/legal-qualifications', {
            as: 'fvazquez',
            body: { name: 'HURTO SIMPLE — ART. 162 CP', prescriptionMonths: 24 },
        })
        expect(taken.status).toBe(409)
        expect(errorOf(taken).code).toBe('LEGAL_QUALIFICATION_ALREADY_EXISTS')

        // La 9 está dada de baja: su nombre quedó libre.
        const freed = call('POST', '/legal-qualifications', {
            as: 'fvazquez',
            body: { name: 'Encubrimiento — art. 277 CP', prescriptionMonths: 72 },
        })
        expect(freed.status).toBe(201)
    })

    it('cambiar el plazo recalcula la prescripción de las causas que la registran (D-08)', () => {
        expect(getCase(1).legalQualifications[0].prescriptionExpiresOn).toBe('2029-02-27')

        const response = call('PATCH', '/legal-qualifications/1', { as: 'fvazquez', body: { prescriptionMonths: 120 } })

        expect(response.status).toBe(200)
        expect(dataOf<LegalQualification>(response)).toEqual({
            id: 1,
            name: 'Robo calificado — art. 167 inc. 2 CP',
            prescriptionMonths: 120,
            active: true,
        })
        expect(getCase(1).legalQualifications[0]).toMatchObject({
            prescriptionMonths: 120,
            prescriptionExpiresOn: '2031-02-27',
        })
    })

    it('un PATCH vacío, un nombre repetido y un id inexistente se rechazan', () => {
        expect(call('PATCH', '/legal-qualifications/1', { as: 'fvazquez', body: {} }).status).toBe(400)
        expect(
            call('PATCH', '/legal-qualifications/1', { as: 'fvazquez', body: { name: 'Hurto simple — art. 162 CP' } }).status,
        ).toBe(409)
        expect(call('PATCH', '/legal-qualifications/999', { as: 'fvazquez', body: { prescriptionMonths: 12 } }).status).toBe(404)
    })

    it('la baja procede aunque haya causas: la conservan, pero deja de ofrecerse (D-06)', () => {
        const response = call('DELETE', '/legal-qualifications/1', { as: 'fvazquez' })

        expect(response.status).toBe(204)
        expect(call('GET', '/legal-qualifications/1', { as: 'gestion' }).status).toBe(404)
        expect(getCase(1).legalQualifications[0].name).toBe('Robo calificado — art. 167 inc. 2 CP')

        // Ya no se puede elegir para una causa nueva.
        const created = call('POST', '/cases', {
            as: 'gestion',
            body: {
                sacNumber: '14200399',
                jurisdiction: 'CRIMINAL',
                caption: 'RUIZ, Elvira T. p.s.a. Robo calificado',
                clientId: 24,
                proceduralRole: 'DEFENSA',
                legalQualifications: [{ legalQualificationId: 1, offenseDate: '2026-08-20' }],
                responsibleLawyerId: 3,
            },
        })
        expect(created.status).toBe(400)
    })
})

describe('mock · /clients', () => {
    usePrototypeToday()

    it('lista los vigentes por apellido y nombres, en dos páginas', () => {
        const { data, pagination } = call('GET', '/clients', { as: 'mrios' }).body as Paginated<Client>

        expect(pagination).toEqual({ page: 1, limit: 20, totalItems: 23, totalPages: 2 })
        expect(data.slice(0, 3).map((c) => c.lastName)).toEqual(['ACOSTA', 'AGÜERO', 'BARRIONUEVO'])
        // SOSA está dada de baja: no aparece en ningún lado.
        const all = call('GET', '/clients', { as: 'mrios', query: { limit: '100' } }).body as Paginated<Client>
        expect(all.data.map((c) => c.lastName)).not.toContain('SOSA')
    })

    it('cuenta las causas activas de cada cliente', () => {
        const { data } = call('GET', '/clients', { as: 'mrios', query: { limit: '100' } }).body as Paginated<Client>
        const activeCases = (lastName: string) => data.find((c) => c.lastName === lastName)?.activeCases

        expect(activeCases('GÓMEZ')).toBe(2)
        expect(activeCases('JUÁREZ')).toBe(0)
        // La única causa de BARRIONUEVO está archivada.
        expect(activeCases('BARRIONUEVO')).toBe(0)
    })

    it('busca por apellido, por nombres y por DNI, con o sin puntos', () => {
        const search = (text: string) =>
            (call('GET', '/clients', { as: 'mrios', query: { search: text } }).body as Paginated<Client>).data.map((c) => c.lastName)

        expect(search('gomez')).toEqual(['GÓMEZ'])
        expect(search('silvia')).toEqual(['LUDUEÑA'])
        expect(search('34812905')).toEqual(['GÓMEZ'])
        expect(search('34.812')).toEqual(['GÓMEZ'])
        expect(search('zzzz')).toEqual([])
    })

    it('un cliente dado de baja o inexistente responde 404', () => {
        expect(errorOf(call('GET', '/clients/8', { as: 'mrios' })).code).toBe('CLIENT_NOT_FOUND')
        expect(errorOf(call('GET', '/clients/999', { as: 'mrios' })).code).toBe('CLIENT_NOT_FOUND')
        expect(errorOf(call('GET', '/clients/abc', { as: 'mrios' })).code).toBe('INVALID_PATH_PARAMETER')
    })

    it('registra el cliente tal como llega y le pone la fecha de alta', () => {
        const response = call('POST', '/clients', {
            as: 'gestion',
            body: { lastName: 'TORRES', firstName: 'Bruno', dni: '35778120', phone: '351 400-1122' },
        })

        expect(response.status).toBe(201)
        expect(dataOf<Client>(response)).toEqual({
            id: 25,
            lastName: 'TORRES',
            firstName: 'Bruno',
            dni: '35778120',
            phone: '351 400-1122',
            email: null,
            clientSince: '2026-09-15',
            activeCases: 0,
            active: true,
        })
    })

    it('valida los campos, incluido el DNI con puntos', () => {
        const response = call('POST', '/clients', {
            as: 'gestion',
            body: { lastName: '', firstName: '', dni: '35.778.120', email: 'no-es-un-correo' },
        })

        expect(response.status).toBe(400)
        expect(errorOf(response).details).toEqual({
            lastName: 'El apellido es obligatorio.',
            firstName: 'Los nombres son obligatorios.',
            dni: 'Debe contener 7 u 8 dígitos, sin puntos.',
            email: 'El formato del correo electrónico no es válido.',
        })
    })

    it('el DNI es único entre los vigentes', () => {
        const taken = call('POST', '/clients', { as: 'gestion', body: { lastName: 'OTRO', firstName: 'Gómez', dni: '34812905' } })
        expect(taken.status).toBe(409)
        expect(errorOf(taken).code).toBe('CLIENT_DNI_ALREADY_EXISTS')

        // El de SOSA, que está dada de baja, se puede volver a registrar.
        const freed = call('POST', '/clients', { as: 'gestion', body: { lastName: 'SOSA', firstName: 'Verónica L.', dni: '27903441' } })
        expect(freed.status).toBe(201)
    })
})

describe('mock · lo que V3 cambió en abogados y estados procesales', () => {
    usePrototypeToday()

    it('activeCases de los abogados sale de las causas', () => {
        const { data } = call('GET', '/lawyers', { as: 'gestion' }).body as Paginated<Lawyer>
        const byId = Object.fromEntries(data.map((l) => [l.id, l.activeCases]))

        expect(byId).toEqual({ 1: 3, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 2, 9: 0, 10: 0 })
    })

    it('un abogado con causas no se puede dar de baja; uno sin causas ni cuenta, sí', () => {
        // El abogado 8 tiene cuenta y dos causas; el 9, ninguna de las dos cosas.
        expect(errorOf(call('DELETE', '/lawyers/8', { as: 'fvazquez' })).code).toBe('LAWYER_HAS_DEPENDENCIES')
        expect(call('DELETE', '/lawyers/9', { as: 'fvazquez' }).status).toBe(204)
    })

    it('activeCases de los estados cuenta las causas que están hoy en cada uno', () => {
        const { data } = call('GET', '/procedural-states', {
            as: 'gestion',
            query: { jurisdiction: 'CRIMINAL', limit: '100' },
        }).body as Paginated<ProceduralState>
        const byName = Object.fromEntries(data.map((s) => [s.name, s.activeCases]))

        expect(byName['Oposición al requerimiento de elevación']).toBe(1)
        expect(byName['Requerimiento de elevación a juicio']).toBe(1)
        expect(byName['Designación de abogado defensor']).toBe(0)
        // Terminales: siempre 0, aunque haya causas archivadas y prescriptas.
        expect(byName['Archivada']).toBe(0)
        expect(byName['Prescripta']).toBe(0)
    })

    it('la baja de un estado procede aunque tenga causas, y las causas lo conservan (D-06)', () => {
        const response = call('DELETE', '/procedural-states/4', { as: 'fvazquez' })

        expect(response.status).toBe(204)
        expect(call('GET', '/procedural-states/4', { as: 'gestion' }).status).toBe(404)
        expect(getCase(1).currentState).toMatchObject({
            proceduralStateId: 4,
            name: 'Oposición al requerimiento de elevación',
            custom: false,
        })
        expect(statesOf('CRIMINAL').map((s) => s.id)).toEqual([1, 2, 3, 5, 6, 7, 8, 9, 10])
    })

    it('el nombre de un estado dado de baja se puede volver a usar en su fuero', () => {
        // Es único entre los vigentes, como el índice de la base.
        call('DELETE', '/procedural-states/7', { as: 'fvazquez' })

        const response = call('POST', '/procedural-states', {
            as: 'fvazquez',
            body: { name: 'Recurso de apelación', jurisdiction: 'CRIMINAL', timeLimitDays: 3, dayType: 'BUSINESS' },
        })

        expect(response.status).toBe(201)
    })

    it('el fuero de un estado no se puede modificar (D-36)', () => {
        // Ni uno que ninguna causa registra, como "Recurso de apelación" (7).
        const response = call('PATCH', '/procedural-states/7', { as: 'fvazquez', body: { jurisdiction: 'AMPARO' } })

        expect(response.status).toBe(400)
        expect(errorOf(response).code).toBe('VALIDATION_ERROR')
        expect(errorOf(response).details).toHaveProperty('jurisdiction')
        expect(db.proceduralStates.find((s) => s.id === 7)?.jurisdiction).toBe('CRIMINAL')
    })

    it('mandar el fuero que ya tiene también se rechaza', () => {
        const response = call('PATCH', '/procedural-states/4', {
            as: 'fvazquez',
            body: { name: 'Oposición', jurisdiction: 'CRIMINAL' },
        })

        expect(response.status).toBe(400)
        expect(db.proceduralStates.find((s) => s.id === 4)?.name).toBe('Oposición al requerimiento de elevación')
    })

    it('los estados no tienen posición: se listan por orden de registro (D-31)', () => {
        const response = call('POST', '/procedural-states', {
            as: 'fvazquez',
            body: { name: 'Queja', jurisdiction: 'AMPARO' },
        })

        expect(response.status).toBe(201)
        // Ni `position` ni `activeCases`, que es sólo de los `GET` (D-32).
        expect(dataOf<ProceduralState>(response)).toEqual({
            id: 25,
            name: 'Queja',
            jurisdiction: 'AMPARO',
            timeLimitDays: 0,
            dayType: 'NONE',
            terminal: false,
            active: true,
        })

        const amparo = statesOf('AMPARO')
        expect(amparo.at(-1)?.name).toBe('Queja')
        expect(amparo.every((s) => !('position' in s))).toBe(true)
        expect(amparo.every((s) => typeof s.activeCases === 'number')).toBe(true)
    })

    it('modificar un estado tampoco devuelve activeCases (D-32)', () => {
        const response = call('PATCH', '/procedural-states/4', { as: 'fvazquez', body: { timeLimitDays: 6 } })

        expect(response.status).toBe(200)
        expect(dataOf<ProceduralState>(response)).toEqual({
            id: 4,
            name: 'Oposición al requerimiento de elevación',
            jurisdiction: 'CRIMINAL',
            timeLimitDays: 6,
            dayType: 'BUSINESS',
            terminal: false,
            active: true,
        })
        expect(dataOf<ProceduralState>(call('GET', '/procedural-states/4', { as: 'gestion' })).activeCases).toBe(1)
    })

    it('"Iniciada" es el estado inicial: no se lista y su nombre está reservado (D-34)', () => {
        for (const jurisdiction of ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const) {
            expect(statesOf(jurisdiction).map((s) => s.name)).not.toContain('Iniciada')

            const created = call('POST', '/procedural-states', { as: 'fvazquez', body: { name: 'iniciada', jurisdiction } })
            expect(created.status).toBe(409)
            expect(errorOf(created).code).toBe('PROCEDURAL_STATE_ALREADY_EXISTS')
        }

        const renamed = call('PATCH', '/procedural-states/2', { as: 'fvazquez', body: { name: 'Iniciada' } })
        expect(renamed.status).toBe(409)
    })
})
