import { describe, expect, it } from 'vitest'
import { canAccess, matchRoute } from '@/app/access/access'
import { ROLES } from '@/features/auth/types/session'

describe('matchRoute', () => {
    it('una subruta cae en la sección que la contiene', () => {
        expect(matchRoute('/usuarios/8')).toBe('/usuarios')
        expect(matchRoute('/usuarios/8/editar')).toBe('/usuarios')
    })
})

describe('canAccess', () => {
    /* CA-9.10 y CA-20.7 (RN11): todo el estudio entra a las secciones de consulta.
       Qué datos devuelve el servidor a cada perfil es del backend. */
    it('todos los perfiles entran al trabajo diario', () => {
        for (const role of ROLES) {
            for (const route of ['/inicio', '/causas', '/vencimientos', '/clientes', '/modelos']) {
                expect(canAccess([role], route)).toBe(true)
            }
        }
    })

    /* Matriz de permisos del 11/10/2026 (V3 §4, D-39): consultar abogados y
       administrar estados procesales y calificaciones legales es de los tres
       perfiles. */
    it('todos los perfiles entran a abogados, estados y plazos y calificaciones legales', () => {
        for (const role of ROLES) {
            for (const route of ['/abogados', '/estados-y-plazos', '/calificaciones-legales']) {
                expect(canAccess([role], route)).toBe(true)
            }
        }
    })

    it('usuarios y reportes son sólo del Administrador', () => {
        for (const route of ['/usuarios', '/reportes']) {
            expect(canAccess(['ADMINISTRATOR'], route)).toBe(true)
            expect(canAccess(['LAWYER'], route)).toBe(false)
            expect(canAccess(['SECRETARY'], route)).toBe(false)
        }
    })

    /* Denegar por defecto: una pantalla nueva que nadie declaró no la ve
       nadie, y se nota enseguida. Al revés quedaría abierta sin aviso. */
    it('una ruta no declarada queda denegada, incluso para el administrador', () => {
        expect(canAccess(['ADMINISTRATOR'], '/configuracion')).toBe(false)
    })
})
