import { describe, expect, it } from 'vitest'
import { canAccess, matchRoute } from '@/app/access/access'
import { ROLES } from '@/features/auth/types/session'

describe('matchRoute', () => {
    it('una subruta cae en la sección que la contiene', () => {
        expect(matchRoute('/usuarios/8')).toBe('/usuarios')
        expect(matchRoute('/usuarios/8/editar')).toBe('/usuarios')
    })

    it('no distingue mayúsculas, como el router', () => {
        expect(matchRoute('/Abogados')).toBe('/abogados')
        expect(matchRoute('/CAUSAS/12/acto')).toBe('/causas')
        expect(canAccess(['SECRETARY'], '/Abogados')).toBe(true)
        expect(canAccess(['SECRETARY'], '/Usuarios')).toBe(false)
    })
})

describe('canAccess', () => {
    /* CA-9.10 y CA-20.7 (RN11): todo el estudio entra a las secciones de consulta.
       Qué datos devuelve el servidor a cada perfil es del backend. */
    it('todos los perfiles entran al trabajo diario', () => {
        for (const role of ROLES) {
            for (const route of ['/causas', '/clientes']) {
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

    /* El tablero (CA-41.10, CA-41.13, CA-42.9) y los modelos formales
       (CA-34.8, CA-35.8) no son de la Secretaría: entra directo a Causas y
       "Modelos" no aparece en su menú (V4 §4). */
    it('inicio y modelos son del Administrador y del Abogado, no de la Secretaría', () => {
        for (const route of ['/inicio', '/modelos']) {
            expect(canAccess(['ADMINISTRATOR'], route)).toBe(true)
            expect(canAccess(['LAWYER'], route)).toBe(true)
            expect(canAccess(['SECRETARY'], route)).toBe(false)
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
