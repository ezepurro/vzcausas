/**
 * Genera la matriz de trazabilidad HU → criterio de aceptación → tests.
 *
 *   npm run ca-matrix
 *
 * Lee los comentarios `CA-x.y` de `tests/` y escribe
 * `docs/Frontend-Architecture/MATRIZ_CA.md`. Un criterio que es del backend se
 * marca en el test con `@backend CA-x.y` y sale como "Backend", no como hueco.
 *
 * Sirve para la Definición del Producto (cada historia con sus casos de
 * prueba) sin tener que escribir un test por criterio.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const TESTS = join(ROOT, 'tests')
const OUT = resolve(ROOT, '..', 'docs', 'Frontend-Architecture', 'MATRIZ_CA.md')

function files(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) return files(path)
        return /\.(test|spec)\.tsx?$/.test(entry.name) ? [path] : []
    })
}

const level = (rel) => (rel.startsWith('unit') ? 'unit' : rel.startsWith('components') ? 'componentes' : 'e2e')

/** CA → { files: Set, backend: boolean } */
const matrix = new Map()
const entry = (id) => {
    if (!matrix.has(id)) matrix.set(id, { files: new Set(), backend: false })
    return matrix.get(id)
}

for (const file of files(TESTS)) {
    const rel = relative(TESTS, file).split(sep).join('/')
    let text = readFileSync(file, 'utf8')
    // Los comentarios marcados con `@backend` declaran criterios que no se prueban acá.
    text = text.replace(/\/\*[\s\S]*?\*\//g, (block) => {
        if (!block.includes('@backend')) return block
        for (const id of block.match(/CA-\d+\.\d+/g) ?? []) entry(id).backend = true
        return ''
    })
    for (const id of text.match(/CA-\d+\.\d+/g) ?? []) entry(id).files.add(rel)
}

const num = (id) => id.slice(3).split('.').map(Number)
const ids = [...matrix.keys()].sort((a, b) => {
    const [ha, ca] = num(a)
    const [hb, cb] = num(b)
    return ha - hb || ca - cb
})

const byStory = new Map()
for (const id of ids) {
    const story = num(id)[0]
    if (!byStory.has(story)) byStory.set(story, [])
    byStory.get(story).push(id)
}

const lines = [
    '# Matriz de criterios de aceptación → tests (frontend)',
    '',
    '> Archivo generado con `npm run ca-matrix`. No se edita a mano.',
    '',
    'Cada criterio (`CA-x.y`) figura con los tests donde está citado. **Backend** es un criterio',
    'que corresponde al servidor: el frontend muestra lo que recibe y no lo prueba.',
    '',
]
for (const [story, list] of byStory) {
    lines.push(`## HU-${story}`, '', '| Criterio | Dónde se cubre |', '| --- | --- |')
    for (const id of list) {
        const { files: where, backend } = matrix.get(id)
        const cells = [...where].sort().map((f) => `\`${f}\` (${level(f)})`)
        if (backend) cells.push('Backend')
        lines.push(`| ${id} | ${cells.join('<br>')} |`)
    }
    lines.push('')
}
const total = ids.length
const onlyBackend = ids.filter((id) => matrix.get(id).files.size === 0).length
lines.push('---', '', `${total} criterios citados · ${onlyBackend} sólo del backend.`, '')

writeFileSync(OUT, lines.join('\r\n'))
console.log(`Matriz escrita en ${relative(resolve(ROOT, '..'), OUT)}: ${total} criterios (${onlyBackend} sólo del backend).`)
