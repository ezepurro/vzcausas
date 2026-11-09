import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { db } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * La carpeta de la causa en Drive, desde el detalle (HU-39 y HU-40). Los
 * rótulos de cada estado son los de `CaseFolderStatus` (V4 §2, revisión del
 * 19/10/2026); el botón para crearla o reintentarla no está en el prototipo
 * (V4 §3.7, `POST /cases/{caseId}/folder`), así que se busca por lo que hace.
 *
 * | Causa | Carpeta |
 * | --- | --- |
 * | 1 | `CREATED`, con sus 6 modelos |
 * | 7 | `null`: registrada antes de V4 |
 * | 11 | `CREATING`: el almacenamiento todavía no respondió |
 * | 22 | `ERROR`: Drive falló al registrarla, con 2 modelos pendientes |
 * | 23 | `PENDING`: se registró sin pedirla |
 */

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
    })
}

const CREATE = /crear (la )?carpeta|reintentar/i
const OPEN = 'Abrir carpeta en Drive'
const headerOf = (name: string) => screen.findByRole('region', { name })

describe('CaseDetailPage · carpeta en Drive', () => {
    usePrototypeToday()

    // CA-39.14
    it('una causa con carpeta la abre en Drive, en otra pestaña', async () => {
        renderPage(1)
        await headerOf('Causa 13284571')

        const link = screen.getByRole('link', { name: OPEN })
        expect(link).toHaveAttribute('href', 'https://drive.google.com/drive/folders/vz-causa-1')
        expect(link).toHaveAttribute('target', '_blank')
        expect(screen.queryByRole('button', { name: CREATE })).not.toBeInTheDocument()
    })

    // CA-39.8 (D-110): un abogado que no es el responsable (la 23 la lleva `mferreyra`) no la crea.
    it('un abogado que no es el responsable ve "Crear carpeta" deshabilitado', async () => {
        renderPage(23, 'mrios')
        await headerOf('Causa sin SAC')

        const button = screen.getByRole('button', { name: CREATE })
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('title', expect.stringMatching(/^Solo el abogado responsable/))
    })

    // CA-39.8 (D-110): el responsable sí, aunque sólo sea abogado.
    it('el abogado responsable crea la carpeta de su causa', async () => {
        const { user } = renderPage(23, 'mferreyra')
        await headerOf('Causa sin SAC')

        await user.click(screen.getByRole('button', { name: CREATE }))

        expect(await screen.findByRole('link', { name: OPEN })).toBeInTheDocument()
    })

    // CA-39.5, CA-39.8: la Secretaría crea la carpeta de una causa que se registró sin ella.
    it('una carpeta pendiente se crea desde el detalle y queda para abrir', async () => {
        const { user } = renderPage(23)
        await headerOf('Causa sin SAC')
        expect(screen.getByText('Carpeta pendiente')).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: OPEN })).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: CREATE }))

        expect(await screen.findByRole('link', { name: OPEN })).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 23)?.folder?.status).toBe('CREATED')
    })

    // CA-39.5: también las causas registradas antes de esta versión.
    it('una causa sin carpeta, de antes de V4, también puede crearla', async () => {
        const { user } = renderPage(7)
        await headerOf('Causa 14118903')

        await user.click(screen.getByRole('button', { name: CREATE }))

        expect(await screen.findByRole('link', { name: OPEN })).toBeInTheDocument()
    })

    // CA-39.4, CA-39.5, CA-40.7: se reintenta, y se copian los modelos que faltaban.
    it('una carpeta con error se reintenta y copia los modelos pendientes', async () => {
        const { user } = renderPage(22)
        await headerOf('Causa 13619027')
        expect(screen.getByText('Error en la carpeta')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: CREATE }))

        expect(await screen.findByRole('link', { name: OPEN })).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 22)?.folder).toMatchObject({
            status: 'CREATED',
            templatesCopied: 2,
            templatesPending: 0,
        })
    })

    // CA-39.7: si Drive vuelve a fallar, se avisa y se puede reintentar más tarde.
    it('si Drive vuelve a fallar, avisa y deja reintentar', async () => {
        db.failures.documentStorage = true
        const { user } = renderPage(22)
        await headerOf('Causa 13619027')

        await user.click(screen.getByRole('button', { name: CREATE }))

        expect(
            await screen.findByText('No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.'),
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: CREATE })).toBeEnabled()
        expect(screen.queryByRole('link', { name: OPEN })).not.toBeInTheDocument()
    })

    // V4 §3.7: mientras se crea no hay nada que reintentar.
    it('una carpeta que se está creando lo dice y no ofrece reintentar', async () => {
        renderPage(11)
        await headerOf('Causa 14120566')

        expect(screen.getByText('Creando carpeta')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: CREATE })).not.toBeInTheDocument()
    })
})
