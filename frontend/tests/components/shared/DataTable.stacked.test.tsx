import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { DataTable, type Column } from '@/shared/components/ui'

/**
 * Cuándo una tabla se dibuja como fichas (`vz-table--stacked`, tanda 14 de
 * `docs/auditoria-front`).
 *
 * Antes dependía sólo de la ventana (1180px o menos, en el CSS), y entre 1181
 * y 1360px las tablas de 1.040px de mínimo (Causas, Usuarios) scrolleaban en
 * horizontal. Ahora también pasa a fichas si su lugar es más angosto que su
 * mínimo. jsdom no tiene ni `matchMedia` ni `ResizeObserver` ni medidas: acá
 * se reemplazan los tres.
 */

interface Row { id: number; caption: string }
const ROWS: Row[] = [{ id: 1, caption: 'GÓMEZ, Ariel p.s.a. estafa' }]
const COLUMNS: Column<Row>[] = [{ id: 'caption', header: 'Carátula', cell: (r) => r.caption, primary: true }]

/** El ancho que "mide" el lugar de la tabla. */
let width = 0
/** Si la ventana está en 1180px o menos. */
let narrowWindow = false
const observers: (() => void)[] = []

beforeEach(() => {
    width = 0
    narrowWindow = false
    observers.length = 0
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
    vi.stubGlobal('matchMedia', (query: string) => ({
        media: query,
        get matches() { return narrowWindow },
        addEventListener: () => {},
        removeEventListener: () => {},
    }))
    vi.stubGlobal('ResizeObserver', class {
        constructor(callback: () => void) { observers.push(callback) }
        observe() {}
        disconnect() {}
    })
})

afterEach(() => {
    vi.unstubAllGlobals()
})

/** Lo que pasa cuando cambia el ancho: el navegador avisa a los observadores. */
function resizeTo(next: number) {
    width = next
    act(() => observers.forEach((notify) => notify()))
}

const table = () => screen.getByRole('table')

function renderTable() {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => String(r.id)} minWidth={1040} />)
}

describe('DataTable: tabla o fichas', () => {
    it('con lugar de sobra es una tabla', () => {
        width = 1120
        renderTable()
        expect(table()).not.toHaveClass('vz-table--stacked')
    })

    it('si no entra en su lugar pasa a fichas, aunque la ventana sea ancha', () => {
        width = 961 // Causas a 1280px
        renderTable()
        expect(table()).toHaveClass('vz-table--stacked')
    })

    it('con la ventana en 1180px o menos es ficha, como siempre', () => {
        narrowWindow = true
        width = 2000
        renderTable()
        expect(table()).toHaveClass('vz-table--stacked')
    })

    it('se adapta al cambiar el ancho, sin saltar de una forma a otra en el límite', () => {
        width = 1100
        renderTable()
        expect(table()).not.toHaveClass('vz-table--stacked')

        resizeTo(1000)
        expect(table()).toHaveClass('vz-table--stacked')

        // De ficha a tabla pide un margen: al perder el borde, el panel gana 2px.
        resizeTo(1042)
        expect(table()).toHaveClass('vz-table--stacked')

        resizeTo(1046)
        expect(table()).not.toHaveClass('vz-table--stacked')
    })
})
