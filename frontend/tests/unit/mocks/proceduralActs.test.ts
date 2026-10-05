import { describe, expect, it } from 'vitest'
import { db, type Case, type DeadlinePreview, type ProceduralAct } from '@/shared/mocks'
import { call, dataOf, errorOf, usePrototypeToday } from './helpers'

/**
 * Quién lleva cada causa de las que se usan acá. Sólo el abogado responsable
 * registra sus actos (V3 D-30), así que cada pedido sale, por defecto, con la
 * cuenta de quien corresponde.
 */
const RESPONSIBLE: Record<number, string> = {
    1: 'mrios',
    4: 'fvazquez',
    7: 'mferreyra',
    9: 'mrios',
    11: 'iperalta',
    16: 'sledesma',
}

const responsibleOf = (caseId: number | string) => RESPONSIBLE[Number(caseId)] ?? 'mrios'

const register = (caseId: number | string, body: unknown, as = responsibleOf(caseId)) =>
    call('POST', `/cases/${caseId}/procedural-acts`, { as, body })

const preview = (caseId: number | string, query: Record<string, string>, as = responsibleOf(caseId)) =>
    call('GET', `/cases/${caseId}/procedural-acts/deadline-preview`, { as, query })

const getCase = (id: number) => dataOf<Case>(call('GET', `/cases/${id}`, { as: 'gestion' }))

const NOT_RESPONSIBLE = 'Solo el abogado responsable de la causa puede registrar actos procesales.'

describe('mock · /cases/{caseId}/procedural-acts', () => {
    usePrototypeToday()

    describe('quién puede registrar (D-30)', () => {
        const body = { proceduralStateId: 1, actDate: '2026-09-15' }

        it('sin sesión responde 401', () => {
            expect(call('POST', '/cases/7/procedural-acts', { body: {} }).status).toBe(401)
        })

        it('el abogado responsable de la causa registra sus actos', () => {
            // La causa 7 la lleva el abogado 6, que es la ficha de `mferreyra`.
            expect(register(7, body, 'mferreyra').status).toBe(201)
        })

        it('otro abogado no: 403, aunque tenga el rol LAWYER', () => {
            const response = register(7, body, 'mrios')

            expect(response.status).toBe(403)
            expect(errorOf(response)).toMatchObject({ code: 'FORBIDDEN', message: NOT_RESPONSIBLE })
        })

        it('el administrador tampoco, ejerza o no', () => {
            // `fvazquez` es administrador y abogado, pero la causa 7 no es suya.
            expect(register(7, body, 'fvazquez').status).toBe(403)
            expect(register(7, body, 'supervision').status).toBe(403)
            // En una causa propia, sí.
            expect(register(4, { proceduralStateId: 2, actDate: '2026-09-15' }, 'fvazquez').status).toBe(201)
        })

        it('la Secretaría no registra actos', () => {
            const response = register(7, body, 'gestion')

            expect(response.status).toBe(403)
            expect(errorOf(response).message).toBe(NOT_RESPONSIBLE)
        })

        it('no depende del rol sino de la ficha: una secretaria que además es la abogada responsable, sí', () => {
            // `sledesma` es SECRETARY y LAWYER, y lleva la causa 16.
            expect(register(16, { proceduralStateId: 22, actDate: '2026-09-15' }, 'sledesma').status).toBe(201)
        })

        it('si la causa no existe responde 404, sea quien sea', () => {
            expect(register(999, body, 'gestion').status).toBe(404)
        })
    })

    describe('el primer acto', () => {
        it('saca a la causa del estado inicial y abre el plazo', () => {
            expect(getCase(7).currentState).toMatchObject({ name: 'Iniciada', initial: true })

            const response = register(7, { proceduralStateId: 2, actDate: '2026-09-15', notes: 'Notificada la imputación.' })
            const act = dataOf<ProceduralAct>(response)

            expect(response.status).toBe(201)
            expect(act).toMatchObject({
                caseId: 7,
                // El estado resultante de un acto lleva sólo estos tres datos.
                resultingState: { proceduralStateId: 2, name: 'Cédula de notificación', custom: false },
                actDate: '2026-09-15',
                notificationDate: null,
                notes: 'Notificada la imputación.',
                deadline: {
                    timeLimitDays: 3,
                    dayType: 'BUSINESS',
                    countsFrom: '2026-09-15',
                    computedDueDate: '2026-09-18',
                    dueDate: '2026-09-18',
                    manuallyAdjusted: false,
                },
                registeredBy: { id: 6, fullName: 'Matías Ferreyra' },
            })

            // Se aplica al registrarse, sin confirmación: el estado y el
            // vencimiento quedan en `currentState` (D-35).
            expect(getCase(7).currentState).toEqual({
                proceduralStateId: 2,
                name: 'Cédula de notificación',
                custom: false,
                initial: false,
                proceduralActId: act.id,
                dueDate: '2026-09-18',
                businessDaysRemaining: 3,
                manuallyAdjusted: false,
            })
        })

        it('puede llevar la causa a cualquier estado no terminal del fuero', () => {
            expect(register(7, { proceduralStateId: 6, actDate: '2026-09-15' }).status).toBe(201)
            expect(getCase(7).currentState.name).toBe('Ofrecimiento de prueba')
        })

        it('la causa deja de figurar en "Iniciada" y pasa a contar en su estado', () => {
            register(7, { proceduralStateId: 2, actDate: '2026-09-15' })

            const initial = call('GET', '/cases', { as: 'gestion', query: { withoutProceduralActs: 'true' } })
            expect((initial.body as { data: Case[] }).data.map((c) => c.id)).not.toContain(7)

            const state = dataOf<{ activeCases: number }>(call('GET', '/procedural-states/2', { as: 'gestion' }))
            expect(state.activeCases).toBe(2)
        })
    })

    describe('el estado al que pasa la causa', () => {
        it('un estado que no abre plazo deja la causa sin vencimiento', () => {
            const act = dataOf<ProceduralAct>(register(1, { proceduralStateId: 3, actDate: '2026-09-15' }))

            expect(act.deadline).toBeNull()
            expect(getCase(1).currentState).toMatchObject({
                proceduralActId: act.id,
                dueDate: null,
                businessDaysRemaining: null,
                manuallyAdjusted: false,
            })
        })

        it('acepta un estado escrito a mano, con el vencimiento cargado a mano', () => {
            const response = register(4, {
                customState: 'Pedido de informes al Registro Nacional de Reincidencia',
                actDate: '2026-09-15',
                manualDueDate: '2026-09-25',
            })
            const act = dataOf<ProceduralAct>(response)

            expect(response.status).toBe(201)
            expect(act.resultingState).toEqual({
                proceduralStateId: null,
                name: 'Pedido de informes al Registro Nacional de Reincidencia',
                custom: true,
            })
            expect(act.deadline).toEqual({
                timeLimitDays: 0,
                dayType: 'NONE',
                countsFrom: '2026-09-15',
                computedDueDate: null,
                dueDate: '2026-09-25',
                manuallyAdjusted: true,
            })
            // Aparece en el grupo "Escritos a mano en causas" del filtro.
            expect(dataOf<string[]>(call('GET', '/cases/custom-states', { as: 'gestion' }))).toContain(
                'Pedido de informes al Registro Nacional de Reincidencia',
            )
        })

        it('un estado escrito a mano sin ajuste manual no tiene vencimiento', () => {
            const act = dataOf<ProceduralAct>(register(4, { customState: 'En espera de pericia', actDate: '2026-09-15' }))

            expect(act.deadline).toBeNull()
        })

        it('el ajuste manual conserva el vencimiento que daba la tabla', () => {
            const act = dataOf<ProceduralAct>(
                register(7, { proceduralStateId: 2, actDate: '2026-09-15', manualDueDate: '2026-09-22' }),
            )

            expect(act.deadline).toMatchObject({
                computedDueDate: '2026-09-18',
                dueDate: '2026-09-22',
                manuallyAdjusted: true,
            })
        })

        it('pide uno de los dos, nunca ambos ni ninguno', () => {
            const both = register(7, { proceduralStateId: 2, customState: 'Otro', actDate: '2026-09-15' })
            expect(errorOf(both).details).toHaveProperty('customState')

            const none = register(7, { actDate: '2026-09-15' })
            expect(errorOf(none).details).toHaveProperty('proceduralStateId')
        })

        it('rechaza un estado terminal, uno de otro fuero y uno dado de baja', () => {
            const message = 'El estado procesal no pertenece al fuero de la causa o es terminal.'

            expect(errorOf(register(7, { proceduralStateId: 9, actDate: '2026-09-15' })).details).toEqual({ proceduralStateId: message })
            expect(errorOf(register(7, { proceduralStateId: 14, actDate: '2026-09-15' })).details).toEqual({ proceduralStateId: message })

            db.proceduralStates.find((s) => s.id === 2)!.active = false
            expect(errorOf(register(7, { proceduralStateId: 2, actDate: '2026-09-15' })).details).toEqual({ proceduralStateId: message })
        })

        it('el estado inicial no puede ser destino de un acto, ni escrito a mano (D-34)', () => {
            const response = register(1, { customState: 'iniciada', actDate: '2026-09-15' })

            expect(response.status).toBe(400)
            expect(errorOf(response).details).toHaveProperty('customState')
            expect(getCase(1).currentState.initial).toBe(false)
        })

        it('un texto que coincide con un estado de la tabla tiene que viajar como id', () => {
            const response = register(7, { customState: 'cédula de notificación', actDate: '2026-09-15' })

            expect(response.status).toBe(400)
            expect(errorOf(response).details).toHaveProperty('customState')
        })
    })

    describe('fechas', () => {
        it('la fecha del acto es obligatoria y no puede ser futura', () => {
            expect(errorOf(register(7, { proceduralStateId: 2 })).details).toHaveProperty('actDate')
            expect(errorOf(register(7, { proceduralStateId: 2, actDate: '2026-09-16' })).details).toEqual({
                actDate: 'No puede ser posterior a hoy.',
            })
            expect(errorOf(register(7, { proceduralStateId: 2, actDate: '15/09/2026' })).details).toHaveProperty('actDate')
        })

        it('en el fuero administrativo el plazo corre desde la notificación (RN6)', () => {
            const response = register(11, {
                proceduralStateId: 11,
                actDate: '2026-09-11',
                notificationDate: '2026-09-14',
            })
            const act = dataOf<ProceduralAct>(response)

            expect(response.status).toBe(201)
            expect(act.notificationDate).toBe('2026-09-14')
            // 10 días hábiles desde el lunes 14, no desde el viernes 11.
            expect(act.deadline).toMatchObject({ countsFrom: '2026-09-14', dueDate: '2026-09-28' })
        })

        it('en el administrativo la notificación es obligatoria si el estado abre plazo', () => {
            const response = register(11, { proceduralStateId: 11, actDate: '2026-09-11' })

            expect(response.status).toBe(400)
            expect(errorOf(response).details).toEqual({
                notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).',
            })
        })

        it('la notificación va entre la fecha del acto y hoy', () => {
            const before = register(11, { proceduralStateId: 11, actDate: '2026-09-11', notificationDate: '2026-09-10' })
            const future = register(11, { proceduralStateId: 11, actDate: '2026-09-11', notificationDate: '2026-09-16' })

            expect(errorOf(before).details).toEqual({ notificationDate: 'Debe estar entre la fecha del acto y hoy.' })
            expect(errorOf(future).details).toEqual({ notificationDate: 'Debe estar entre la fecha del acto y hoy.' })
        })

        it('fuera del administrativo la notificación no corresponde', () => {
            const response = register(7, { proceduralStateId: 2, actDate: '2026-09-15', notificationDate: '2026-09-15' })

            expect(errorOf(response).details).toEqual({ notificationDate: 'Solo corresponde al fuero administrativo.' })
        })

        it('el vencimiento manual no puede ser anterior a la fecha desde la que corre el plazo', () => {
            const response = register(7, { proceduralStateId: 2, actDate: '2026-09-15', manualDueDate: '2026-09-14' })

            expect(errorOf(response).details).toHaveProperty('manualDueDate')
        })
    })

    describe('efecto sobre la causa', () => {
        it('un acto nuevo reemplaza el vencimiento anterior', () => {
            const before = getCase(1).currentState
            const act = dataOf<ProceduralAct>(register(1, { proceduralStateId: 5, actDate: '2026-09-15' }))
            const after = getCase(1).currentState

            expect(after.name).toBe('Citación a juicio')
            expect(after.proceduralActId).toBe(act.id)
            expect(after.proceduralActId).not.toBe(before.proceduralActId)
            expect(after.dueDate).toBe(act.deadline?.dueDate)
        })

        it('un acto de fecha anterior queda asentado pero no retrocede la causa (D-14)', () => {
            const before = getCase(1).currentState
            const response = register(1, { proceduralStateId: 2, actDate: '2024-07-04' })

            expect(response.status).toBe(201)
            expect(getCase(1).currentState).toEqual(before)
        })

        it('una causa en estado terminal no admite actos', () => {
            const response = register(9, { proceduralStateId: 2, actDate: '2026-09-15' })

            expect(response.status).toBe(422)
            expect(errorOf(response).code).toBe('CASE_IN_TERMINAL_STATE')
        })

        it('responde 400 a un id de causa inválido y 404 a una inexistente', () => {
            expect(errorOf(register('abc', {})).code).toBe('INVALID_PATH_PARAMETER')
            expect(errorOf(register(999, { proceduralStateId: 2, actDate: '2026-09-15' })).code).toBe('CASE_NOT_FOUND')
        })

        it('cambiar después el plazo del estado no recalcula el vencimiento registrado (D-08)', () => {
            const act = dataOf<ProceduralAct>(register(7, { proceduralStateId: 2, actDate: '2026-09-15' }))

            call('PATCH', '/procedural-states/2', { as: 'fvazquez', body: { timeLimitDays: 20 } })

            expect(getCase(7).currentState.dueDate).toBe(act.deadline?.dueDate)
        })

        it('renombrar el estado sí se refleja en la causa', () => {
            call('PATCH', '/procedural-states/4', { as: 'fvazquez', body: { name: 'Oposición a la elevación a juicio' } })

            expect(getCase(1).currentState.name).toBe('Oposición a la elevación a juicio')
        })
    })

    describe('GET deadline-preview', () => {
        it('devuelve el mismo vencimiento que después se registra (D-20)', () => {
            const previewed = dataOf<DeadlinePreview>(preview(7, { proceduralStateId: '4', actDate: '2026-09-15' }))
            const act = dataOf<ProceduralAct>(register(7, { proceduralStateId: 4, actDate: '2026-09-15' }))

            expect(previewed).toEqual({
                proceduralStateId: 4,
                timeLimitDays: 5,
                dayType: 'BUSINESS',
                countsFrom: '2026-09-15',
                dueDate: '2026-09-22',
                businessDaysRemaining: 5,
            })
            expect(act.deadline?.dueDate).toBe(previewed.dueDate)
        })

        it('no registra nada', () => {
            const acts = db.proceduralActs.length

            preview(7, { proceduralStateId: '4', actDate: '2026-09-15' })

            expect(db.proceduralActs).toHaveLength(acts)
            expect(getCase(7).currentState.initial).toBe(true)
        })

        it('si el estado no abre plazo, el vencimiento y los días vienen en null', () => {
            const previewed = dataOf<DeadlinePreview>(preview(7, { proceduralStateId: '3', actDate: '2026-09-15' }))

            expect(previewed).toMatchObject({ timeLimitDays: 0, dayType: 'NONE', dueDate: null, businessDaysRemaining: null })
        })

        it('en días corridos cuenta todos los días del calendario', () => {
            const previewed = dataOf<DeadlinePreview>(
                preview(11, { proceduralStateId: '16', actDate: '2026-09-10', notificationDate: '2026-09-11' }),
            )

            expect(previewed).toMatchObject({ dayType: 'CONSECUTIVE', countsFrom: '2026-09-11', dueDate: '2026-10-11' })
        })

        it('tiene las mismas restricciones que el registro, como 400 INVALID_REQUEST', () => {
            const missingNotification = preview(11, { proceduralStateId: '11', actDate: '2026-09-11' })
            expect(missingNotification.status).toBe(400)
            expect(errorOf(missingNotification)).toMatchObject({
                code: 'INVALID_REQUEST',
                details: { notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).' },
            })

            expect(errorOf(preview(7, { actDate: '2026-09-15' })).details).toHaveProperty('proceduralStateId')
            expect(errorOf(preview(7, { proceduralStateId: '9', actDate: '2026-09-15' })).details).toHaveProperty('proceduralStateId')
            expect(errorOf(preview(7, { proceduralStateId: '2' })).details).toHaveProperty('actDate')
        })

        it('es sólo para el abogado responsable, y la causa tiene que existir', () => {
            const query = { proceduralStateId: '2', actDate: '2026-09-15' }

            expect(preview(7, query, 'mferreyra').status).toBe(200)
            expect(preview(7, query, 'gestion').status).toBe(403)
            // Otro abogado tampoco puede previsualizar sobre una causa ajena.
            expect(errorOf(preview(7, query, 'mrios')).message).toBe(NOT_RESPONSIBLE)
            expect(preview(999, query).status).toBe(404)
        })
    })
})
