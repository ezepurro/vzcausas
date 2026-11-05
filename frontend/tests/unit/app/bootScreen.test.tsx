import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BootScreen, DOTS_MS, ORBIT_MS } from '@/app/layouts/BootScreen'

/**
 * La pantalla de carga está dos veces: escrita en `index.html` (se ve antes de
 * que arranque JavaScript) y en `BootScreen` (la usa React después). Si se
 * separan, al pasar de una a la otra la imagen salta. Este test las ata.
 */

/** Vitest corre desde `frontend/`. */
const INDEX_HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

interface Shape {
    tag: string
    attrs: [string, string][]
    text: string
    children: Shape[]
}

/** Lo que se ve de un elemento: etiqueta, atributos y texto. `style` no: es el desfase de la animación. */
function shape(el: Element): Shape {
    return {
        tag: el.tagName.toLowerCase(),
        attrs: [...el.attributes]
            .filter((a) => a.name !== 'style')
            .map((a): [string, string] => [a.name, a.value])
            .sort(([a], [b]) => a.localeCompare(b)),
        text: [...el.childNodes]
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent?.trim() ?? '')
            .join(''),
        children: [...el.children].map(shape),
    }
}

function bootInIndexHtml(): Element {
    const doc = new DOMParser().parseFromString(INDEX_HTML, 'text/html')
    const boot = doc.querySelector('#root > .vz-boot')
    if (!boot) throw new Error('index.html no trae la pantalla de carga adentro de #root')
    return boot
}

describe('pantalla de carga: index.html ⟷ BootScreen', () => {
    it('index.html la trae adentro de #root, para que se vea antes que el JavaScript', () => {
        const boot = bootInIndexHtml()
        expect(boot.getAttribute('role')).toBe('status')
        expect(boot.textContent).toBe('Cargando…')
    })

    it('BootScreen dibuja exactamente lo mismo que index.html', () => {
        const { container } = render(<BootScreen label="Cargando" />)
        expect(shape(container.firstElementChild!)).toEqual(shape(bootInIndexHtml()))
    })

    it('las animaciones duran lo mismo en el CSS de index.html y en las constantes', () => {
        expect(INDEX_HTML).toMatch(new RegExp(`animation: vz-boot-orbit ${ORBIT_MS}ms linear infinite;`))
        expect(INDEX_HTML).toMatch(new RegExp(`animation: vz-boot-dots ${DOTS_MS}ms steps\\(1, end\\) infinite;`))
    })

    it('arranca cada animación desfasada, para seguir donde iba la del HTML', () => {
        const { container } = render(<BootScreen label="Verificando la sesión" />)
        const animated = container.querySelectorAll<HTMLElement | SVGGElement>('.vz-boot__orbit, .vz-boot__ellipsis')
        expect(animated).toHaveLength(2)
        for (const el of animated) expect(el.style.animationDelay).toMatch(/^-\d+ms$/)
    })

    /* Los puntos suspensivos se animan recortando el "…", no reemplazándolo:
       el aviso dice lo mismo para un lector de pantalla y para
       `waitForSession`, que lo busca por su texto completo. */
    it('el aviso completo sigue siendo el de siempre, con su "…"', () => {
        render(<BootScreen label="Verificando la sesión" />)
        expect(screen.getByRole('status').textContent).toBe('Verificando la sesión…')
    })
})
