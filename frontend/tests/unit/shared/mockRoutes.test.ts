import { describe, expect, it } from 'vitest'
import { ROUTE_TABLE } from '@/shared/mocks/handlers'
import { isRoutePath, normalizePath } from '@/shared/mocks/msw-handlers'

/**
 * Qué pedidos atiende el mock. Los handlers se registran con `*` adelante, así
 * que MSW también atrapa archivos de la app cuyo nombre se parece a una ruta
 * de la API; `isRoutePath` es lo que los deja pasar a Vite.
 */
describe('rutas del mock', () => {
    /* Con el 404 del mock en lugar del archivo, la pantalla que lo importa no
       se podía cargar ("No se pudo cargar esta pantalla"). */
    it.each([
        ['/src/features/clients/index.ts', '/clients/:clientId'],
        ['/src/features/lawyers/index.ts', '/lawyers/:lawyerId'],
        ['/src/features/cases/index.ts', '/cases/:caseId'],
        ['/src/features/users/pages/UsersPage.tsx', '/users/:userId'],
    ])('no atiende el archivo de la app %s', (pathname, routePath) => {
        expect(isRoutePath(normalizePath(pathname), routePath)).toBe(false)
    })

    it.each(['/clients/3', '/api/clients/3', '/api/v1/clients/3'])('atiende %s', (pathname) => {
        expect(isRoutePath(normalizePath(pathname), '/clients/:clientId')).toBe(true)
    })

    it('cada ruta de la tabla atiende su propio pedido', () => {
        // Un id de ejemplo en cada `:param`, con el prefijo que usa la app.
        const unmatched = ROUTE_TABLE.filter(({ path }) => {
            const pathname = `/api/v1${path.replace(/:[^/]+/g, '7')}`
            return !isRoutePath(normalizePath(pathname), path)
        })
        expect(unmatched).toEqual([])
    })
})
