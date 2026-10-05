/**
 * La coherencia de los datos semilla.
 *
 * Los fixtures se escriben a mano y se referencian entre sí por id. Estos
 * tests son la red que avisa si alguien agrega una causa que apunta a un
 * cliente que no existe, a un estado de otro fuero o a un abogado sin cuenta:
 * errores que en pantalla se ven como un dato raro y cuestan horas de rastrear.
 */

import { describe, expect, it } from 'vitest'
import {
    CASE_SEEDS,
    CLIENTS,
    db,
    INITIAL_STATE_NAME,
    isActiveCase,
    LAWYERS,
    LEGAL_QUALIFICATIONS,
    PROCEDURAL_ROLES_BY_JURISDICTION,
    PROCEDURAL_STATES,
    toCase,
    toClient,
    toLawyer,
    toLegalQualification,
    toProceduralState,
    USERS,
    USERS_WITH_DEPENDENCIES,
} from '@/shared/mocks'
import { usePrototypeToday } from './helpers'

const unique = <T>(values: T[]) => new Set(values).size === values.length

describe('semillas del mock', () => {
    usePrototypeToday()

    describe('identificadores y unicidad', () => {
        it('no repite ids en ningún recurso', () => {
            expect(unique(USERS.map((u) => u.id))).toBe(true)
            expect(unique(LAWYERS.map((l) => l.id))).toBe(true)
            expect(unique(PROCEDURAL_STATES.map((s) => s.id))).toBe(true)
            expect(unique(LEGAL_QUALIFICATIONS.map((q) => q.id))).toBe(true)
            expect(unique(CLIENTS.map((c) => c.id))).toBe(true)
            expect(unique(CASE_SEEDS.map((c) => c.id))).toBe(true)
        })

        it('el SAC, cuando está, tiene 8 dígitos y no se repite', () => {
            // Es opcional (D-33): la causa 23 no lo tiene.
            const sacs = CASE_SEEDS.map((c) => c.sacNumber).filter((sac): sac is string => sac !== null)

            for (const sac of sacs) expect(sac).toMatch(/^\d{8}$/)
            expect(unique(sacs)).toBe(true)
            expect(sacs.length).toBeLessThan(CASE_SEEDS.length)
        })

        it('el DNI tiene 7 u 8 dígitos sin puntos y no se repite entre los vigentes', () => {
            for (const c of CLIENTS) expect(c.dni).toMatch(/^\d{7,8}$/)
            expect(unique(CLIENTS.filter((c) => c.active).map((c) => c.dni))).toBe(true)
        })

        it('las calificaciones vigentes no repiten denominación', () => {
            const names = LEGAL_QUALIFICATIONS.filter((q) => q.active).map((q) => q.name.toLowerCase())
            expect(unique(names)).toBe(true)
        })

        it('los estados no llevan posición ni causas activas escritas a mano (D-31)', () => {
            for (const state of PROCEDURAL_STATES) {
                expect(state).not.toHaveProperty('position')
                expect(state).not.toHaveProperty('activeCases')
            }
        })

        it('"Iniciada" no está en la tabla: es el estado inicial, de sistema (D-34)', () => {
            const names = PROCEDURAL_STATES.map((s) => s.name.toLowerCase())

            expect(names).not.toContain(INITIAL_STATE_NAME.toLowerCase())
        })
    })

    describe('referencias de las causas', () => {
        it('cada causa apunta a un cliente y a un abogado vigentes', () => {
            for (const c of CASE_SEEDS) {
                expect(CLIENTS.find((x) => x.id === c.clientId)?.active, `cliente de la causa ${c.id}`).toBe(true)
                expect(LAWYERS.find((x) => x.id === c.responsibleLawyerId)?.active, `abogado de la causa ${c.id}`).toBe(true)
            }
        })

        it('el abogado responsable tiene una cuenta con rol LAWYER', () => {
            // Sólo el abogado responsable registra los actos de su causa (D-30):
            // sin cuenta nadie podría cargarlos.
            for (const c of CASE_SEEDS) {
                const user = USERS.find((u) => u.lawyerId === c.responsibleLawyerId && u.active)
                expect(user?.roles, `cuenta del abogado de la causa ${c.id}`).toContain('LAWYER')
            }
        })

        it('el rol procesal corresponde al fuero', () => {
            for (const c of CASE_SEEDS) {
                expect(PROCEDURAL_ROLES_BY_JURISDICTION[c.jurisdiction], `rol de la causa ${c.id}`)
                    .toContain(c.proceduralRole)
            }
        })

        it('sólo las causas penales tienen calificaciones, y pueden no tener ninguna (D-33)', () => {
            for (const c of CASE_SEEDS) {
                const count = c.qualifications?.length ?? 0
                if (c.jurisdiction === 'CRIMINAL') {
                    for (const q of c.qualifications ?? []) {
                        expect(LEGAL_QUALIFICATIONS.some((x) => x.id === q.legalQualificationId)).toBe(true)
                        expect(q.offenseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
                    }
                } else {
                    expect(count, `calificaciones de la causa ${c.id}`).toBe(0)
                }
            }
        })

        it('sólo las causas no penales tienen objeto y contraparte, y el objeto no falta', () => {
            for (const c of CASE_SEEDS) {
                if (c.jurisdiction === 'CRIMINAL') {
                    expect(c.subjectMatter, `objeto de la causa ${c.id}`).toBeUndefined()
                    expect(c.counterparty, `contraparte de la causa ${c.id}`).toBeUndefined()
                } else {
                    expect(c.subjectMatter?.length ?? 0, `objeto de la causa ${c.id}`).toBeGreaterThan(0)
                    expect(c.subjectMatter?.length ?? 0).toBeLessThanOrEqual(800)
                }
            }
        })
    })

    describe('actos procesales', () => {
        it('cada acto lleva a un estado del fuero de su causa', () => {
            for (const c of CASE_SEEDS) {
                for (const act of c.acts) {
                    if (typeof act.state === 'string') continue
                    const state = PROCEDURAL_STATES.find((s) => s.id === act.state)
                    expect(state?.jurisdiction, `estado ${act.state} de la causa ${c.id}`).toBe(c.jurisdiction)
                }
            }
        })

        it('un estado escrito a mano no repite el nombre de uno de la tabla del fuero', () => {
            for (const c of CASE_SEEDS) {
                for (const act of c.acts) {
                    if (typeof act.state !== 'string') continue
                    const clash = PROCEDURAL_STATES.some(
                        (s) => s.jurisdiction === c.jurisdiction && s.name.toLowerCase() === (act.state as string).toLowerCase(),
                    )
                    expect(clash).toBe(false)
                }
            }
        })

        it('la notificación va sólo en el fuero administrativo, y no falta cuando el estado abre plazo', () => {
            for (const c of CASE_SEEDS) {
                for (const act of c.acts) {
                    if (c.jurisdiction !== 'ADMINISTRATIVE') {
                        expect(act.notifiedOn, `notificación en la causa ${c.id}`).toBeUndefined()
                        continue
                    }
                    const state = PROCEDURAL_STATES.find((s) => s.id === act.state)
                    if (state && state.timeLimitDays > 0) {
                        expect(act.notifiedOn, `notificación en la causa ${c.id}`).toBeDefined()
                    }
                }
            }
        })

        it('los actos de cada causa quedan en orden cronológico', () => {
            for (const stored of db.cases) {
                const dates = db.proceduralActs.filter((a) => a.caseId === stored.id).map((a) => a.actDate)
                expect(dates, `actos de la causa ${stored.id}`).toEqual([...dates].sort())
            }
        })

        it('la notificación nunca es anterior al acto ni posterior a hoy', () => {
            for (const act of db.proceduralActs) {
                if (!act.notificationDate) continue
                expect(act.notificationDate >= act.actDate).toBe(true)
                expect(act.notificationDate <= '2026-09-15').toBe(true)
            }
        })
    })

    describe('lo que se calcula', () => {
        it('todas las causas se serializan sin referencias rotas', () => {
            expect(() => db.cases.map(toCase)).not.toThrow()
        })

        it('las causas activas suman lo mismo contadas por abogado, por cliente y por estado', () => {
            const active = db.cases.filter(isActiveCase)
            const withState = active.filter((c) => toCase(c).currentState.proceduralStateId !== null)

            const byLawyer = db.lawyers.map(toLawyer).reduce((n, l) => n + l.activeCases, 0)
            const byClient = db.clients.map(toClient).reduce((n, c) => n + c.activeCases, 0)
            const byState = db.proceduralStates.map(toProceduralState).reduce((n, s) => n + s.activeCases, 0)

            expect(active).toHaveLength(20)
            expect(byLawyer).toBe(active.length)
            expect(byClient).toBe(active.length)
            // Las causas en "Iniciada" y las de estado escrito a mano no están en ningún estado de la tabla.
            expect(byState).toBe(withState.length)
        })

        it('un estado terminal no tiene causas activas', () => {
            for (const state of db.proceduralStates.filter((s) => s.terminal)) {
                expect(toProceduralState(state).activeCases).toBe(0)
            }
        })

        it('la calificación dada de baja sigue contando la causa que la registra', () => {
            const retired = db.legalQualifications.find((q) => q.id === 9)!

            expect(retired.active).toBe(false)
            expect(toLegalQualification(retired).activeCases).toBe(1)
        })

        it('las cuentas que no se pueden dar de baja son de abogados con causas', () => {
            for (const userId of USERS_WITH_DEPENDENCIES) {
                const lawyerId = USERS.find((u) => u.id === userId)?.lawyerId
                const lawyer = db.lawyers.find((l) => l.id === lawyerId)!
                expect(toLawyer(lawyer).activeCases).toBeGreaterThan(0)
            }
        })

        it('las seis causas del prototipo muestran los vencimientos del prototipo', () => {
            const remaining = (id: number) =>
                toCase(db.cases.find((c) => c.id === id)!).currentState.businessDaysRemaining

            expect(remaining(1)).toBe(1) // En 1 día hábil
            expect(remaining(2)).toBe(-2) // Vencido hace 2 días
            expect(remaining(3)).toBe(3) // En 3 días hábiles
            expect(remaining(4)).toBeNull() // Sin vencimiento
            expect(remaining(5)).toBe(10) // En 10 días hábiles
            expect(remaining(6)).toBe(0) // Vence hoy
        })

        it('las fechas de las causas del prototipo son las del prototipo', () => {
            const dueDate = (id: number) => toCase(db.cases.find((c) => c.id === id)!).currentState.dueDate

            expect(dueDate(1)).toBe('2026-09-16')
            expect(dueDate(2)).toBe('2026-09-11')
            expect(dueDate(3)).toBe('2026-09-18')
            expect(dueDate(5)).toBe('2026-09-29')
            expect(dueDate(6)).toBe('2026-09-15')
        })
    })
})
