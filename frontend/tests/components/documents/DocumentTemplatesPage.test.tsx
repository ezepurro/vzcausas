import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { DocumentTemplatesPage } from '@/features/documents/pages/DocumentTemplatesPage'

/**
 * Modelos formales (HU-34 y HU-35), en `/modelos`. La pantalla y sus textos
 * son los de "Modelos formales" del prototipo; las reglas, las de V4 §3.10.
 * El modelo no tiene tipo (D-56).
 *
 * Los modelos vigentes del mock: Penal 6 (el último del 21/08/2026),
 * Administrativo 4 (08/09/2026) y Amparo 2 (09/09/2026).
 *
 * Que la Secretaría no vea la sección lo prueban `access.test.ts` y
 * `AppLayout.test.tsx` (CA-35.8).
 */

vi.setConfig({ testTimeout: 15_000 })

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function renderPage(as = 'mrios') {
    return renderWithProviders(<DocumentTemplatesPage />, { as, path: '/modelos', route: '/modelos' })
}

type User = ReturnType<typeof renderPage>['user']

/** Sube desde un texto hasta el primer contenedor que cumple la condición. */
function containerOf(element: HTMLElement, matches: (el: HTMLElement) => boolean): HTMLElement {
    let el: HTMLElement | null = element
    while (el && !matches(el)) el = el.parentElement
    if (!el) throw new Error(`No se encontró el contenedor de "${element.textContent}".`)
    return el
}

/** La tarjeta de un fuero en la vista general: la que dice "Actualizado". */
async function fueroCard(name: string) {
    const title = await screen.findByText(name, { exact: true })
    return containerOf(title, (el) => el.textContent?.includes('Actualizado') ?? false)
}

/** La tarjeta de un modelo dentro del fuero: la que tiene su "Descargar". */
async function templateCard(name: string) {
    const title = await screen.findByText(name, { exact: true })
    return containerOf(title, (el) => within(el).queryByRole('button', { name: 'Descargar' }) !== null)
}

async function openFuero(user: User, name: string) {
    await user.click(await fueroCard(name))
}

async function openCreate(user: User) {
    await user.click(await screen.findByRole('button', { name: 'Registrar modelo' }))
    return screen.getByRole('dialog')
}

async function fillCreate(user: User, dialog: HTMLElement, name: string, fileName = 'recurso-de-queja.docx') {
    await user.type(within(dialog).getByLabelText(/^nombre del modelo/i), name)
    await user.upload(within(dialog).getByLabelText(/^archivo del modelo/i), new File(['contenido'], fileName, { type: DOCX }))
}

describe('DocumentTemplatesPage', () => {
    usePrototypeToday()

    describe('consulta (HU-35)', () => {
        // CA-35.4, CA-35.11
        it('muestra una tarjeta por fuero con sus modelos vigentes y la última actualización', async () => {
            renderPage()

            expect(await screen.findByRole('heading', { name: 'Modelos formales', level: 1 })).toBeInTheDocument()
            const penal = await fueroCard('Penal')
            expect(penal).toHaveTextContent('6 modelos vigentes')
            expect(penal).toHaveTextContent('Actualizado 21/08/2026')
            expect(await fueroCard('Administrativo')).toHaveTextContent('4 modelos vigentes')
            expect(await fueroCard('Amparo')).toHaveTextContent('2 modelos vigentes')
            expect(await fueroCard('Amparo')).toHaveTextContent('Actualizado 09/09/2026')
        })

        // CA-35.2, CA-35.3, CA-35.10
        it('al entrar a un fuero lista sus modelos por nombre, con sus datos', async () => {
            const { user } = renderPage()
            await openFuero(user, 'Penal')

            expect(await screen.findByText('6 modelos')).toBeInTheDocument()
            const names = screen.getAllByText(
                /^(Designación de abogado defensor|Ofrecimiento de prueba|Oposición al requerimiento de elevación a juicio|Pedido de sobreseimiento|Recurso de casación|Solicitud de eximición de prisión)$/,
            )
            expect(names.map((n) => n.textContent)).toEqual([
                'Designación de abogado defensor',
                'Ofrecimiento de prueba',
                'Oposición al requerimiento de elevación a juicio',
                'Pedido de sobreseimiento',
                'Recurso de casación',
                'Solicitud de eximición de prisión',
            ])
            const card = await templateCard('Oposición al requerimiento de elevación a juicio')
            expect(card).toHaveTextContent('oposicion-elevacion.docx')
            expect(card).toHaveTextContent('Última versión 21/08/2026')
            expect(card).toHaveTextContent('12 usos')
            expect(card).toHaveTextContent(new RegExp(personNameIn('Ríos', 'Malena')))
        })

        // CA-35.5
        it('un fuero sin modelos lo dice', async () => {
            for (const t of db.documentTemplates) if (t.jurisdictions.includes('AMPARO')) t.active = false
            const { user } = renderPage()
            await openFuero(user, 'Amparo')

            expect(await screen.findByText('Todavía no hay modelos en este fuero.')).toBeInTheDocument()
            expect(screen.getByText('0 modelos')).toBeInTheDocument()
        })

        // CA-35.6: se descarga a través de la API (V4 D-58).
        it('"Descargar" pide el archivo del modelo', async () => {
            const requested: string[] = []
            server.events.on('request:start', ({ request }) => {
                requested.push(new URL(request.url).pathname)
            })
            const { user } = renderPage()
            await openFuero(user, 'Penal')
            const card = await templateCard('Oposición al requerimiento de elevación a juicio')

            await user.click(within(card).getByRole('button', { name: 'Descargar' }))

            await waitFor(() => expect(requested.some((p) => p.endsWith('/document-templates/2/file'))).toBe(true))
            server.events.removeAllListeners()
        })

        // CA-35.6: si Drive no responde, se avisa.
        it('si Drive no responde al descargar, lo avisa', async () => {
            db.failures.documentStorage = true
            const { user } = renderPage()
            await openFuero(user, 'Penal')

            await user.click((await screen.findAllByRole('button', { name: 'Descargar' }))[0])

            expect(
                await screen.findByText('No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.'),
            ).toBeInTheDocument()
        })

        // TESTING.md §7
        it('si el listado no carga, muestra el error', async () => {
            // Un 403 y no un 500: los errores del servidor se reintentan
            // (`queryClient`) y el aviso tardaría más de lo que espera `findBy`.
            server.use(
                http.get('*/document-templates', () =>
                    HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
                ),
            )
            renderPage()

            expect(await screen.findByText('Rechazo de prueba.')).toBeInTheDocument()
        })
    })

    describe('alta (HU-34)', () => {
        // CA-34.1, CA-34.5, CA-34.6
        it('registra un modelo para un fuero y lo muestra en el listado', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            expect(
                within(dialog).getByRole('checkbox', { name: /^copiar en las causas nuevas/i }),
            ).toBeChecked()
            await fillCreate(user, dialog, 'Recurso de queja')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar modelo' }))

            expect(await screen.findByText('Modelo "Recurso de queja" registrado para el fuero Penal.')).toBeInTheDocument()
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(db.documentTemplates.find((t) => t.name === 'Recurso de queja')).toMatchObject({
                jurisdictions: ['CRIMINAL'],
                copyToNewCases: true,
                fileName: 'recurso-de-queja.docx',
            })
            await openFuero(user, 'Penal')
            expect(await screen.findByText('Recurso de queja')).toBeInTheDocument()
        })

        // CA-34.2: un único modelo para varios fueros.
        it('registra un modelo para dos fueros', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillCreate(user, dialog, 'Poder general')
            // "Fuero" es un desplegable de selección múltiple (prototipo): primero se abre.
            await user.click(within(dialog).getByRole('button', { name: /^fuero/i }))
            await user.click(within(dialog).getByRole('checkbox', { name: 'Amparo' }))
            await user.click(within(dialog).getByRole('button', { name: 'Registrar modelo' }))

            expect(await screen.findByText('Modelo "Poder general" registrado para los fueros Penal y Amparo.')).toBeInTheDocument()
            expect(db.documentTemplates.filter((t) => t.name === 'Poder general')).toHaveLength(1)
        })

        // CA-34.4
        it('enviado vacío marca los campos y no llama al servidor', async () => {
            const { user } = renderPage()
            const before = db.documentTemplates.length
            const dialog = await openCreate(user)

            await user.click(within(dialog).getByRole('button', { name: 'Registrar modelo' }))

            expect(within(dialog).getByText('El nombre del modelo es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('El archivo del modelo es obligatorio.')).toBeInTheDocument()
            expect(db.documentTemplates).toHaveLength(before)
        })

        // CA-34.9: el nombre repetido se marca en su campo.
        it('un nombre que ya existe se marca en el campo', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillCreate(user, dialog, 'recurso de casación')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar modelo' }))

            expect(await within(dialog).findByText('Ya existe un modelo formal con ese nombre.')).toBeInTheDocument()
            expect(within(dialog).getByLabelText(/^nombre del modelo/i).closest('.vz-field')).toHaveClass('vz-field--error')
        })

        // CA-34.7: si Drive falla no se registra nada.
        it('si Drive no responde, avisa y el modelo no se registra', async () => {
            db.failures.documentStorage = true
            const { user } = renderPage()
            const before = db.documentTemplates.length
            const dialog = await openCreate(user)

            await fillCreate(user, dialog, 'Recurso de queja')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar modelo' }))

            expect(
                await screen.findByText('No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.'),
            ).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
            expect(db.documentTemplates).toHaveLength(before)
        })
    })
})
