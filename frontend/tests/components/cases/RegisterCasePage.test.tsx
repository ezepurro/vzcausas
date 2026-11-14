import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { chooseOption } from '../../setup/searchSelect'
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

/** El cliente 1 y la abogada 3 de los fixtures. */
const CLIENT_GOMEZ = 'GÓMEZ, Ariel Fernando · DNI 34.812.905'
const LAWYER_RIOS = '3'
/** Robo calificado, 96 meses. */
const ROBBERY = /^Robo calificado/

/** El aviso del alta, como lo escribe el prototipo. */
// Desde V4 la carpeta se crea por defecto, con los 6 modelos del penal (CA-39.1, CA-40.2).
const WITH_SAC_TOAST =
    'Causa 14200315 registrada. El estado lo fija el primer acto procesal · carpeta creada en Drive con 6 modelos.'

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

/** Espera a que lleguen los abogados: hasta entonces su select está vacío. */
async function waitForOptions() {
    await screen.findByRole('option', { name: /^Ríos, Malena/ })
}

/** Lo mínimo que una causa penal necesita, sin calificaciones (CA-18.5). */
async function fillMinimum(user: User, caption = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado') {
    await waitForOptions()
    await chooseOption(user, screen.getByLabelText(/^Cliente/), CLIENT_GOMEZ)
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

    describe('alta exitosa (CA-18.1)', () => {
        it('registra una causa penal con su calificación y lleva a su detalle', async () => {
            const { user } = renderPage()
            await fillMinimum(user)

            await fillSac(user, '14200315')
            await chooseOption(user, screen.getByLabelText(/^Calificaciones legales/), ROBBERY)
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
            await chooseOption(user, screen.getByLabelText(/^Cliente/), /^MOYANO, Daniela/)
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
    })

    describe('número de SAC (CA-18.2)', () => {
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
            // El error del servidor también lleva al campo.
            await waitFor(() => expect(screen.getByLabelText(/^N° de SAC/)).toHaveFocus())
            expect(screen.getByLabelText(/^Carátula/)).toHaveValue('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')
            expect(created()).toBeUndefined()
        })
    })

    /* Topes de V5 en los campos de texto: no dejan escribir de más. */
    it('los campos de texto traen el tope del contrato', async () => {
        renderPage()

        expect(await screen.findByLabelText(/^N° de SAC/)).toHaveAttribute('maxlength', '8')
        expect(screen.getByLabelText(/^Carátula/)).toHaveAttribute('maxlength', '255')
        expect(screen.getByLabelText(/^Instructor de la causa/)).toHaveAttribute('maxlength', '150')
        expect(screen.getByLabelText(/^Interno/)).toHaveAttribute('maxlength', '20')
    })

    describe('campos propios del fuero (CA-18.4)', () => {
        it('al pasar al amparo o al administrativo aparecen la contraparte y el objeto, y se van las calificaciones', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.selectOptions(screen.getByLabelText(/^Fuero/), 'AMPARO')

            expect(screen.getByLabelText(/^Contraparte u organismo/)).toBeInTheDocument()
            expect(screen.getByLabelText(/^Objeto del amparo/)).toBeInTheDocument()
            expect(screen.queryByLabelText(/^Calificaciones legales/)).not.toBeInTheDocument()
            expect(screen.getByText('Objeto del amparo redactado')).toBeInTheDocument()

            await user.selectOptions(screen.getByLabelText(/^Fuero/), 'ADMINISTRATIVE')

            expect(screen.getByLabelText(/^Objeto del reclamo/)).toBeInTheDocument()
            expect(screen.getByText('Objeto del reclamo redactado')).toBeInTheDocument()
        })
    })

    /* CA-18.1 y CA-18.8 */
    it('enviado vacío marca los obligatorios y no llama al servidor (CA-18.8)', async () => {
        const { user } = renderPage()
        await waitForOptions()

        await submit(user)

        expect(screen.getByText('La carátula es obligatoria.')).toBeInTheDocument()
        expect(screen.getByText('Elegí el cliente de la causa.')).toBeInTheDocument()
        expect(screen.getByText('Elegí el abogado responsable.')).toBeInTheDocument()
        // Lleva al primer campo con error: la carátula, porque el SAC vacío vale.
        expect(screen.getByLabelText(/^Carátula/)).toHaveFocus()
        expect(created()).toBeUndefined()
    })

    /* CA-18.10: un cliente, un abogado o una calificación inexistente o dado de
       baja se informa sobre el campo del formulario. Los selects sólo ofrecen
       vigentes, así que el caso llega del backend: un 400 con `details`. */
    describe('datos inexistentes o dados de baja (CA-18.10)', () => {
        it.each([
            ['clientId', 'No existe un cliente vigente con ese identificador.'],
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

        /* Un 400 cuyos campos el formulario no pinta —las casillas, o una clave
           que el front no conoce— no puede quedar mudo: se avisa con el mensaje
           del servidor. Es lo que respondía un backend que todavía no aceptaba
           los datos de V4. */
        it('un 400 sobre campos que el formulario no muestra avisa con el mensaje del servidor', async () => {
            server.use(
                http.post('*/cases', () =>
                    HttpResponse.json(
                        errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                            courtFeePaid: 'property courtFeePaid should not exist',
                            createFolder: 'property createFolder should not exist',
                        }),
                        { status: 400 },
                    ),
                ),
            )
            const { user } = renderPage()
            await fillMinimum(user)

            await submit(user)

            expect(await screen.findByText('Los datos enviados no son válidos.')).toBeInTheDocument()
            expect(screen.queryByText('Detalle de la causa')).not.toBeInTheDocument()
        })
    })

    describe('carátula sugerida (CA-18.11)', () => {
        it('"Usar esta carátula" la copia al campo', async () => {
            const { user } = renderPage()
            await waitForOptions()
            await chooseOption(user, screen.getByLabelText(/^Cliente/), CLIENT_GOMEZ)
            await chooseOption(user, screen.getByLabelText(/^Calificaciones legales/), ROBBERY)

            await user.click(screen.getByRole('button', { name: 'Usar esta carátula' }))

            expect(screen.getByLabelText(/^Carátula/)).toHaveValue('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')
            // Ya es la sugerida: no hay nada más que copiar.
            expect(screen.getByRole('button', { name: 'Usar esta carátula' })).toBeDisabled()
        })
    })

    describe('registrar un cliente o una calificación desde el alta', () => {
        /* Matriz de permisos del 11/10/2026 (V3 §4, D-39): administrar clientes
           y calificaciones legales es de los tres perfiles. */
        /* Los tres perfiles pueden: alcanza con el de menos permisos
           (TESTING.md §5, "un perfil habilitado"). */
        it.each([
            ['la Secretaría', 'gestion'],
        ])('%s tiene habilitados los dos botones de alta', async (_, username) => {
            renderPage(username)
            await waitForOptions()

            expect(screen.getByRole('button', { name: 'Registrar cliente nuevo' })).toBeEnabled()
            expect(screen.getByRole('button', { name: 'Registrar calificación nueva' })).toBeEnabled()
        })

        /* CA-8.9 */
        it('el cliente que se registra queda elegido en el formulario', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.click(screen.getByRole('button', { name: 'Registrar cliente nuevo' }))
            const dialog = screen.getByRole('dialog')
            await user.type(within(dialog).getByLabelText(/^apellido/i), 'ALBORNOZ')
            await user.type(within(dialog).getByLabelText(/^nombres/i), 'Bruno')
            await user.type(within(dialog).getByLabelText(/^número de documento/i), '35778120')
            await user.type(within(dialog).getByLabelText(/^dirección/i), 'Av. Colón 999, Córdoba')
            await user.type(within(dialog).getByLabelText(/^teléfono/i), '351 400-1122')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }))

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
            const client = db.clients.find((c) => c.lastName === 'ALBORNOZ')!
            expect(screen.getByLabelText(/^Cliente/)).toHaveValue(`ALBORNOZ, Bruno · DNI 35.778.120`)
            expect(client).toBeDefined()
            // Y ya sugiere la carátula con él.
            expect(screen.getByText('ALBORNOZ, Bruno p.s.a. …')).toBeInTheDocument()
        })
        /* CA-48.8: la calificación se registra sin salir del alta, y queda agregada a la causa. */
        it('la calificación que se registra desde el alta queda agregada a la causa', async () => {
            const { user } = renderPage()
            await waitForOptions()

            await user.click(screen.getByRole('button', { name: 'Registrar calificación nueva' }))
            const dialog = screen.getByRole('dialog')
            await user.type(within(dialog).getByLabelText(/^Nombre de la calificación legal/), 'Estafa — art. 172 CP')
            await user.type(within(dialog).getByLabelText(/^Años/), '6')
            await user.selectOptions(within(dialog).getByLabelText(/^Meses/), '0')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación' }))

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
            expect(screen.getByLabelText(/^Fecha del hecho de Estafa — art\. 172 CP/)).toBeInTheDocument()
        })
    })

    /* El listado llega de a 100 (el `limit` máximo del contrato). Con más
       registros que eso, lo que no entraba en la primera página no se podía
       elegir, y una calificación recién registrada se mostraba como dada de
       baja (H-03 y H-28 de `docs/auditoria-front`). */
    describe('con más de 100 clientes o calificaciones', () => {
        /** 110 que quedan primeros en el orden alfabético: empujan a los reales fuera de la página. */
        function seedClientsBefore() {
            const template = db.clients[0]
            for (let i = 0; i < 110; i++) {
                db.clients.push({
                    ...template,
                    id: 5000 + i,
                    lastName: `AAPRUEBA${String(i).padStart(3, '0')}`,
                    firstName: 'Cliente',
                    documentNumber: String(41000000 + i),
                })
            }
        }

        function seedQualificationsBefore() {
            const template = db.legalQualifications[0]
            for (let i = 0; i < 110; i++) {
                db.legalQualifications.push({
                    ...template,
                    id: 5000 + i,
                    name: `Aa prueba ${String(i).padStart(3, '0')} — art. ${700 + i} CP`,
                })
            }
        }

        it('un cliente que no entra en los primeros 100 se encuentra escribiendo', async () => {
            seedClientsBefore()
            const { user } = renderPage()
            await waitForOptions()

            const field = screen.getByLabelText(/^Cliente/)
            await user.click(field)
            await screen.findByRole('option', { name: /^AAPRUEBA000/ })
            expect(screen.queryByRole('option', { name: CLIENT_GOMEZ })).not.toBeInTheDocument()
            expect(screen.getByText(/^Se muestran 100 de \d+ clientes\. Escribí para buscar entre todos\.$/)).toBeInTheDocument()

            await user.type(field, 'gomez')
            await user.click(await screen.findByRole('option', { name: CLIENT_GOMEZ }))

            expect(field).toHaveValue(CLIENT_GOMEZ)
            // Y el resumen ya lo conoce: sugiere la carátula con él.
            expect(await screen.findByText('GÓMEZ, Ariel Fernando p.s.a. …')).toBeInTheDocument()
        })

        it('una calificación que no entra en las primeras 100 se encuentra escribiendo', async () => {
            seedQualificationsBefore()
            const { user } = renderPage()
            await waitForOptions()

            const field = screen.getByLabelText(/^Calificaciones legales/)
            await user.type(field, 'robo calif')
            await user.click(await screen.findByRole('option', { name: ROBBERY }))

            expect(await screen.findByLabelText(/^Fecha del hecho de Robo calificado/)).toBeInTheDocument()
            // Sigue ahí cuando la búsqueda se vacía y el listado vuelve a no traerla.
            await waitFor(() => expect(screen.queryByText('Calificación dada de baja')).not.toBeInTheDocument())
            expect(screen.getByLabelText(/^Fecha del hecho de Robo calificado/)).toBeInTheDocument()
        })

        it('la calificación recién registrada no se muestra como dada de baja', async () => {
            seedQualificationsBefore()
            const { user } = renderPage()
            await waitForOptions()

            await user.click(screen.getByRole('button', { name: 'Registrar calificación nueva' }))
            const dialog = screen.getByRole('dialog')
            await user.type(within(dialog).getByLabelText(/^Nombre de la calificación legal/), 'Zz tardía — art. 999 CP')
            await user.type(within(dialog).getByLabelText(/^Años/), '3')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación' }))

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
            expect(await screen.findByLabelText(/^Fecha del hecho de Zz tardía — art\. 999 CP/)).toBeInTheDocument()
            expect(screen.queryByText('Calificación dada de baja')).not.toBeInTheDocument()
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

    /* "Asignarme a mí" (cases/CAMBIOS.md): no está en el prototipo. La ficha de
       quien registra va primero en "Abogado responsable", sin elegirla sola. */
    describe('abogado responsable: asignarme a mí', () => {
        it('a un abogado le ofrece primero su propia ficha, sin dejarla elegida', async () => {
            renderPage('mrios')

            const mine = await screen.findByRole('option', { name: /\(asignarme a mí\)$/ })
            const select = screen.getByLabelText(/^Abogado responsable/)
            const options = within(select).getAllByRole('option')
            // La primera es "Seleccionar responsable…".
            expect(options[1]).toBe(mine)
            expect(mine).toHaveValue(LAWYER_RIOS)
            expect(mine).toHaveTextContent(/^Ríos, Malena/)
            expect(select).toHaveValue('')
        })

        it('a quien no es abogado no le ofrece asignarse', async () => {
            renderPage('gestion')
            await waitForOptions()
            await screen.findByRole('option', { name: /^Ríos, Malena/ })

            expect(screen.queryByRole('option', { name: /asignarme a mí/ })).not.toBeInTheDocument()
        })
    })
})

