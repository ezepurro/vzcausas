import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { chooseOption } from '../../setup/searchSelect'
import { usePrototypeToday } from '../../setup/clock'
import { CASE_SEEDS, db } from '@/shared/mocks'
import { RegisterCasePage } from '@/features/cases/pages/RegisterCasePage'

/**
 * La carpeta en Drive (HU-39) y los modelos del fuero (HU-40) en el alta de
 * causa. Las casillas y sus textos son los de "Asignación y documentación"
 * del prototipo; las reglas, las de V4 §3.7 ("Carpeta de la causa", D-59 a
 * D-61).
 *
 * El penal tiene 6 modelos que se copian a las causas nuevas. Lo que se probó
 * del alta en sí está en `RegisterCasePage.test.tsx`.
 */

const CAPTION = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado'
const CREATE_FOLDER = /^crear la carpeta de la causa en drive/i
const COPY_TEMPLATES = /^copiar los modelos de escritos del fuero a esa carpeta/i

function renderPage(as = 'mrios') {
    return renderWithProviders(<RegisterCasePage />, {
        as,
        path: '/causas/nueva',
        route: '/causas/nueva',
        routes: [{ path: '/causas/:caseId', element: <p>Detalle de la causa</p> }],
    })
}

type User = ReturnType<typeof renderPage>['user']

/** Una causa penal mínima de la abogada Ríos, sin SAC (CA-18.5). */
async function fillMinimum(user: User) {
    await screen.findByRole('option', { name: /^Ríos, Malena/ })
    await chooseOption(user, screen.getByLabelText(/^Cliente/), 'GÓMEZ, Ariel Fernando · DNI 34.812.905')
    await user.selectOptions(screen.getByLabelText(/^Abogado responsable/), '3')
    await user.type(screen.getByLabelText(/^Carátula/), CAPTION)
}

const submit = (user: User) => user.click(screen.getByRole('button', { name: 'Registrar causa' }))
const created = () => db.cases.find((c) => c.id > CASE_SEEDS.length)

describe('RegisterCasePage · carpeta y modelos', () => {
    usePrototypeToday()

    // CA-39.1, CA-40.1, CA-40.2, CA-40.10
    it('las dos casillas vienen tildadas y el alta crea la carpeta con los modelos del fuero', async () => {
        const { user } = renderPage()
        await fillMinimum(user)

        expect(screen.getByRole('checkbox', { name: CREATE_FOLDER })).toBeChecked()
        expect(screen.getByRole('checkbox', { name: COPY_TEMPLATES })).toBeChecked()
        expect(await screen.findByText('6 modelos parametrizados para el fuero Penal.')).toBeInTheDocument()

        await submit(user)

        expect(
            await screen.findByText(
                'Causa registrada. El estado lo fija el primer acto procesal · carpeta creada en Drive con 6 modelos.',
            ),
        ).toBeInTheDocument()
        expect(created()?.folder).toMatchObject({ status: 'CREATED', templatesCopied: 6 })
    })

    // CA-39.2, CA-39.3: la ubicación es la del abogado responsable, el fuero y la
    // carátula, dentro de la carpeta raíz de causas (V5 §4).
    it('el resumen muestra dónde va a quedar la carpeta', async () => {
        const { user } = renderPage()
        await fillMinimum(user)

        expect(screen.getByText(`/VZ Causas/Causas/Ríos, Malena/Penal/${CAPTION}`)).toBeInTheDocument()
    })

    // CA-39.3, CA-40.3
    it('sin la carpeta tampoco se copian los modelos, y la causa se registra sin carpeta', async () => {
        const { user } = renderPage()
        await fillMinimum(user)

        await user.click(screen.getByRole('checkbox', { name: CREATE_FOLDER }))

        const copy = screen.getByRole('checkbox', { name: COPY_TEMPLATES })
        expect(copy).not.toBeChecked()
        expect(copy).toBeDisabled()
        expect(
            screen.getByText('Primero hay que crear la carpeta en Drive para poder copiar los modelos.'),
        ).toBeInTheDocument()
        expect(screen.getByText('No se creará carpeta')).toBeInTheDocument()

        await submit(user)

        expect(
            await screen.findByText('Causa registrada. El estado lo fija el primer acto procesal.'),
        ).toBeInTheDocument()
        // La carpeta queda pendiente: se puede crear después (V4 §2, CaseFolderStatus).
        expect(created()?.folder).toMatchObject({ status: 'PENDING', templatesCopied: 0 })
    })

    // CA-40.4
    it('sin copiar los modelos la carpeta se crea vacía', async () => {
        const { user } = renderPage()
        await fillMinimum(user)

        await user.click(screen.getByRole('checkbox', { name: COPY_TEMPLATES }))
        await submit(user)

        expect(
            await screen.findByText(
                'Causa registrada. El estado lo fija el primer acto procesal · carpeta creada en Drive.',
            ),
        ).toBeInTheDocument()
        expect(created()?.folder).toMatchObject({ status: 'CREATED', templatesCopied: 0 })
    })

    /* CA-39.4: si Drive falla, la causa no se pierde. El contrato no escribe el
       aviso; decisión del 19/10/2026: avisar que la carpeta no se creó, para
       que se sepa que hay que crearla desde el detalle. El texto exacto lo
       elige la pantalla. */
    it('si Drive no responde, la causa se registra igual y avisa que la carpeta no se creó', async () => {
        db.failures.documentStorage = true
        const { user } = renderPage()
        await fillMinimum(user)

        await submit(user)

        expect(await screen.findByText(/no se (pudo crear|creó) la carpeta/i)).toBeInTheDocument()
        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
        expect(created()?.folder).toMatchObject({ status: 'ERROR', templatesPending: 6 })
    })

    // CA-39.8, CA-40.10: la Secretaría también crea la carpeta, pero no consulta modelos.
    it('la secretaría registra con carpeta, sin ver cuántos modelos se copian', async () => {
        const { user } = renderPage('gestion')
        await fillMinimum(user)

        expect(screen.getByRole('checkbox', { name: CREATE_FOLDER })).toBeChecked()
        expect(screen.queryByText(/modelos parametrizados para el fuero/)).not.toBeInTheDocument()

        await submit(user)

        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
        expect(created()?.folder).toMatchObject({ status: 'CREATED' })
    })
})
