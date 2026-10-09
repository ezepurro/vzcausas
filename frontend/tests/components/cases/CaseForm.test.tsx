import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CaseForm, type CaseFormProps } from '@/features/cases/components/CaseForm'
import { changeJurisdiction, emptyCaseForm } from '@/features/cases/utils/caseForm'
import type { CaseFormValues } from '@/features/cases/types/case'

const ROBBERY = { id: 1, name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, offenseDate: '' }

function renderForm(values: CaseFormValues = emptyCaseForm(), props: Partial<CaseFormProps> = {}) {
    const handlers = {
        onChange: vi.fn(),
        onSacNumberChange: vi.fn(),
        onJurisdictionChange: vi.fn(),
        onAddQualification: vi.fn(),
        onRemoveQualification: vi.fn(),
        onOffenseDateChange: vi.fn(),
        onNewClient: vi.fn(),
        onNewQualification: vi.fn(),
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    }
    render(
        <CaseForm
            values={values}
            errors={{}}
            clientOptions={[{ value: '1', label: 'GÓMEZ, Ariel Fernando · DNI 34.812.905' }]}
            lawyerOptions={[{ value: '3', label: 'Dra. Malena Ríos · matrícula 1-36842' }]}
            selectedQualifications={[]}
            qualificationOptions={[{ value: '1', label: 'Robo calificado — art. 167 inc. 2 CP · 8 años' }]}
            canCreateClient
            canCreateQualification
            saving={false}
            {...handlers}
            {...props}
        />,
    )
    return { ...handlers, user: userEvent.setup() }
}

const amparo = (extra: Partial<CaseFormValues> = {}) => ({ ...changeJurisdiction(emptyCaseForm(), 'AMPARO'), ...extra })
const administrative = () => changeJurisdiction(emptyCaseForm(), 'ADMINISTRATIVE')

/**
 * El texto de la etiqueta de un campo: el asterisco marca los obligatorios. Se
 * busca sólo entre los `<label>`, porque los títulos de `FormSection` ("Cliente
 * y rol procesal") también empiezan con el mismo texto.
 */
const labelOf = (pattern: RegExp) => screen.getByText(pattern, { selector: 'label' }).textContent ?? ''

describe('CaseForm', () => {
    /* CA-18.1: lo que la causa necesita siempre lleva asterisco. */
    it('marca como obligatorios la carátula, el fuero, el cliente y el responsable', () => {
        renderForm()

        expect(labelOf(/^Carátula/)).toContain('*')
        expect(labelOf(/^Fuero/)).toContain('*')
        expect(labelOf(/^Cliente/)).toContain('*')
        expect(labelOf(/^Abogado responsable/)).toContain('*')
    })

    describe('número de SAC (CA-18.2)', () => {
        it('no es obligatorio: la causa puede iniciarse antes de que se lo asignen', () => {
            renderForm()

            expect(labelOf(/^N° de SAC/)).not.toContain('*')
        })

        /* Va aparte del resto porque arrastra la fecha de inicio. */
        it('acepta hasta 8 dígitos y avisa lo que se escribe', () => {
            const { onChange, onSacNumberChange } = renderForm()
            const field = screen.getByLabelText(/^N° de SAC/)

            expect(field).toHaveAttribute('maxlength', '8')

            fireEvent.change(field, { target: { value: '13284571' } })
            expect(onSacNumberChange).toHaveBeenCalledWith('13284571')
            expect(onChange).not.toHaveBeenCalled()
        })

        /* El 409 del backend se pinta acá mismo, no en un aviso suelto. */
        it('muestra el error del SAC en su campo', () => {
            renderForm(undefined, { errors: { sacNumber: 'Ya existe una causa registrada con ese número de SAC.' } })

            expect(screen.getByText('Ya existe una causa registrada con ese número de SAC.')).toBeInTheDocument()
        })
    })

    describe('instructor de la causa', () => {
        /* El teléfono y el interno van en campos separados (V3 D-33). */
        it('el teléfono y el interno son dos campos distintos', () => {
            const { onChange } = renderForm()

            fireEvent.change(screen.getByLabelText(/^Teléfono/), { target: { value: '0351 448-1200' } })
            expect(onChange).toHaveBeenCalledWith('tribunalPhone', '0351 448-1200')

            fireEvent.change(screen.getByLabelText(/^Interno/), { target: { value: '214' } })
            expect(onChange).toHaveBeenCalledWith('instructorExtension', '214')
        })

        it('los tres son opcionales', () => {
            renderForm()

            expect(labelOf(/^Instructor de la causa/)).not.toContain('*')
            expect(labelOf(/^Teléfono/)).not.toContain('*')
            expect(labelOf(/^Interno/)).not.toContain('*')
        })

        it('el interno tiene tope de 20 caracteres', () => {
            renderForm()

            expect(screen.getByLabelText(/^Interno/)).toHaveAttribute('maxlength', '20')
        })
    })

    describe('fuero penal', () => {
        /* CA-18.4 */
        it('pide las calificaciones legales y no la contraparte ni el objeto', () => {
            renderForm()

            expect(screen.getByLabelText(/^Calificaciones legales/)).toBeInTheDocument()
            expect(screen.queryByLabelText(/^Contraparte u organismo/)).not.toBeInTheDocument()
            expect(screen.queryByLabelText(/^Objeto del/)).not.toBeInTheDocument()
        })

        /* CA-18.5: una causa penal puede registrarse sin calificaciones (D-33). */
        it('las calificaciones legales no son obligatorias', () => {
            renderForm()

            expect(labelOf(/^Calificaciones legales/)).not.toContain('*')
        })

        /* CA-18.5 */
        it('cada calificación elegida pide la fecha del hecho, y avisa al cargarla', () => {
            const { onOffenseDateChange } = renderForm(undefined, { selectedQualifications: [ROBBERY] })

            fireEvent.change(screen.getByLabelText(`Fecha del hecho de ${ROBBERY.name}`), {
                target: { value: '2021-02-27' },
            })

            expect(onOffenseDateChange).toHaveBeenCalledWith(1, '2021-02-27')
        })

        /* CA-18.5 */
        it('muestra el error del grupo y el de la fecha que falta', () => {
            renderForm(undefined, {
                selectedQualifications: [ROBBERY],
                errors: {
                    legalQualifications: 'Revisá la fecha del hecho de cada calificación.',
                    offenseDates: { 1: 'Cargá la fecha del hecho.' },
                },
            })

            expect(screen.getByText('Revisá la fecha del hecho de cada calificación.')).toBeInTheDocument()
            expect(screen.getByText('Cargá la fecha del hecho.')).toBeInTheDocument()
        })

        /* CA-18.3 */
        it('ofrece los roles del fuero penal', () => {
            renderForm()

            expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Defensa', 'Querellante particular'])
        })
    })

    describe('fueros administrativo y de amparo', () => {
        /* CA-18.4 */
        it('pide la contraparte y el objeto, y no las calificaciones', () => {
            renderForm(amparo())

            expect(screen.getByLabelText(/^Contraparte u organismo/)).toBeInTheDocument()
            expect(screen.getByLabelText(/^Objeto del amparo/)).toBeInTheDocument()
            expect(screen.queryByLabelText(/^Calificaciones legales/)).not.toBeInTheDocument()
        })

        /* CA-18.3 y CA-18.4 */
        it('el objeto se llama distinto en cada fuero', () => {
            renderForm(administrative())

            expect(screen.getByLabelText(/^Objeto del reclamo/)).toBeInTheDocument()
            expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Defensa', 'Recurrente'])
        })

        /* CA-18.3 */
        it('ofrece los roles del fuero de amparo', () => {
            renderForm(amparo())

            expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Actora', 'Demandada'])
        })

        /* CA-18.4: el objeto es obligatorio. */
        it('el objeto es obligatorio, tiene tope de 800 y muestra cuánto va escrito', () => {
            renderForm(amparo({ subjectMatter: 'Se ordene la cobertura.' }))
            const field = screen.getByLabelText(/^Objeto del amparo/)

            expect(field).toHaveAttribute('maxlength', '800')
            expect(field).toHaveValue('Se ordene la cobertura.')
            expect(screen.getByText('23 / 800')).toBeInTheDocument()
            expect(labelOf(/^Objeto del amparo/)).toContain('*')
        })

        /* CA-18.4: la contraparte se carga, pero no es obligatoria. */
        it('la contraparte no es obligatoria', () => {
            renderForm(amparo())

            expect(labelOf(/^Contraparte u organismo/)).not.toContain('*')
        })

        it('escribir el objeto avisa a la pantalla', () => {
            const { onChange } = renderForm(amparo())

            fireEvent.change(screen.getByLabelText(/^Objeto del amparo/), { target: { value: 'Cobertura.' } })

            expect(onChange).toHaveBeenCalledWith('subjectMatter', 'Cobertura.')
        })

        it('muestra el error del objeto', () => {
            renderForm(amparo(), { errors: { subjectMatter: 'El objeto del amparo es obligatorio.' } })

            expect(screen.getByText('El objeto del amparo es obligatorio.')).toBeInTheDocument()
        })
    })

    /* CA-18.3 y CA-18.4: cambiar el fuero arrastra el rol y los campos propios. */
    it('cambiar el fuero avisa aparte, porque arrastra otros campos', async () => {
        const { user, onJurisdictionChange, onChange } = renderForm()

        await user.selectOptions(screen.getByLabelText(/^Fuero/), 'AMPARO')

        expect(onJurisdictionChange).toHaveBeenCalledWith('AMPARO')
        expect(onChange).not.toHaveBeenCalled()
    })

    /* CA-18.2: la fecha de inicio va con el SAC. */
    describe('fecha de inicio (CA-18.2)', () => {
        it('sin SAC está deshabilitada, vacía y no es obligatoria', () => {
            renderForm()
            const field = screen.getByLabelText(/^Fecha de inicio/)

            expect(field).toBeDisabled()
            expect(field).toHaveValue('')
            expect(labelOf(/^Fecha de inicio/)).not.toContain('*')
            expect(screen.getByText('Se carga junto con el N° de SAC.')).toBeInTheDocument()
        })

        it('con SAC se habilita y es obligatoria', () => {
            const { onChange } = renderForm({ ...emptyCaseForm(), sacNumber: '13284571' })
            const field = screen.getByLabelText(/^Fecha de inicio/)

            expect(field).toBeEnabled()
            expect(labelOf(/^Fecha de inicio/)).toContain('*')
            expect(screen.queryByText('Se carga junto con el N° de SAC.')).not.toBeInTheDocument()

            fireEvent.change(field, { target: { value: '2021-03-12' } })
            expect(onChange).toHaveBeenCalledWith('startDate', '2021-03-12')
        })
    })

    /* CA-18.10: los errores del servidor se muestran sobre el campo. */
    it('muestra en su campo el error del cliente y el del responsable', () => {
        renderForm(undefined, {
            errors: {
                clientId: 'No existe un cliente vigente con ese identificador.',
                responsibleLawyerId: 'No existe un abogado vigente con ese identificador.',
            },
        })

        expect(screen.getByText('No existe un cliente vigente con ese identificador.')).toBeInTheDocument()
        expect(screen.getByText('No existe un abogado vigente con ese identificador.')).toBeInTheDocument()
    })

    it('"Registrar cliente nuevo" se deshabilita para quien no es de la Secretaría', () => {
        renderForm(undefined, { canCreateClient: false })

        const button = screen.getByRole('button', { name: 'Registrar cliente nuevo' })
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('title', 'Sólo la Secretaría puede registrar clientes.')
    })

    it('enviar el formulario confirma', async () => {
        const { user, onConfirm } = renderForm()

        await user.click(screen.getByRole('button', { name: 'Registrar causa' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('mientras guarda, bloquea el confirmar', () => {
        renderForm(undefined, { saving: true })

        expect(screen.getByRole('button', { name: 'Registrar causa' })).toBeDisabled()
    })

    it('cancelar avisa a la pantalla', async () => {
        const { user, onCancel } = renderForm()

        await user.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    /* Fuera de alcance: la carpeta en Drive y los modelos son HU-39 y HU-40
       (V3 §8.3). El prototipo las muestra; no se dibujan ni deshabilitadas. */
    it('no ofrece crear la carpeta en Drive ni copiar los modelos', () => {
        renderForm()

        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
        expect(screen.queryByText(/Drive/)).not.toBeInTheDocument()
    })
})
