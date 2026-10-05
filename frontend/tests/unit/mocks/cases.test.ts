import { describe, expect, it } from 'vitest'
import { db, type Case, type CurrentState } from '@/shared/mocks'
import { call, dataOf, errorOf, usePrototypeToday } from './helpers'

interface Paginated {
    data: Case[]
    pagination: { page: number; limit: number; totalItems: number; totalPages: number }
}

function list(query: Record<string, string> = {}, as = 'gestion') {
    return call('GET', '/cases', { as, query: { limit: '100', ...query } })
}

const sacs = (response: ReturnType<typeof list>) => (response.body as Paginated).data.map((c) => c.sacNumber)

/** Un alta penal válida, para ir rompiéndola de a un campo. */
const CRIMINAL_BODY = {
    sacNumber: '14200315',
    jurisdiction: 'CRIMINAL',
    caption: 'RUIZ, Elvira T. p.s.a. Hurto simple',
    court: 'Juzgado de Control N° 4 · Córdoba',
    clientId: 24,
    proceduralRole: 'DEFENSE',
    legalQualifications: [{ legalQualificationId: 6, offenseDate: '2026-08-20' }],
    responsibleLawyerId: 3,
}

/** El estado de toda causa recién registrada (D-34): sin acto que la haya llevado ahí y sin vencimiento. */
const INITIAL_STATE: CurrentState = {
    proceduralStateId: null,
    name: 'Iniciada',
    custom: false,
    initial: true,
    proceduralActId: null,
    dueDate: null,
    businessDaysRemaining: null,
    manuallyAdjusted: false,
}

const AMPARO_BODY = {
    sacNumber: '14200316',
    jurisdiction: 'AMPARO',
    caption: 'JUÁREZ, Mónica E. c/ PAMI — Amparo de salud',
    clientId: 18,
    proceduralRole: 'PLAINTIFF',
    counterparty: 'PAMI',
    subjectMatter: 'Se ordene a PAMI la cobertura de la internación domiciliaria.',
    responsibleLawyerId: 5,
}

describe('mock · /cases', () => {
    usePrototypeToday()

    describe('GET /cases', () => {
        it('sin sesión responde 401', () => {
            expect(call('GET', '/cases').status).toBe(401)
        })

        it('cualquier perfil ve todas las causas (RN11)', () => {
            for (const who of ['fvazquez', 'mrios', 'gestion']) {
                const response = list({}, who)
                expect(response.status).toBe(200)
                expect((response.body as Paginated).pagination.totalItems).toBe(23)
            }
        })

        it('con el límite por defecto da dos páginas', () => {
            const response = call('GET', '/cases', { as: 'gestion' })
            const { data, pagination } = response.body as Paginated

            expect(data).toHaveLength(20)
            expect(pagination).toEqual({ page: 1, limit: 20, totalItems: 23, totalPages: 2 })
        })

        it('ordena por urgencia: vencidas primero, y al final las que no tienen vencimiento, por id (D-35)', () => {
            const { data } = list().body as Paginated
            const withDue = data.filter((c) => c.currentState.dueDate !== null)
            const withoutDue = data.filter((c) => c.currentState.dueDate === null)

            // Las que tienen vencimiento van todas antes que las demás.
            expect(data.slice(0, withDue.length)).toEqual(withDue)
            const dueDates = withDue.map((c) => c.currentState.dueDate!)
            expect(dueDates).toEqual([...dueDates].sort())
            expect(withDue[0].currentState.businessDaysRemaining).toBeLessThan(0)

            // Ya no se ordena por SAC, que puede faltar.
            const ids = withoutDue.map((c) => c.id)
            expect(ids).toEqual([...ids].sort((a, b) => a - b))
        })

        it('filtra por fuero, por responsable y por cliente', () => {
            const criminal = list({ jurisdiction: 'CRIMINAL' }).body as Paginated
            expect(criminal.data.every((c) => c.jurisdiction === 'CRIMINAL')).toBe(true)
            expect(criminal.data).toHaveLength(11)

            const ofRios = list({ responsibleLawyerId: '3' }).body as Paginated
            expect(ofRios.data.map((c) => c.id).sort()).toEqual([1, 17, 9].sort())

            // HU9: las causas de un cliente. GÓMEZ tiene dos.
            expect(sacs(list({ clientId: '1' })).sort()).toEqual(['12104893', '13284571'])
        })

        it('un abogado o un estado inexistente no es un error: devuelve vacío', () => {
            const response = list({ responsibleLawyerId: '999' })

            expect(response.status).toBe(200)
            expect((response.body as Paginated).pagination).toMatchObject({ totalItems: 0, totalPages: 0 })
        })

        it('busca por SAC, por carátula y por el cliente', () => {
            expect(sacs(list({ search: '1328' }))).toEqual(['13284571'])
            expect(sacs(list({ search: 'apross' })).sort()).toEqual(['12774310', '13619027', '13902244'])
            // El nombre del cliente, aunque no esté en la carátula ni lleve tilde.
            expect(sacs(list({ search: 'debora' }))).toEqual(['13488127'])
        })

        describe('filtro de estado procesal', () => {
            it('por un estado de la tabla', () => {
                expect(sacs(list({ proceduralStateId: '4' }))).toEqual(['13284571'])
            })

            it('por un estado escrito a mano, sin distinguir mayúsculas', () => {
                expect(sacs(list({ customState: 'con acusación, pero con oposición' }))).toEqual(['13077215'])
            })

            it('"Iniciada" trae las causas que siguen en el estado inicial (D-34)', () => {
                const response = list({ withoutProceduralActs: 'true' })
                const { data } = response.body as Paginated

                expect(data.map((c) => c.id).sort((a, b) => a - b)).toEqual([7, 11, 22, 23])
                expect(data.every((c) => c.currentState.initial && c.currentState.dueDate === null)).toBe(true)
            })

            it('"Iniciada" se combina con el fuero', () => {
                expect(sacs(list({ withoutProceduralActs: 'true', jurisdiction: 'AMPARO' }))).toEqual(['13619027'])
            })

            it('los tres parámetros son excluyentes entre sí', () => {
                const both = list({ proceduralStateId: '4', customState: 'x' })
                expect(both.status).toBe(400)
                expect(errorOf(both)).toMatchObject({
                    code: 'INVALID_REQUEST',
                    details: { customState: 'No puede combinarse con proceduralStateId.' },
                })

                const withoutActs = list({ withoutProceduralActs: 'true', proceduralStateId: '4' })
                expect(withoutActs.status).toBe(400)
                expect(errorOf(withoutActs).details).toHaveProperty('withoutProceduralActs')
            })
        })

        it('"Solo con plazo por vencer" deja las que tienen vencimiento, vencidas incluidas', () => {
            const { data } = list({ openDeadline: 'true' }).body as Paginated

            expect(data.every((c) => c.currentState.dueDate !== null)).toBe(true)
            expect(data.some((c) => c.currentState.businessDaysRemaining! < 0)).toBe(true)
            expect(data).toHaveLength(14)
        })

        it('un parámetro mal formado responde 400', () => {
            expect(errorOf(list({ jurisdiction: 'NOPE' })).details).toHaveProperty('jurisdiction')
            expect(errorOf(list({ openDeadline: 'si' })).details).toHaveProperty('openDeadline')
            expect(errorOf(list({ clientId: 'abc' })).details).toHaveProperty('clientId')
            expect(errorOf(call('GET', '/cases', { as: 'gestion', query: { page: '0' } })).code).toBe('INVALID_PAGINATION')
        })
    })

    describe('GET /cases/custom-states', () => {
        it('devuelve los estados escritos a mano, sin paginar', () => {
            const response = call('GET', '/cases/custom-states', { as: 'mrios' })

            expect(response.status).toBe(200)
            expect(response.body).toEqual({ data: ['Con acusación, pero con oposición'] })
        })

        it('no incluye "Iniciada" y respeta el fuero', () => {
            expect(dataOf<string[]>(call('GET', '/cases/custom-states', { as: 'mrios' }))).not.toContain('Iniciada')

            const amparo = call('GET', '/cases/custom-states', { as: 'mrios', query: { jurisdiction: 'AMPARO' } })

            expect(dataOf<string[]>(amparo)).toEqual([])
        })

        it('no se confunde con el detalle de una causa', () => {
            // `custom-states` va antes que `:caseId` en la tabla de rutas.
            expect(call('GET', '/cases/custom-states', { as: 'mrios' }).status).toBe(200)
            expect(call('GET', '/cases/abc', { as: 'mrios' }).status).toBe(400)
        })
    })

    describe('GET /cases/{caseId}', () => {
        it('devuelve la causa con el cliente, el abogado y la prescripción', () => {
            const c = dataOf<Case>(call('GET', '/cases/1', { as: 'gestion' }))

            expect(c.client).toEqual({
                id: 1,
                lastName: 'GÓMEZ',
                firstName: 'Ariel Fernando',
                dni: '34812905',
                phone: '351 415-2288',
                email: 'afgomez@gmail.com',
                clientSince: '2021-03-12',
            })
            expect(c.responsibleLawyer).toEqual({ id: 3, fullName: 'Dra. Malena Ríos', registrationNumber: '1-36842' })
            expect(c.legalQualifications).toEqual([
                {
                    id: 1,
                    name: 'Robo calificado — art. 167 inc. 2 CP',
                    prescriptionMonths: 96,
                    offenseDate: '2021-02-27',
                    prescriptionStartsOn: '2021-02-27',
                    prescriptionExpiresOn: '2029-02-27',
                },
            ])
            // El vencimiento viaja adentro del estado actual: lo abrió el acto 3 (D-35).
            expect(c.currentState).toEqual({
                proceduralStateId: 4,
                name: 'Oposición al requerimiento de elevación',
                custom: false,
                initial: false,
                proceduralActId: 3,
                dueDate: '2026-09-16',
                businessDaysRemaining: 1,
                manuallyAdjusted: false,
            })
            expect(c).not.toHaveProperty('nextDeadline')
            expect(c).not.toHaveProperty('prescriptionStartsOn')
        })

        it('el teléfono y el interno del instructor vienen separados (D-33)', () => {
            const c = dataOf<Case>(call('GET', '/cases/1', { as: 'gestion' }))

            expect(c).toMatchObject({ instructorPhone: '0351 448-1200', instructorExtension: '214' })
        })

        it('una causa sin actos está en el estado inicial, "Iniciada", y sin vencimiento', () => {
            const c = dataOf<Case>(call('GET', '/cases/7', { as: 'gestion' }))

            expect(c.currentState).toEqual(INITIAL_STATE)
            // Dos calificaciones, cada una con su fecha del hecho y su vencimiento.
            expect(c.legalQualifications.map((q) => q.prescriptionExpiresOn)).toEqual(['2032-08-30', '2028-09-02'])
        })

        it('fuera del penal no hay calificaciones, y sí objeto del reclamo', () => {
            const c = dataOf<Case>(call('GET', '/cases/6', { as: 'gestion' }))

            expect(c.legalQualifications).toEqual([])
            expect(c.counterparty).toBe('APROSS')
            expect(c.subjectMatter).toMatch(/cobertura integral/)
        })

        it('un estado escrito a mano viene sin id y marcado', () => {
            const c = dataOf<Case>(call('GET', '/cases/8', { as: 'gestion' }))

            expect(c.currentState).toMatchObject({
                proceduralStateId: null,
                name: 'Con acusación, pero con oposición',
                custom: true,
                initial: false,
                businessDaysRemaining: 4,
                manuallyAdjusted: true,
            })
        })

        it('una causa en estado terminal no tiene vencimiento', () => {
            const c = dataOf<Case>(call('GET', '/cases/9', { as: 'gestion' }))

            expect(c.currentState).toMatchObject({
                name: 'Archivada',
                initial: false,
                dueDate: null,
                businessDaysRemaining: null,
            })
            expect(c.currentState.proceduralActId).not.toBeNull()
        })

        it('una causa puede no tener SAC ni calificaciones legales (D-33)', () => {
            const c = dataOf<Case>(call('GET', '/cases/23', { as: 'gestion' }))

            expect(c.sacNumber).toBeNull()
            expect(c.jurisdiction).toBe('CRIMINAL')
            expect(c.legalQualifications).toEqual([])
        })

        it('sigue mostrando una calificación dada de baja', () => {
            const c = dataOf<Case>(call('GET', '/cases/13', { as: 'gestion' }))

            expect(c.legalQualifications.map((q) => q.name)).toContain('Encubrimiento — art. 277 CP')
        })

        it('responde 400 a un id inválido y 404 a uno inexistente', () => {
            expect(errorOf(call('GET', '/cases/abc', { as: 'gestion' })).code).toBe('INVALID_PATH_PARAMETER')
            expect(errorOf(call('GET', '/cases/999', { as: 'gestion' })).code).toBe('CASE_NOT_FOUND')
        })
    })

    describe('POST /cases', () => {
        it('sin sesión responde 401', () => {
            expect(call('POST', '/cases', { body: CRIMINAL_BODY }).status).toBe(401)
        })

        it('la causa nace en el estado inicial, "Iniciada", y sin vencimiento (D-34)', () => {
            const response = call('POST', '/cases', { as: 'gestion', body: CRIMINAL_BODY })
            const c = dataOf<Case>(response)

            expect(response.status).toBe(201)
            expect(c.currentState).toEqual(INITIAL_STATE)
            expect(c.startDate).toBe('2026-09-15')
            expect(c.counterparty).toBeNull()
            expect(c.subjectMatter).toBeNull()
            // El alta no es un movimiento del ciclo de vida: no crea actos.
            expect(db.proceduralActs.filter((a) => a.caseId === c.id)).toEqual([])
        })

        it('la prescripción corre desde la fecha del hecho de cada calificación (D-19)', () => {
            const c = dataOf<Case>(call('POST', '/cases', { as: 'gestion', body: CRIMINAL_BODY }))

            expect(c.legalQualifications).toEqual([
                {
                    id: 6,
                    name: 'Hurto simple — art. 162 CP',
                    prescriptionMonths: 24,
                    offenseDate: '2026-08-20',
                    prescriptionStartsOn: '2026-08-20',
                    prescriptionExpiresOn: '2028-08-20',
                },
            ])
        })

        it('registra un amparo con su contraparte y su objeto', () => {
            const response = call('POST', '/cases', { as: 'mrios', body: AMPARO_BODY })
            const c = dataOf<Case>(response)

            expect(response.status).toBe(201)
            expect(c.legalQualifications).toEqual([])
            expect(c.counterparty).toBe('PAMI')
            expect(c.subjectMatter).toBe(AMPARO_BODY.subjectMatter)
        })

        it('suma la causa nueva a las activas de su abogado y de su cliente', () => {
            call('POST', '/cases', { as: 'gestion', body: CRIMINAL_BODY })

            const lawyer = dataOf<{ activeCases: number }>(call('GET', '/lawyers/3', { as: 'gestion' }))
            const client = dataOf<{ activeCases: number }>(call('GET', '/clients/24', { as: 'gestion' }))
            expect(lawyer.activeCases).toBe(3)
            expect(client.activeCases).toBe(1)
        })

        it('la fecha del hecho es obligatoria en cada calificación (D-28)', () => {
            const response = call('POST', '/cases', {
                as: 'gestion',
                body: { ...CRIMINAL_BODY, legalQualifications: [{ legalQualificationId: 6 }] },
            })

            expect(response.status).toBe(400)
            expect(errorOf(response).details).toEqual({
                legalQualifications: 'Cada calificación legal requiere la fecha del hecho.',
            })
        })

        it('rechaza una fecha del hecho futura, una calificación repetida y una dada de baja', () => {
            const withQualifications = (legalQualifications: unknown) =>
                errorOf(call('POST', '/cases', { as: 'gestion', body: { ...CRIMINAL_BODY, legalQualifications } })).details

            expect(withQualifications([{ legalQualificationId: 6, offenseDate: '2026-09-16' }]))
                .toHaveProperty('legalQualifications', 'La fecha del hecho no puede ser posterior a hoy.')
            expect(
                withQualifications([
                    { legalQualificationId: 6, offenseDate: '2026-08-20' },
                    { legalQualificationId: 6, offenseDate: '2026-08-21' },
                ]),
            ).toHaveProperty('legalQualifications', 'No puede repetirse una calificación legal.')
            expect(withQualifications([{ legalQualificationId: 9, offenseDate: '2026-08-20' }]))
                .toHaveProperty('legalQualifications')
        })

        it('una causa penal se puede registrar sin calificaciones legales (D-33)', () => {
            const without: Record<string, unknown> = { ...CRIMINAL_BODY }
            delete without.legalQualifications

            const omitted = call('POST', '/cases', { as: 'gestion', body: without })
            expect(omitted.status).toBe(201)
            expect(dataOf<Case>(omitted).legalQualifications).toEqual([])

            const empty = call('POST', '/cases', {
                as: 'gestion',
                body: { ...CRIMINAL_BODY, sacNumber: '14200317', legalQualifications: [] },
            })
            expect(empty.status).toBe(201)
            expect(dataOf<Case>(empty).legalQualifications).toEqual([])
        })

        it('el SAC es opcional, y dos causas sin SAC no chocan entre sí (D-33)', () => {
            const without: Record<string, unknown> = { ...CRIMINAL_BODY }
            delete without.sacNumber

            const first = call('POST', '/cases', { as: 'gestion', body: without })
            const second = call('POST', '/cases', { as: 'gestion', body: without })

            expect(first.status).toBe(201)
            expect(dataOf<Case>(first).sacNumber).toBeNull()
            expect(second.status).toBe(201)
        })

        it('guarda el interno del instructor aparte del teléfono, hasta 20 caracteres (D-33)', () => {
            const response = call('POST', '/cases', {
                as: 'gestion',
                body: { ...CRIMINAL_BODY, instructorName: 'Dr. Pablo Carranza', instructorPhone: '0351 448-1200', instructorExtension: '261' },
            })
            expect(dataOf<Case>(response)).toMatchObject({ instructorPhone: '0351 448-1200', instructorExtension: '261' })

            const long = call('POST', '/cases', {
                as: 'gestion',
                body: { ...CRIMINAL_BODY, sacNumber: '14200317', instructorExtension: '1'.repeat(21) },
            })
            expect(errorOf(long).details).toEqual({ instructorExtension: 'Puede tener hasta 20 caracteres.' })
        })

        it('el objeto del reclamo es obligatorio fuera del penal y tiene hasta 800 caracteres (D-27)', () => {
            const withoutSubject: Record<string, unknown> = { ...AMPARO_BODY }
            delete withoutSubject.subjectMatter
            const missing = call('POST', '/cases', { as: 'gestion', body: withoutSubject })
            expect(errorOf(missing).details).toEqual({
                subjectMatter: 'Es obligatorio en los fueros administrativo y de amparo.',
            })

            const long = call('POST', '/cases', {
                as: 'gestion',
                body: { ...AMPARO_BODY, subjectMatter: 'a'.repeat(801) },
            })
            expect(errorOf(long).details).toEqual({ subjectMatter: 'Puede tener hasta 800 caracteres.' })

            const exact = call('POST', '/cases', {
                as: 'gestion',
                body: { ...AMPARO_BODY, subjectMatter: 'a'.repeat(800) },
            })
            expect(exact.status).toBe(201)
        })

        it('lo que es de un fuero no viaja en otro', () => {
            const amparoWithQualifications = call('POST', '/cases', {
                as: 'gestion',
                body: { ...AMPARO_BODY, legalQualifications: CRIMINAL_BODY.legalQualifications },
            })
            expect(errorOf(amparoWithQualifications).details).toHaveProperty('legalQualifications')

            const criminalWithSubject = call('POST', '/cases', {
                as: 'gestion',
                body: { ...CRIMINAL_BODY, counterparty: 'APROSS', subjectMatter: 'Algo' },
            })
            expect(Object.keys(errorOf(criminalWithSubject).details ?? {}).sort()).toEqual(['counterparty', 'subjectMatter'])
        })

        it('valida el SAC, la carátula, el rol procesal y la fecha de inicio', () => {
            const response = call('POST', '/cases', {
                as: 'gestion',
                body: { ...CRIMINAL_BODY, sacNumber: '123', caption: ' ', proceduralRole: 'PLAINTIFF', startDate: '2026-09-16' },
            })

            expect(response.status).toBe(400)
            expect(errorOf(response).details).toEqual({
                sacNumber: 'Debe contener exactamente 8 dígitos.',
                caption: 'La carátula es obligatoria.',
                proceduralRole: 'El rol procesal no corresponde al fuero.',
                startDate: 'No puede ser posterior a hoy.',
            })
        })

        it('un cliente o un abogado dado de baja o inexistente es un 400 sobre el campo (D-22)', () => {
            const response = call('POST', '/cases', {
                as: 'gestion',
                body: { ...CRIMINAL_BODY, clientId: 8, responsibleLawyerId: 999 },
            })

            expect(errorOf(response)).toMatchObject({
                code: 'VALIDATION_ERROR',
                details: {
                    clientId: 'No existe un cliente vigente con ese identificador.',
                    responsibleLawyerId: 'No existe un abogado vigente con ese identificador.',
                },
            })
        })

        it('un SAC ya registrado responde 409', () => {
            const response = call('POST', '/cases', { as: 'gestion', body: { ...CRIMINAL_BODY, sacNumber: '13284571' } })

            expect(response.status).toBe(409)
            expect(errorOf(response).code).toBe('CASE_SAC_ALREADY_EXISTS')
        })

        it('no depende de que el fuero tenga estados cargados', () => {
            for (const state of db.proceduralStates) {
                if (state.jurisdiction === 'AMPARO') state.active = false
            }

            expect(call('POST', '/cases', { as: 'gestion', body: AMPARO_BODY }).status).toBe(201)
        })
    })
})
