import { describe, expect, it } from 'vitest'
import { ROUTE_ACCESS } from '@/app/access/access'
import { PAGES, preloadSection, SECTION_PAGES } from '@/app/router/pages'

/**
 * Las pantallas que se cargan recién cuando hacen falta (`lazy` del router).
 *
 * Un nombre mal elegido en `pages.ts` no lo ve TypeScript ni ningún test de
 * pantalla —esos importan la página directo—: falla recién al navegar. Por eso
 * se carga cada una acá.
 */
describe('pantallas con carga diferida', () => {
    it('cada entrada carga su pantalla', async () => {
        for (const [name, load] of Object.entries(PAGES)) {
            const { Component } = await load()
            expect(Component, name).toBeTypeOf('function')
        }
        /* Tiempo propio: importa todas las pantallas adentro del test, y solo
           ya tarda cerca de los 5 s del tope general (3,6 a 4,3 s). En la suite
           entera a veces se pasaba. No mide velocidad: que cada nombre cargue. */
    }, 15_000)

    // Reportes está en el rail pero no tiene pantalla (DECISIONES.md §3): no hay qué adelantar.
    it('cada sección del rail con pantalla se puede adelantar', () => {
        const sections = Object.keys(ROUTE_ACCESS).filter((route) => route !== '/reportes')
        for (const route of sections) {
            expect(SECTION_PAGES[route], route).toBeDefined()
        }
    })

    it('adelantar una sección sin pantalla no hace nada ni falla', () => {
        expect(() => preloadSection('/reportes')).not.toThrow()
        expect(() => preloadSection('/no-existe')).not.toThrow()
    })
})
