import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { db } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * La tarjeta "Documentación" del detalle (HU-38), que lee la carpeta de la
 * causa en Drive (`GET /cases/{caseId}/documents`). Cada documento es un
 * `listitem` con su nombre y un enlace "Abrir", que abre Drive, como en el
 * prototipo. La descarga por la API es la del expediente (HU-25).
 *
 * | Causa | Carpeta |
 * | --- | --- |
 * | 1 | `CREATED`: 6 modelos penales y 6 archivos más, entre ellos el expediente v1 |
 * | 23 | `PENDING`: no hay nada que leer |
 *
 * @backend CA-38.2 CA-38.3 CA-38.7 CA-38.8 CA-38.9
 * (la lectura en cada pedido, qué archivos entran y en qué orden, los permisos
 * de la descarga por la API y los `404` los resuelve el servidor; la tarjeta
 * sólo tiene "Abrir", decisión del 28/10/2026 en TESTING.md §11)
 */

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
})
