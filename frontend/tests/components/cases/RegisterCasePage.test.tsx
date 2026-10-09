import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { CASE_SEEDS, db, errorBody, resetMockDb } from '@/shared/mocks'
import { RegisterCasePage } from '@/features/cases/pages/RegisterCasePage'

/**
 * Registrar causa (HU-18), en `/causas/nueva`. Cada test dice qué criterio de
 * aceptación cubre.
 *
 * El alta la hace cualquier perfil (RN11, V3 §3.7): los tests entran como
 * `gestion` salvo donde importa el perfil.
 *
 * Los datos son los del mock: 23 clientes vigentes, 10 abogados y 8
 * calificaciones vigentes. El reloj queda fijo en el día del prototipo, porque
 * la fecha de inicio y la fecha del hecho se comparan contra hoy.
 */

const TODAY = '2026-09-15'

/** El cliente 1 y la abogada 3 de los fixtures. */
const CLIENT_GOMEZ = '1'
const LAWYER_RIOS = '3'
/** Robo calificado, 96 meses. */
const ROBBERY = '1'

/** El aviso del alta, como lo escribe el prototipo. */
const WITH_SAC_TOAST = 'Causa 14200315 registrada. El estado lo fija el primer acto procesal.'
const NO_SAC_TOAST = 'Causa registrada. El estado lo fija el primer acto procesal.'

function renderPage(as = 'gestion') {
    return renderWithProviders(<RegisterCasePage />, {
        as,
        path: '/causas/nueva',
        route: '/causas/nueva',
        routes: [
            { path: '/causas', element: <p>Listado de causas</p> },
            { path: '/causas/:caseId', element: <p>Detalle de la causa</p> },
        ],
    })
}

type User = ReturnType<typeof renderPage>['user']

/** Espera a que lleguen los clientes: hasta entonces el select está vacío. */
async function waitForOptions() {
    await screen.findByRole('option', { name: 'GÓMEZ, Ariel Fernando · DNI 34.812.905' })
}

/** Lo mínimo que una causa penal necesita, sin calificaciones (CA-18.5). */
async function fillMinimum(user: User, caption = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado') {
    await waitForOptions()
    await user.selectOptions(screen.getByLabelText(/^Cliente/), CLIENT_GOMEZ)
    await user.selectOptions(screen.getByLabelText(/^Abogado responsable/), LAWYER_RIOS)
    await user.type(screen.getByLabelText(/^Carátula/), caption)
}

/** El SAC y, como lo exige (CA-18.2), la fecha de inicio. */
async function fillSac(user: User, sacNumber: string, startDate = '2021-03-12') {
    await user.type(screen.getByLabelText(/^N° de SAC/), sacNumber)
    await user.type(screen.getByLabelText(/^Fecha de inicio/), startDate)
}

const submit = (user: User) => user.click(screen.getByRole('button', { name: 'Registrar causa' }))

/** La causa que el alta agregó a la base del mock. */
const created = () => db.cases.find((c) => c.id > CASE_SEEDS.length)

describe('RegisterCasePage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
        resetMockDb()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('muestra las migas, el título y el resumen del alta', async () => {
        renderPage()
        await waitForOptions()

        expect(screen.getByRole('heading', { name: 'Registrar causa', level: 1 })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Causas' })).toBeInTheDocument()
        // El título de un `Panel` no es un heading: lo dibuja como un `div`.
        expect(screen.getByText('Resumen del alta', { selector: '.vz-panel__title' })).toBeInTheDocument()
    })

    describe('alta exitosa (CA-18.1)', () => {
        it('registra una causa penal con su calificación y lleva a su detalle', async () => {
            const { user } = renderPage()
            await fillMinimum(user)

            await fillSac(user, '14200315')
            await user.selectOptions(screen.getByLabelText(/^Calificaciones legales/), ROBBERY)
            const offenseDate = screen.getByLabelText(/^Fecha del hecho de Robo calificado/)
            await user.clear(offenseDate)
            await user.type(offenseDate, '2021-02-27')

            await submit(user)

            // El aviso, y la navegación al detalle de la causa recién creada.
            expect(await screen.findByText(WITH_SAC_TOAST)).toBeInTheDocument()
            expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()

            expect(created()).toMatchObject({
                sacNumber: '14200315',
                jurisdiction: 'CRIMINAL',
                caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
                clientId: 1,
                proceduralRole: 'DEFENSA',
                responsibleLawyerId: 3,
                qualifications: [{ legalQualificationId: 1, offenseDate: '2021-02-27' }],
                startDate: '2021-03-12',
            })
        })

        /* CA-18.1 y CA-18.4 */
        it('registra un amparo con su contraparte y su objeto', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.selectOptions(screen.getByLabelText(/^Fuero/), 'AMPARO')
            await user.selectOptions(screen.getByLabelText(/^Cliente/), '6')
            await user.selectOptions(screen.getByLabelText(/^Abogado responsable/), '1')
            await user.type(screen.getByLabelText(/^Carátula/), 'MOYANO, Daniela c/ APROSS — Amparo')
            await user.type(screen.getByLabelText(/^Contraparte u organismo/), 'APROSS')
            await user.type(screen.getByLabelText(/^Objeto del amparo/), 'Se ordene la cobertura integral del tratamiento.')

            await submit(user)

            expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
            expect(created()).toMatchObject({
                jurisdiction: 'AMPARO',
                proceduralRole: 'ACTORA',
                counterparty: 'APROSS',
                subjectMatter: 'Se ordene la cobertura integral del tratamiento.',
                qualifications: [],
            })
        })

        /* CA-18.1: el alta la hace cualquier perfil (RN11). */
        it.each([
            ['el administrador', 'fvazquez'],
            ['un abogado', 'mrios'],
            ['la Secretaría', 'gestion'],
        ])('%s puede registrar una causa', async (_, username) => {
            const { user } = renderPage(username)
            await fillMinimum(user)

            await submit(user)

            expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
        })
    })

    describe('número de SAC (CA-18.2)', () => {
        it('sin SAC el alta procede igual', async () => {
            const { user } = renderPage()
            await fillMinimum(user)

            await submit(user)

            expect(await screen.findByText(NO_SAC_TOAST)).toBeInTheDocument()
            expect(created()?.sacNumber).toBeNull()
        })

        it('un SAC que no tiene 8 dígitos se marca antes de mandar', async () => {
            const { user } = renderPage()
            await fillMinimum(user)
            await user.type(screen.getByLabelText(/^N° de SAC/), '132')

            await submit(user)

            expect(screen.getByText('El SAC tiene 8 dígitos.')).toBeInTheDocument()
            expect(created()).toBeUndefined()
        })

        /* CA-18.2: el SAC es único en todo el sistema (RN2). Es un 409, pero el
           problema es de un campo: se muestra en el campo. */
        it('un SAC ya registrado se marca en su campo y no pierde lo cargado', async () => {
            const { user } = renderPage()
            await fillMinimum(user)
            await fillSac(user, '13284571')

            await submit(user)

            expect(
                await screen.findByText('Ya existe una causa registrada con ese número de SAC.'),
            ).toBeInTheDocument()
            expect(screen.getByLabelText(/^N° de SAC/).closest('.vz-field')).toHaveClass('vz-field--error')
            expect(screen.getByLabelText(/^Carátula/)).toHaveValue('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')
            expect(created()).toBeUndefined()
        })
    })

    describe('rol procesal según el fuero (CA-18.3)', () => {
        it.each([
            ['CRIMINAL', ['Defensa', 'Querellante particular']],
            ['ADMINISTRATIVE', ['Defensa', 'Recurrente']],
            ['AMPARO', ['Actora', 'Demandada']],
        ] as const)('en %s sólo ofrece los roles que corresponden', async (jurisdiction, roles) => {
            const { user } = renderPage()
            await waitForOptions()

            await user.selectOptions(screen.getByLabelText(/^Fuero/), jurisdiction)

            expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(roles)
        })

        it('al cambiar el fuero, el rol vuelve al primero válido', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.click(screen.getByRole('radio', { name: 'Querellante particular' }))
            await user.selectOptions(screen.getByLabelText(/^Fuero/), 'AMPARO')

            expect(screen.getByRole('radio', { name: 'Actora' })).toBeChecked()
        })
    })

    describe('campos propios del fuero (CA-18.4)', () => {
        it('al pasar al amparo aparecen la contraparte y el objeto, y se van las calificaciones', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.selectOptions(screen.getByLabelText(/^Fuero/), 'AMPARO')

            expect(screen.getByLabelText(/^Contraparte u organismo/)).toBeInTheDocument()
            expect(screen.getByLabelText(/^Objeto del amparo/)).toBeInTheDocument()
            expect(screen.queryByLabelText(/^Calificaciones legales/)).not.toBeInTheDocument()
        })

        it('el objeto es obligatorio fuera del penal', async () => {
            const { user } = renderPage()
            await waitForOptions()
            await user.selectOptions(screen.getByLabelText(/^Fuero/), 'ADMINISTRATIVE')
            await user.selectOptions(screen.getByLabelText(/^Cliente/), CLIENT_GOMEZ)
            await user.selectOptions(screen.getByLabelText(/^Abogado responsable/), LAWYER_RIOS)
            await user.type(screen.getByLabelText(/^Carátula/), 'GÓMEZ — Sumario administrativo')

            await submit(user)

            expect(screen.getByText('El objeto del reclamo es obligatorio.')).toBeInTheDocument()
            expect(created()).toBeUndefined()
        })
    })

    describe('calificaciones legales (CA-18.5)', () => {
        it('una causa penal se registra sin ninguna calificación', async () => {
            const { user } = renderPage()
            await fillMinimum(user)

            await submit(user)

            expect(await screen.findByText(NO_SAC_TOAST)).toBeInTheDocument()
            expect(created()?.qualifications).toEqual([])
        })

        it('cada calificación elegida pide su fecha del hecho', async () => {
            const { user } = renderPage()
            await fillMinimum(user)

            await user.selectOptions(screen.getByLabelText(/^Calificaciones legales/), ROBBERY)
            await submit(user)

            expect(screen.getByText('Cargá la fecha del hecho.')).toBeInTheDocument()
            expect(created()).toBeUndefined()
        })

        it('la fecha del hecho no puede ser posterior a hoy', async () => {
            const { user } = renderPage()
            await fillMinimum(user)
            await user.selectOptions(screen.getByLabelText(/^Calificaciones legales/), ROBBERY)

            const offenseDate = screen.getByLabelText(/^Fecha del hecho de Robo calificado/)
            expect(offenseDate).toHaveAttribute('max', TODAY)
            await user.clear(offenseDate)
            await user.type(offenseDate, '2026-09-16')
            await submit(user)

            expect(screen.getByText('No puede ser posterior a hoy.')).toBeInTheDocument()
        })

        /* CA-18.5: no puede repetirse dentro de la causa — la que ya está
           elegida deja de ofrecerse. */
        it('una calificación ya elegida no se puede volver a agregar', async () => {
            const { user } = renderPage()
            await waitForOptions()
            const picker = screen.getByLabelText(/^Calificaciones legales/)

            expect(within(picker).getByRole('option', { name: /^Robo calificado/ })).toBeInTheDocument()
            await user.selectOptions(picker, ROBBERY)

            expect(within(picker).queryByRole('option', { name: /^Robo calificado/ })).not.toBeInTheDocument()
        })

        it('quitar una calificación la saca con su fecha', async () => {
            const { user } = renderPage()
            await waitForOptions()
            await user.selectOptions(screen.getByLabelText(/^Calificaciones legales/), ROBBERY)

            await user.click(screen.getByRole('button', { name: /^Quitar Robo calificado/ }))

            expect(screen.queryByLabelText(/^Fecha del hecho de Robo calificado/)).not.toBeInTheDocument()
        })
    })

    /* CA-18.6: el resumen muestra el vencimiento como la fecha del hecho más
       los meses de la calificación. La fecha de inicio no interviene. */
    describe('cómputo de la prescripción (CA-18.6)', () => {
        it('el resumen estima el vencimiento desde la fecha del hecho', async () => {
            const { user } = renderPage()
            await waitForOptions()
            await user.selectOptions(screen.getByLabelText(/^Calificaciones legales/), ROBBERY)

            const offenseDate = screen.getByLabelText(/^Fecha del hecho de Robo calificado/)
            await user.clear(offenseDate)
            await user.type(offenseDate, '2021-02-27')

            const row = screen.getByText('Robo calificado').closest('.vz-details__row') as HTMLElement
            expect(row).toHaveTextContent('8 años desde el 27/02/2021')
            expect(row).toHaveTextContent('27/02/2029')
        })

        it('cambiar la fecha de inicio no mueve el vencimiento de la prescripción', async () => {
            const { user } = renderPage()
            await waitForOptions()
            await user.selectOptions(screen.getByLabelText(/^Calificaciones legales/), ROBBERY)
            const offenseDate = screen.getByLabelText(/^Fecha del hecho de Robo calificado/)
            await user.clear(offenseDate)
            await user.type(offenseDate, '2021-02-27')

            await fillSac(user, '14200315', '2024-06-01')

            expect(screen.getByText('Robo calificado').closest('.vz-details__row')).toHaveTextContent('27/02/2029')
        })

        it('fuera del penal la prescripción no aplica', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.selectOptions(screen.getByLabelText(/^Fuero/), 'AMPARO')

            expect(screen.getByText('Prescripción').closest('.vz-details__row')).toHaveTextContent(
                'No aplica al fuero Amparo',
            )
        })
    })

    /* CA-18.7 */
    it('el resumen avisa que la causa nace en "Iniciada" (CA-18.7)', async () => {
        renderPage()
        await waitForOptions()

        const row = screen.getByText('Estado inicial').closest('.vz-details__row') as HTMLElement
        expect(row).toHaveTextContent('Iniciada')
        expect(row).toHaveTextContent('El estado lo fija el primer acto procesal')
    })

    /* CA-18.1 y CA-18.8 */
    it('enviado vacío marca los obligatorios y no llama al servidor (CA-18.8)', async () => {
        const { user } = renderPage()
        await waitForOptions()

        await submit(user)

        expect(screen.getByText('La carátula es obligatoria.')).toBeInTheDocument()
        expect(screen.getByText('Elegí el cliente de la causa.')).toBeInTheDocument()
        expect(screen.getByText('Elegí el abogado responsable.')).toBeInTheDocument()
        expect(created()).toBeUndefined()
    })

    /* CA-18.2: la fecha de inicio va con el SAC. */
    describe('fecha de inicio (CA-18.2)', () => {
        it('sin SAC está deshabilitada y vacía', async () => {
            renderPage()
            await waitForOptions()

            const startDate = screen.getByLabelText(/^Fecha de inicio/)
            expect(startDate).toBeDisabled()
            expect(startDate).toHaveValue('')
        })

        it('sin SAC el alta no la manda', async () => {
            // Se mira lo que sale sin reemplazar al mock: el alta tiene que terminar bien.
            const requests: Record<string, unknown>[] = []
            const capture = async ({ request }: { request: Request }) => {
                if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/cases')) {
                    requests.push(await request.clone().json())
                }
            }
            server.events.on('request:start', capture)
            try {
                const { user } = renderPage()
                await fillMinimum(user)

                await submit(user)

                expect(await screen.findByText(NO_SAC_TOAST)).toBeInTheDocument()
                expect(requests).toHaveLength(1)
                expect(requests[0]).not.toHaveProperty('startDate')
            } finally {
                server.events.removeListener('request:start', capture)
            }
        })

        it('con SAC es obligatoria, y el resumen lo pide', async () => {
            const { user } = renderPage()
            await fillMinimum(user)
            await user.type(screen.getByLabelText(/^N° de SAC/), '14200315')

            expect(screen.getByLabelText(/^Fecha de inicio/)).toBeEnabled()
            expect(screen.getByText('Fecha de inicio cargada')).toBeInTheDocument()

            await submit(user)

            expect(screen.getByText('Cargá la fecha de inicio: es obligatoria con N° de SAC.')).toBeInTheDocument()
            expect(created()).toBeUndefined()
        })

        it('borrar el SAC se lleva la fecha cargada', async () => {
            const { user } = renderPage()
            await waitForOptions()
            await fillSac(user, '14200315')

            await user.clear(screen.getByLabelText(/^N° de SAC/))

            const startDate = screen.getByLabelText(/^Fecha de inicio/)
            expect(startDate).toBeDisabled()
            expect(startDate).toHaveValue('')
        })

        it('no puede ser posterior a hoy', async () => {
            const { user } = renderPage()
            await fillMinimum(user)
            await fillSac(user, '14200315', '2026-09-16')

            await submit(user)

            expect(screen.getByText('La fecha de inicio no puede ser posterior a hoy.')).toBeInTheDocument()
            expect(created()).toBeUndefined()
        })
    })

    /* CA-18.10: un cliente, un abogado o una calificación inexistente o dado de
       baja se informa sobre el campo del formulario. Los selects sólo ofrecen
       vigentes, así que el caso llega del backend: un 400 con `details`. */
    describe('datos inexistentes o dados de baja (CA-18.10)', () => {
        it.each([
            ['clientId', 'No existe un cliente vigente con ese identificador.'],
            ['responsibleLawyerId', 'No existe un abogado vigente con ese identificador.'],
            ['legalQualifications', 'No existe una calificación legal vigente con ese identificador.'],
        ])('el error de %s se muestra sobre su campo', async (field, message) => {
            server.use(
                http.post('*/cases', () =>
                    HttpResponse.json(
                        errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', { [field]: message }),
                        { status: 400 },
                    ),
                ),
            )
            const { user } = renderPage()
            await fillMinimum(user)

            await submit(user)

            expect(await screen.findByText(message)).toBeInTheDocument()
            // No navega: el usuario tiene que corregir el campo.
            expect(screen.queryByText('Detalle de la causa')).not.toBeInTheDocument()
        })

        it('los selects no ofrecen clientes ni calificaciones dados de baja', async () => {
            renderPage()
            await waitForOptions()

            // SOSA está dada de baja, y la calificación 9 también.
            expect(screen.queryByRole('option', { name: /SOSA/ })).not.toBeInTheDocument()
            expect(screen.queryByRole('option', { name: /Encubrimiento/ })).not.toBeInTheDocument()
        })
    })

    describe('carátula sugerida (CA-18.11)', () => {
        it('sin cliente todavía no hay nada que sugerir', async () => {
            renderPage()
            await waitForOptions()

            expect(screen.getByText('Elegí el cliente para sugerir la carátula.')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Usar esta carátula' })).toBeDisabled()
        })

        it('se sugiere con el cliente y las calificaciones', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.selectOptions(screen.getByLabelText(/^Cliente/), CLIENT_GOMEZ)
            expect(screen.getByText('GÓMEZ, Ariel Fernando p.s.a. …')).toBeInTheDocument()

            await user.selectOptions(screen.getByLabelText(/^Calificaciones legales/), ROBBERY)
            expect(screen.getByText('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')).toBeInTheDocument()
        })

        it('se sugiere con el cliente y la contraparte fuera del penal', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.selectOptions(screen.getByLabelText(/^Fuero/), 'AMPARO')
            await user.selectOptions(screen.getByLabelText(/^Cliente/), '6')
            await user.type(screen.getByLabelText(/^Contraparte u organismo/), 'APROSS')

            expect(screen.getByText('MOYANO, Daniela c/ APROSS — Amparo')).toBeInTheDocument()
        })

        it('"Usar esta carátula" la copia al campo', async () => {
            const { user } = renderPage()
            await waitForOptions()
            await user.selectOptions(screen.getByLabelText(/^Cliente/), CLIENT_GOMEZ)
            await user.selectOptions(screen.getByLabelText(/^Calificaciones legales/), ROBBERY)

            await user.click(screen.getByRole('button', { name: 'Usar esta carátula' }))

            expect(screen.getByLabelText(/^Carátula/)).toHaveValue('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')
            // Ya es la sugerida: no hay nada más que copiar.
            expect(screen.getByRole('button', { name: 'Usar esta carátula' })).toBeDisabled()
        })

        /* CA-18.11: el usuario puede ajustarla, y se registra la final. */
        it('el usuario la ajusta y se registra la carátula ajustada', async () => {
            const { user } = renderPage()
            await waitForOptions()
            await user.selectOptions(screen.getByLabelText(/^Cliente/), CLIENT_GOMEZ)
            await user.selectOptions(screen.getByLabelText(/^Abogado responsable/), LAWYER_RIOS)
            await user.click(screen.getByRole('button', { name: 'Usar esta carátula' }))

            const caption = screen.getByLabelText(/^Carátula/)
            await user.clear(caption)
            await user.type(caption, 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado — y otros')
            await submit(user)

            expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
            expect(created()?.caption).toBe('GÓMEZ, Ariel Fernando p.s.a. Robo calificado — y otros')
        })
    })

    describe('registrar un cliente o una calificación desde el alta', () => {
        /* Administrar clientes es sólo de la Secretaría (V3 D-05). */
        it.each([
            ['la Secretaría', 'gestion', true],
            ['el administrador', 'fvazquez', false],
            ['un abogado', 'mrios', false],
        ])('%s ve "Registrar cliente nuevo" habilitado: %s', async (_, username, enabled) => {
            renderPage(username)
            await waitForOptions()

            const button = screen.getByRole('button', { name: 'Registrar cliente nuevo' })
            expect(button).toHaveProperty('disabled', !enabled)
        })

        /* Registrar calificaciones es sólo del administrador (V3 D-04). */
        it.each([
            ['el administrador', 'fvazquez', true],
            ['la Secretaría', 'gestion', false],
            ['un abogado', 'mrios', false],
        ])('%s ve "Registrar calificación nueva" habilitado: %s', async (_, username, enabled) => {
            renderPage(username)
            await waitForOptions()

            const button = screen.getByRole('button', { name: 'Registrar calificación nueva' })
            expect(button).toHaveProperty('disabled', !enabled)
        })

        it('el cliente que se registra queda elegido en el formulario', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.click(screen.getByRole('button', { name: 'Registrar cliente nuevo' }))
            const dialog = screen.getByRole('dialog')
            await user.type(within(dialog).getByLabelText(/^apellido/i), 'ALBORNOZ')
            await user.type(within(dialog).getByLabelText(/^nombres/i), 'Bruno')
            await user.type(within(dialog).getByLabelText(/^dni/i), '35778120')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }))

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
            const client = db.clients.find((c) => c.lastName === 'ALBORNOZ')!
            expect(screen.getByLabelText(/^Cliente/)).toHaveValue(String(client.id))
            // Y ya sugiere la carátula con él.
            expect(screen.getByText('ALBORNOZ, Bruno p.s.a. …')).toBeInTheDocument()
        })
    })

    describe('salir sin registrar', () => {
        it('cancelar vuelve al listado', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.click(screen.getByRole('button', { name: 'Cancelar' }))

            expect(await screen.findByText('Listado de causas')).toBeInTheDocument()
            expect(created()).toBeUndefined()
        })

        it('las migas vuelven al listado', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.click(screen.getByRole('button', { name: 'Causas' }))

            expect(await screen.findByText('Listado de causas')).toBeInTheDocument()
        })
    })

    it('si el servidor falla, avisa y no navega', async () => {
        server.use(
            http.post('*/cases', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), { status: 500 }),
            ),
        )
        const { user } = renderPage()
        await fillMinimum(user)

        await submit(user)

        expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
        expect(screen.queryByText('Detalle de la causa')).not.toBeInTheDocument()
    })

    /* Fuera de alcance: la carpeta en Drive y los modelos de escritos son HU-39
       y HU-40 (V3 §8.3). */
    it('no ofrece la carpeta en Drive ni los modelos de escritos', async () => {
        renderPage()
        await waitForOptions()

        expect(screen.queryByText(/Drive/)).not.toBeInTheDocument()
        expect(screen.queryByText(/modelos/i)).not.toBeInTheDocument()
    })
})
