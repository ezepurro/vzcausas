import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { delay, http } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { db } from '@/shared/mocks'
import { server } from '@/shared/mocks/server'
import { saveFile } from '@/shared/lib/saveFile'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * La tarjeta "Documentación" del detalle (HU-38), que lee la carpeta de la
 * causa en Drive (`GET /cases/{caseId}/documents`). Cada documento es un
 * `listitem` con su nombre, un enlace "Abrir", que abre Drive, como en el
 * prototipo, y un botón "Descargar", que lo baja por la API
 * (`GET /cases/{caseId}/documents/{documentId}/file`, V5 §3.12).
 *
 * "Descargar" se aparta del prototipo, que sólo tiene "Abrir": lo decidió el
 * equipo para no obligar a pasar por Drive. Quién lo usa sigue la regla de la
 * API (D-103): `LAWYER` o `SECRETARY`, todos los documentos; el Administrador
 * sin otro rol, sólo los expedientes, porque la carpeta de Drive no está
 * compartida con él (D-83). En los demás lo ve deshabilitado.
 *
 * | Causa | Carpeta |
 * | --- | --- |
 * | 1 | `CREATED`: 6 modelos penales y 6 archivos más, entre ellos el expediente v1 y "Notas de la indagatoria", un documento de Google |
 * | 23 | `PENDING`: no hay nada que leer |
 *
 * | Usuario | Perfil |
 * | --- | --- |
 * | `mrios` | Abogado |
 * | `gestion` | Secretaría |
 * | `supervision` | Administrador sin otro rol |
 *
 * @backend CA-38.2 CA-38.3 CA-38.7 CA-38.8 CA-38.9
 * (la lectura en cada pedido, qué archivos entran y en qué orden, el `403` de
 * la descarga, la conversión a PDF de los documentos de Google y los `404` los
 * resuelve el servidor; acá se prueba qué filas ofrecen "Descargar", qué se
 * pide y con qué nombre se guarda)
 */

// En jsdom `saveFile` no guarda nada (no hay `createObjectURL`): se espía para
// saber con qué nombre se habría guardado.
vi.mock('@/shared/lib/saveFile', () => ({ saveFile: vi.fn() }))

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
    })
}

/** La tarjeta, buscada por su título como los demás paneles del detalle. */
async function documentsCard() {
    const title = await screen.findByText('Documentación', { selector: '.vz-panel__title' })
    return title.closest('.vz-panel') as HTMLElement
}

/** La fila de un documento, cuando la lista ya llegó. */
async function documentRow(card: HTMLElement, name: string) {
    return (await within(card).findByText(name)).closest('li') as HTMLElement
}

/** Los pedidos de descarga que salieron, con su `disposition`. */
function recordDownloads() {
    const downloads: { path: string; disposition: string | null }[] = []
    server.events.on('request:start', ({ request }) => {
        const url = new URL(request.url)
        if (url.pathname.endsWith('/file')) {
            downloads.push({ path: url.pathname, disposition: url.searchParams.get('disposition') })
        }
    })
    return downloads
}

describe('CaseDetailPage · documentación', () => {
    usePrototypeToday()

    // CA-38.1, CA-38.4
    it('lista los archivos de la carpeta, con quién los subió', async () => {
        renderPage(1)
        const card = await documentsCard()

        expect(await within(card).findByText('12 archivos')).toBeInTheDocument()
        const item = within(card).getByText('Cédula de notificación.pdf').closest('li') as HTMLElement
        expect(item).toHaveTextContent('Gestión Estudio')
        expect(within(card).getByText('Expediente_13284571_v1.pdf')).toBeInTheDocument()
    })

    // CA-38.1 (D-103): el Administrador sin otro rol también la ve.
    it('el Administrador sin otro rol también ve la lista', async () => {
        renderPage(1, 'supervision')
        const card = await documentsCard()

        expect(await within(card).findByText('Cédula de notificación.pdf')).toBeInTheDocument()
    })

    // CA-38.4: "Abrir" lleva al archivo en Drive, en otra pestaña.
    it('"Abrir" abre el documento en Drive', async () => {
        renderPage(1)
        const card = await documentsCard()

        const item = (await within(card).findByText('Cédula de notificación.pdf')).closest('li') as HTMLElement
        const link = within(item).getByRole('link', { name: 'Abrir' })
        expect(link).toHaveAttribute('href', expect.stringContaining('https://drive.google.com/file/d/'))
        expect(link).toHaveAttribute('target', '_blank')
    })

    // CA-38.5: sin carpeta creada no hay documentos que leer.
    it('una causa con la carpeta pendiente no lista documentos', async () => {
        renderPage(23)
        const card = await documentsCard()

        expect(within(card).queryAllByRole('listitem')).toHaveLength(0)
        expect(within(card).queryByRole('link', { name: 'Abrir' })).not.toBeInTheDocument()
    })

    // CA-38.6: con Drive caído se muestra el mensaje del contrato.
    it('si Drive no responde, lo avisa en la tarjeta', async () => {
        db.failures.documentStorage = true
        renderPage(1)
        const card = await documentsCard()

        expect(
            await within(card).findByText('No se pudo leer la carpeta de la causa en Drive. Intentá de nuevo en unos minutos.'),
        ).toBeInTheDocument()
    })

    describe('descarga (CA-38.7)', () => {
        // Abogado y Secretaría descargan cualquier documento (D-103).
        it.each([
            ['el abogado', 'mrios'],
            ['la secretaría', 'gestion'],
        ])('%s ve "Descargar" en todos los documentos', async (_who, as) => {
            renderPage(1, as)
            const card = await documentsCard()
            await within(card).findByText('12 archivos')

            const rows = within(card).getAllByRole('listitem')
            for (const row of rows) {
                expect(within(row).getByRole('button', { name: 'Descargar' })).toBeEnabled()
            }
        })

        it('"Descargar" pide el archivo por la API como adjunto y lo guarda con su nombre', async () => {
            const downloads = recordDownloads()
            const { user } = renderPage(1, 'mrios')
            const card = await documentsCard()
            const row = await documentRow(card, 'Cédula de notificación.pdf')

            await user.click(within(row).getByRole('button', { name: 'Descargar' }))

            await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1))
            expect(saveFile).toHaveBeenCalledWith(expect.any(Blob), 'Cédula de notificación.pdf')
            expect(downloads).toHaveLength(1)
            expect(downloads[0].path).toMatch(/\/cases\/1\/documents\/[^/]+\/file$/)
            expect(downloads[0].disposition).toBe('attachment')
            server.events.removeAllListeners()
        })

        // V5 `:7595`: un documento de Google sale exportado a PDF, así que se guarda con ".pdf".
        it('un documento de Google se guarda con ".pdf"', async () => {
            const { user } = renderPage(1, 'gestion')
            const card = await documentsCard()
            const row = await documentRow(card, 'Notas de la indagatoria')

            await user.click(within(row).getByRole('button', { name: 'Descargar' }))

            await waitFor(() => expect(saveFile).toHaveBeenCalledWith(expect.any(Blob), 'Notas de la indagatoria.pdf'))
        })

        // D-103, D-83: sin acceso a la carpeta en Drive, el Administrador sólo baja los expedientes.
        // En lo demás el botón va deshabilitado, no escondido (frontend/CLAUDE.md, "Acceso por perfil").
        it('el Administrador sin otro rol sólo descarga el expediente', async () => {
            const { user } = renderPage(1, 'supervision')
            const card = await documentsCard()

            const cedula = await documentRow(card, 'Cédula de notificación.pdf')
            expect(within(cedula).getByRole('button', { name: 'Descargar' })).toBeDisabled()

            const expediente = await documentRow(card, 'Expediente_13284571_v1.pdf')
            await user.click(within(expediente).getByRole('button', { name: 'Descargar' }))

            await waitFor(() => expect(saveFile).toHaveBeenCalledWith(expect.any(Blob), 'Expediente_13284571_v1.pdf'))
        })

        // Mientras baja, sólo esa fila queda ocupada; el resto se puede seguir usando.
        it('mientras descarga, sólo el botón de esa fila queda ocupado', async () => {
            server.use(
                http.get('*/cases/:caseId/documents/:documentId/file', async () => {
                    await delay('infinite')
                }),
            )
            const { user } = renderPage(1, 'mrios')
            const card = await documentsCard()
            const cedula = await documentRow(card, 'Cédula de notificación.pdf')
            const expediente = await documentRow(card, 'Expediente_13284571_v1.pdf')

            await user.click(within(cedula).getByRole('button', { name: 'Descargar' }))

            // El texto del botón ocupado lo define el diseño: se busca el único botón de la fila.
            await waitFor(() => expect(within(cedula).getByRole('button')).toBeDisabled())
            expect(within(expediente).getByRole('button', { name: 'Descargar' })).toBeEnabled()
        })

        // CA-38.6: con Drive caído al descargar, el mensaje de descarga del contrato (V5 `:7649`).
        it('si Drive no responde al descargar, lo avisa y la lista queda', async () => {
            const { user } = renderPage(1, 'mrios')
            const card = await documentsCard()
            const row = await documentRow(card, 'Cédula de notificación.pdf')
            db.failures.documentStorage = true

            await user.click(within(row).getByRole('button', { name: 'Descargar' }))

            expect(
                await screen.findByText('No se pudo descargar el documento de Drive. Intentá de nuevo en unos minutos.'),
            ).toBeInTheDocument()
            expect(saveFile).not.toHaveBeenCalled()
            expect(within(card).getByText('Cédula de notificación.pdf')).toBeInTheDocument()
        })
    })
})
