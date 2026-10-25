import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROUTE_TABLE } from '@/shared/mocks/handlers'

/**
 * Contrato: los endpoints del servidor falso son los del contrato.
 *
 * Toda la suite corre contra el mock, así que si el mock se desvía del
 * backend ningún otro test lo avisa. Este compara cada `MÉTODO /ruta` del mock
 * con los que declara la especificación OpenAPI (`docs/openapi/`, que es la
 * fuente versionada: `build/openapi.yaml` se genera y está ignorado por git).
 *
 * No valida la forma de las respuestas, sólo que el mock no invente endpoints
 * ni deje sin implementar uno del contrato. Es la red mínima, sin dependencias.
 */

/** Vitest corre desde `frontend/`, y la especificación está en `../docs/openapi`. */
const OPENAPI_DIR = resolve(process.cwd(), '../docs/openapi')

const METHODS = ['get', 'post', 'put', 'patch', 'delete']

const read = (relative: string) => readFileSync(resolve(OPENAPI_DIR, relative), 'utf8')

/** Los nombres de los parámetros no importan: `:caseId` y `{caseId}` son lo mismo. */
const normalize = (path: string) => path.replace(/:[A-Za-z]+/g, '{}').replace(/\{[^}]+\}/g, '{}')

/** `MÉTODO /ruta` de cada operación declarada en la especificación. */
function specOperations(): string[] {
    const root = read('openapi.yaml').split(/\r?\n/)
    const start = root.findIndex((line) => line.trimEnd() === 'paths:')
    const operations: string[] = []
    let current: { path: string } | null = null

    for (const line of root.slice(start + 1)) {
        if (line && !line.startsWith(' ')) break // terminó el bloque `paths:`
        const route = /^\s+(\/\S*):\s*$/.exec(line)
        if (route) {
            current = { path: route[1] }
            continue
        }
        const ref = /^\s+\$ref:\s*(\S+)\s*$/.exec(line)
        if (ref && current) {
            for (const entry of read(ref[1]).split(/\r?\n/)) {
                const method = /^([a-z]+):\s*$/.exec(entry)
                if (method && METHODS.includes(method[1])) {
                    operations.push(`${method[1].toUpperCase()} ${normalize(current.path)}`)
                }
            }
        }
    }
    return operations.sort()
}

const mockOperations = () => ROUTE_TABLE.map((r) => `${r.method} ${normalize(r.path)}`).sort()

describe('contrato OpenAPI ⟷ servidor falso', () => {
    it('lee la especificación (si esto falla, el test está mal armado, no el mock)', () => {
        expect(specOperations().length).toBeGreaterThan(30)
    })

    it('el mock no implementa ningún endpoint que el contrato no tenga', () => {
        const spec = new Set(specOperations())
        expect(mockOperations().filter((op) => !spec.has(op))).toEqual([])
    })

    it('el mock implementa todos los endpoints del contrato', () => {
        const mock = new Set(mockOperations())
        expect(specOperations().filter((op) => !mock.has(op))).toEqual([])
    })
})
