import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { DocumentTemplatesPage } from '@/features/documents/pages/DocumentTemplatesPage'

/**
 * Dar de baja un modelo formal (HU-37), desde "Dar de baja" en cada tarjeta.
 * Los textos son los del diálogo del prototipo: "Dar de baja el modelo", el
 * nombre como subtítulo, la nota "Deja de copiarse en las causas nuevas. Las
 * copias ya distribuidas no se tocan." y el botón "Dar de baja"; el aviso,
 * "Modelo dado de baja.".
 *
 * No hay "Reactivar" ni se listan los dados de baja (D-126): el prototipo los
 * muestra, y manda la decisión del equipo. La baja no lleva motivo.
 *
 * Se trabaja sobre "Recurso de casación" (4), uno de los 6 modelos penales.
 *
 * @backend CA-37.4 CA-37.6
 * (el archivo a la `Papelera` de Drive y el `403`: la Secretaría no entra a
 * Modelos, y el `403` del servidor lo prueba `unit/contract/permissions.test.ts`)
 */

vi.setConfig({ testTimeout: 15_000 })

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const CASACION = 'Recurso de casación'

function renderPage(as = 'mrios') {
    return renderWithProviders(<DocumentTemplatesPage />, { as, path: '/modelos', route: '/modelos' })
}

type User = ReturnType<typeof renderPage>['user']

function containerOf(element: HTMLElement, matches: (el: HTMLElement) => boolean): HTMLElement {
    let el: HTMLElement | null = element
    while (el && !matches(el)) el = el.parentElement
    if (!el) throw new Error(`No se encontró el contenedor de "${element.textContent}".`)
    return el
}

async function fueroCard(name: string) {
    const title = await screen.findByText(name, { exact: true })
    return containerOf(title, (el) => el.textContent?.includes('Actualizado') ?? false)
}

async function templateCard(name: string) {
    const title = await screen.findByText(name, { exact: true, selector: 'h3' })
    return containerOf(title, (el) => within(el).queryByRole('button', { name: 'Descargar' }) !== null)
}

async function openDelete(user: User, name = CASACION) {
    await user.click(await fueroCard('Penal'))
    await user.click(within(await templateCard(name)).getByRole('button', { name: 'Dar de baja' }))
    return screen.getByRole('dialog', { name: /Dar de baja el modelo/ })
}

async function confirm(user: User, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))
}

const stored = (id: number) => db.documentTemplates.find((t) => t.id === id)

describe('DocumentTemplatesPage · dar de baja un modelo formal (HU-37)', () => {
    usePrototypeToday()

    /* Prototipo: el diálogo con el nombre y la nota. */
    it('abre "Dar de baja el modelo" con su nombre y qué pasa con las copias', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user)

        expect(within(dialog).getByText(CASACION)).toBeInTheDocument()
        expect(
            within(dialog).getByText('Deja de copiarse en las causas nuevas. Las copias ya distribuidas no se tocan.'),
        ).toBeInTheDocument()
    })

    /* CA-37.1 y CA-37.2 (D-126): sale del listado, no se borra, y no aparece
       como "Dado de baja" ni con "Reactivar". */
    it('da de baja el modelo, avisa y lo saca del fuero', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user)

        await confirm(user, dialog)

        expect(await screen.findByText('Modelo dado de baja.')).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        await waitFor(() => expect(screen.queryByText(CASACION, { selector: 'h3' })).not.toBeInTheDocument())
        expect(await screen.findByText('5 modelos')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument()
        expect(screen.queryByText('Dado de baja')).not.toBeInTheDocument()
        expect(stored(4)?.active).toBe(false)
    })

    /* CA-37.5 (D-139): su nombre queda libre para un modelo nuevo. */
    it('después de la baja se puede registrar otro modelo con el mismo nombre', async () => {
        const { user } = renderPage()
        await confirm(user, await openDelete(user))
        expect(await screen.findByText('Modelo dado de baja.')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Registrar modelo' }))
        const create = screen.getByRole('dialog', { name: /Registrar modelo formal/ })
        await user.type(within(create).getByLabelText(/^nombre del modelo/i), CASACION)
        await user.upload(
            within(create).getByLabelText(/^archivo del modelo/i),
            new File(['nuevo'], 'casacion-2026.docx', { type: DOCX }),
        )
        await user.click(within(create).getByRole('button', { name: 'Registrar modelo' }))

        expect(await screen.findByText(`Modelo "${CASACION}" registrado para el fuero Penal.`)).toBeInTheDocument()
        expect(db.documentTemplates.filter((t) => t.name === CASACION).map((t) => t.active)).toEqual([false, true])
    })

    /* CA-37.7: ya lo dieron de baja. El aviso es el del backend. */
    it('si el modelo ya no existe, avisa y lo saca de la lista', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user)

        const template = stored(4)
        if (template) template.active = false
        await confirm(user, dialog)

        expect(await screen.findByText('No se encontró el modelo formal solicitado.')).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByText(CASACION, { selector: 'h3' })).not.toBeInTheDocument())
    })

    /* TESTING.md §11, mínimo por feature: el error del servidor. */
    it('si el servidor falla, avisa y el modelo sigue en la lista', async () => {
        server.use(
            http.delete('*/document-templates/:templateId', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), { status: 500 }),
            ),
        )
        const { user } = renderPage()
        const dialog = await openDelete(user)

        await confirm(user, dialog)

        expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
        expect(await templateCard(CASACION)).toBeInTheDocument()
        expect(stored(4)?.active).toBe(true)
    })
})
