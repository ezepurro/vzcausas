import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { db } from '@/shared/mocks'
import { server } from '@/shared/mocks/server'
import { GenerateCaseFilePage } from '@/features/cases/pages/GenerateCaseFilePage'

/**
 * "Generar expediente" (HU-25), con la vista previa de la carátula (HU-24),
 * en `/causas/:caseId/expediente`. Los textos salen de la pantalla del
 * prototipo.
 *
 * | Causa | Para qué |
 * | --- | --- |
 * | 1 | Penal, cliente `DEFENSA`: pide "Querellante". Su carpeta tiene el expediente v1 (no se ofrece) y una hoja de cálculo de Google (no se puede convertir) |
 * | 2 | Administrativa: no pide parte |
 * | 20 | Penal, cliente `QUERELLANTE_PARTICULAR`: pide "Imputado" |
 * | 22 | Carpeta con `ERROR`: no se puede generar, pero la vista previa sí |
 *
 * El arrastre no se prueba acá: jsdom no calcula posiciones. El orden se
 * prueba con "↑" y "↓", que llaman al mismo `onMove`.
 *
 * @backend CA-24.2 CA-24.3 CA-24.4 CA-24.5 CA-24.6 CA-24.7 CA-24.8 CA-24.10 CA-24.11 CA-25.4 CA-25.11 CA-25.12
 * (la hoja la arma el servidor: plantilla, recuadros, partes, tratamiento y
 * nombre del archivo; también la conversión a PDF, que la causa no cambie y
 * el `404` de una causa dada de baja)
 */

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<GenerateCaseFilePage />, {
        as,
        path: '/causas/:caseId/expediente',
        route: `/causas/${caseId}/expediente`,
    })
}

const included = () => screen.findByRole('list', { name: 'Documentos incluidos' })
const notIncluded = () => screen.getByRole('list', { name: 'Documentos no incluidos' })
const generateButton = () => screen.getByRole('button', { name: 'Generar PDF' })
/** El último expediente que guardó el mock. */
const lastCaseFile = () => db.documents.filter((doc) => doc.caseFile).at(-1)?.caseFile

describe('GenerateCaseFilePage', () => {
    usePrototypeToday()

    // CA-25.3: un expediente anterior no se ofrece; uno que no se convierte, no se incluye.
    it('arranca con los documentos de la carpeta, sin el expediente anterior', async () => {
        renderPage(1)

        const list = await included()
        expect(within(list).getByText('Cédula de notificación.pdf')).toBeInTheDocument()
        expect(screen.queryByText('Expediente_13284571_v1.pdf')).not.toBeInTheDocument()

        const planilla = within(notIncluded()).getByText('Planilla de gastos').closest('li') as HTMLElement
        expect(planilla).toHaveTextContent('No se puede convertir a PDF')
        expect(within(planilla).getByRole('button', { name: 'Incluir Planilla de gastos' })).toBeDisabled()
    })

    // CA-25.1, CA-25.6, CA-25.9: la carátula primero y los documentos en el orden de la lista.
    it('genera el PDF con los documentos en el orden elegido', async () => {
        const { user } = renderPage(1)
        await included()

        await user.click(screen.getByRole('button', { name: 'Quitar todos' }))
        await user.click(screen.getByRole('button', { name: 'Incluir Cédula de notificación.pdf' }))
        await user.click(screen.getByRole('button', { name: 'Incluir Requerimiento de elevación a juicio.pdf' }))
        await user.click(screen.getByRole('button', { name: 'Subir Requerimiento de elevación a juicio.pdf' }))
        await user.click(generateButton())

        const dialog = await screen.findByRole('dialog', { name: 'Expediente generado' })
        expect(within(dialog).getByText('Expediente_13284571_v2.pdf')).toBeInTheDocument()
        expect(dialog).toHaveTextContent(/Versión 2 · 3 partes/)
        expect(lastCaseFile()?.parts).toEqual([
            'Carátula',
            'Requerimiento de elevación a juicio.pdf',
            'Cédula de notificación.pdf',
        ])
    })

    // CA-25.2: sin documentos no se puede generar.
    it('sin documentos elegidos, "Generar PDF" queda deshabilitado', async () => {
        const { user } = renderPage(1)
        await included()

        await user.click(screen.getByRole('button', { name: 'Quitar todos' }))

        expect(generateButton()).toBeDisabled()
        expect(screen.getAllByText('Elegí al menos un documento.').length).toBeGreaterThan(0)
        expect(screen.getByText('Agregá documentos desde la lista de abajo.')).toBeInTheDocument()
    })

    // CA-25.5: la parte penal y las observaciones viajan con el expediente.
    it('en el penal pide el querellante y lo manda con las observaciones', async () => {
        const { user } = renderPage(1)
        await included()

        await user.type(screen.getByLabelText('Querellante'), 'PERALTA Juan Carlos')
        await user.type(screen.getByLabelText('Observaciones'), 'Causa conexa en DI T6')
        await user.click(generateButton())

        await screen.findByRole('dialog', { name: 'Expediente generado' })
        expect(lastCaseFile()?.cover).toEqual({ opposingParty: 'PERALTA Juan Carlos', notes: 'Causa conexa en DI T6' })
    })

    // CA-25.5: con el cliente querellante, la parte que falta es el imputado.
    it('con el cliente querellante pide el imputado', async () => {
        renderPage(20)

        expect(await screen.findByLabelText('Imputado')).toBeInTheDocument()
        expect(screen.queryByLabelText('Querellante')).not.toBeInTheDocument()
    })

    // CA-25.5: fuera del penal no se pide la parte (mandarla daría 400).
    it('fuera del penal no pide la parte', async () => {
        renderPage(2)
        await included()

        expect(screen.getByLabelText('Observaciones')).toBeInTheDocument()
        expect(screen.queryByLabelText('Querellante')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Imputado')).not.toBeInTheDocument()
    })

    // CA-25.7: sin la carpeta creada no se puede guardar el expediente.
    it('sin carpeta creada no ofrece generar', async () => {
        renderPage(22)

        expect(await screen.findByText('La carpeta de la causa todavía no está creada en Drive.')).toBeInTheDocument()
        expect(generateButton()).toBeDisabled()
    })

    // CA-25.8: si Drive no responde, se avisa con el mensaje del servidor.
    it('si Drive falla al generar, lo avisa y la selección queda', async () => {
        const { user } = renderPage(1)
        await included()
        db.failures.documentStorage = true

        await user.click(generateButton())

        expect(
            await screen.findByText('No se pudo generar el expediente porque Drive no respondió. Intentá de nuevo en unos minutos.'),
        ).toBeInTheDocument()
        expect(screen.queryByRole('dialog', { name: 'Expediente generado' })).not.toBeInTheDocument()
        expect(within(await included()).getByText('Cédula de notificación.pdf')).toBeInTheDocument()
    })

    // Generar es sincrónico y puede tardar: lo que se mandó no cambia en pantalla y se explica la espera.
    it('mientras genera, bloquea los paneles y explica la espera', async () => {
        server.use(
            http.post('*/cases/:caseId/case-files', async () => {
                await delay('infinite')
            }),
        )
        const { user } = renderPage(1)
        const count = within(await included()).getAllByRole('listitem').length

        await user.click(generateButton())

        expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled()
        expect(
            screen.getByText(`Uniendo la carátula y ${count} documentos. Puede tardar un par de minutos.`),
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Quitar todos' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Quitar Cédula de notificación.pdf' })).toBeDisabled()
        expect(screen.getByLabelText('Observaciones')).toBeDisabled()
    })

    // Sin respuesta, el backend pudo haberlo guardado: no se invita a reintentar a ciegas.
    it('si no llega la respuesta, avisa que el expediente puede haberse generado', async () => {
        server.use(http.post('*/cases/:caseId/case-files', () => HttpResponse.error()))
        const { user } = renderPage(1)
        await included()

        await user.click(generateButton())

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'No llegó la respuesta del servidor, pero el expediente puede haberse generado igual. Antes de volver a generarlo, fijate en "Documentación" de la causa si ya está la versión nueva.',
        )
        expect(screen.queryByText('Error de red. Verificá tu conexión a internet.')).not.toBeInTheDocument()
        expect(screen.queryByRole('dialog', { name: 'Expediente generado' })).not.toBeInTheDocument()
        expect(generateButton()).toBeEnabled()
    })

    // Quien sale mientras se genera no ve el resultado y lo generaría de nuevo: se avisa antes.
    it('si se intenta salir mientras genera, avisa y "Quedarme" deja la pantalla como estaba', async () => {
        server.use(
            http.post('*/cases/:caseId/case-files', async () => {
                await delay('infinite')
            }),
        )
        const { user } = renderPage(1)
        await included()
        await user.click(generateButton())

        await user.click(screen.getByRole('button', { name: 'Causas' }))
        const dialog = screen.getByRole('dialog', { name: 'El expediente se está generando' })
        await user.click(within(dialog).getByRole('button', { name: 'Quedarme' }))

        expect(screen.queryByRole('dialog', { name: 'El expediente se está generando' })).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Generar expediente' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled()
    })

    it('"Salir igual" deja salir mientras genera', async () => {
        server.use(
            http.post('*/cases/:caseId/case-files', async () => {
                await delay('infinite')
            }),
        )
        const { user } = renderWithProviders(<GenerateCaseFilePage />, {
            as: 'gestion',
            path: '/causas/:caseId/expediente',
            route: '/causas/1/expediente',
            routes: [{ path: '/causas', element: <h1>Listado de causas</h1> }],
        })
        await included()
        await user.click(generateButton())

        await user.click(screen.getByRole('button', { name: 'Causas' }))
        await user.click(screen.getByRole('button', { name: 'Salir igual' }))

        expect(await screen.findByRole('heading', { name: 'Listado de causas' })).toBeInTheDocument()
    })

    // CA-25.10: el expediente lo descarga cualquiera, también el Administrador sin otro rol.
    it('el Administrador sin otro rol genera el expediente y lo descarga', async () => {
        const { user } = renderPage(1, 'supervision')
        await included()

        await user.click(generateButton())
        const dialog = await screen.findByRole('dialog', { name: 'Expediente generado' })
        await user.click(within(dialog).getByRole('button', { name: 'Descargar' }))

        expect(await within(dialog).findByRole('button', { name: '✓ Descargado' })).toBeInTheDocument()
    })

    // CA-24.1, CA-24.9: la vista previa es el PDF del servidor, aunque la causa no tenga carpeta.
    it('"Vista previa" muestra la carátula aunque la causa no tenga carpeta', async () => {
        const { user } = renderPage(22)

        await user.click(await screen.findByRole('button', { name: 'Vista previa' }))

        const preview = screen.getByRole('dialog', { name: 'Vista previa de la carátula · hoja 1 del expediente' })
        expect(await within(preview).findByTitle('Carátula de la causa en PDF')).toBeInTheDocument()
        await user.click(within(preview).getByRole('button', { name: 'Cerrar' }))
        expect(screen.queryByRole('dialog', { name: /Vista previa/ })).not.toBeInTheDocument()
    })

    // HU-19 desde esta pantalla: "Modificá los datos de la causa" abre el mismo diálogo, sin salir.
    it('"Modificá los datos de la causa" abre "Modificar causa" en la pantalla', async () => {
        const { user } = renderPage(1)
        await included()

        await user.click(screen.getByRole('button', { name: 'Modificá los datos de la causa' }))

        const dialog = screen.getByRole('dialog', { name: /Modificar causa/ })
        await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
        await waitFor(() => expect(screen.queryByRole('dialog', { name: /Modificar causa/ })).not.toBeInTheDocument())
        expect(screen.getByRole('heading', { name: 'Generar expediente' })).toBeInTheDocument()
    })

    // CA-19.16 (D-110): un abogado que no es el responsable genera el expediente, pero no modifica la causa.
    it('a un abogado que no es el responsable no le ofrece "Modificá los datos de la causa"', async () => {
        renderPage(4, 'mrios')
        await screen.findByRole('heading', { name: 'Generar expediente' })

        expect(screen.queryByRole('button', { name: 'Modificá los datos de la causa' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Vista previa' })).toBeInTheDocument()
    })
})
