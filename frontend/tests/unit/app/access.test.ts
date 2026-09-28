import { describe, expect, it } from 'vitest'
import { canAccess, matchRoute, ROUTE_ACCESS } from '@/app/access/access'
import { ROLES } from '@/features/auth/types/session'

describe('matchRoute', () => {
    it('devuelve la ruta declarada cuando coincide exacta', () => {
        expect(matchRoute('/usuarios')).toBe('/usuarios')
    })

    it('una subruta cae en la sección que la contiene', () => {
        expect(matchRoute('/usuarios/8')).toBe('/usuarios')
        expect(matchRoute('/usuarios/8/editar')).toBe('/usuarios')
    })

    /* El `/` del prefijo no es decoración: sin él, cualquier ruta que empiece
       con las mismas letras heredaría los permisos de otra sección. */
    it('no confunde una ruta que sólo empieza con las mismas letras', () => {
        expect(matchRoute('/usuariosx')).toBeUndefined()
    })

    it('devuelve undefined para una ruta que no está declarada', () => {
        expect(matchRoute('/')).toBeUndefined()
        expect(matchRoute('/configuracion')).toBeUndefined()
    })
})

describe('canAccess', () => {
    it('el administrador entra a las secciones de administración', () => {
        expect(canAccess(['ADMINISTRATOR'], '/usuarios')).toBe(true)
        expect(canAccess(['ADMINISTRATOR'], '/abogados')).toBe(true)
        expect(canAccess(['ADMINISTRATOR'], '/estados-y-plazos')).toBe(true)
    })

    it('abogado y secretaría no entran a administración', () => {
        for (const route of ['/usuarios', '/abogados', '/estados-y-plazos']) {
            expect(canAccess(['LAWYER'], route)).toBe(false)
            expect(canAccess(['SECRETARY'], route)).toBe(false)
        }
    })

    it('todos los perfiles entran al trabajo diario', () => {
        for (const role of ROLES) {
            for (const route of ['/inicio', '/causas', '/vencimientos', '/clientes', '/modelos']) {
                expect(canAccess([role], route)).toBe(true)
            }
        }
    })

    /* Lo habitual en el estudio es ser administrador y abogado a la vez: los
       roles se suman, no se pisan. */
    it('con varios roles alcanza con que uno habilite la ruta', () => {
        expect(canAccess(['LAWYER', 'ADMINISTRATOR'], '/usuarios')).toBe(true)
        expect(canAccess(['SECRETARY', 'LAWYER'], '/usuarios')).toBe(false)
    })

    it('respeta el permiso de la sección en una subruta', () => {
        expect(canAccess(['ADMINISTRATOR'], '/usuarios/8')).toBe(true)
        expect(canAccess(['SECRETARY'], '/usuarios/8')).toBe(false)
    })

    /* Denegar por defecto: una pantalla nueva que nadie declaró no la ve
       nadie, y se nota enseguida. Al revés quedaría abierta sin aviso. */
    it('una ruta no declarada queda denegada, incluso para el administrador', () => {
        expect(canAccess(['ADMINISTRATOR'], '/configuracion')).toBe(false)
    })

    it('sin roles no se entra a ningún lado', () => {
        for (const route of Object.keys(ROUTE_ACCESS)) {
            expect(canAccess([], route)).toBe(false)
        }
    })
})
