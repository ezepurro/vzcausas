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

describe('CaseForm', () => {
    describe('fuero penal', () => {
        it('pide las calificaciones legales y no la contraparte ni el objeto', () => {
            renderForm()

            expect(screen.getByLabelText(/^Calificaciones legales/)).toBeInTheDocument()
            expect(screen.queryByLabelText(/^Contraparte u organismo/)).not.toBeInTheDocument()
            expect(screen.queryByLabelText(/^Objeto del/)).not.toBeInTheDocument()
        })

        it('cada calificación elegida pide la fecha del hecho, y avisa al cargarla', () => {
            const { onOffenseDateChange } = renderForm(undefined, { selectedQualifications: [ROBBERY] })

            fireEvent.change(screen.getByLabelText(`Fecha del hecho de ${ROBBERY.name}`), {
                target: { value: '2021-02-27' },
            })

            expect(onOffenseDateChange).toHaveBeenCalledWith(1, '2021-02-27')
        })

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

        it('ofrece los roles del fuero penal', () => {
            renderForm()

            expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Defensa', 'Querellante particular'])
        })
    })

    describe('fueros administrativo y de amparo', () => {
        it('pide la contraparte y el objeto, y no las calificaciones', () => {
            renderForm(amparo())

            expect(screen.getByLabelText(/^Contraparte u organismo/)).toBeInTheDocument()
            expect(screen.getByLabelText(/^Objeto del amparo/)).toBeInTheDocument()
            expect(screen.queryByLabelText(/^Calificaciones legales/)).not.toBeInTheDocument()
        })

        it('el objeto se llama distinto en cada fuero', () => {
            renderForm(administrative())

            expect(screen.getByLabelText(/^Objeto del reclamo/)).toBeInTheDocument()
            expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Defensa', 'Recurrente'])
        })

        it('el objeto es obligatorio, tiene tope de 800 y muestra cuánto va escrito', () => {
            renderForm(amparo({ subjectMatter: 'Se ordene la cobertura.' }))
            const field = screen.getByLabelText(/^Objeto del amparo/)

            expect(field).toHaveAttribute('maxlength', '800')
            expect(field).toHaveValue('Se ordene la cobertura.')
            expect(screen.getByText('23 / 800')).toBeInTheDocument()
            // El asterisco de obligatorio va en la etiqueta.
            expect(screen.getByText(/^Objeto del amparo/).textContent).toContain('*')
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

    it('cambiar el fuero avisa aparte, porque arrastra otros campos', async () => {
        const { user, onJurisdictionChange, onChange } = renderForm()

        await user.selectOptions(screen.getByLabelText(/^Fuero/), 'AMPARO')

        expect(onJurisdictionChange).toHaveBeenCalledWith('AMPARO')
        expect(onChange).not.toHaveBeenCalled()
    })

    it('"Registrar cliente nuevo" se deshabilita para quien no es de la Secretaría', () => {
        renderForm(undefined, { canCreateClient: false })

        const button = screen.getByRole('button', { name: 'Registrar cliente nuevo' })
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('title', 'Sólo la Secretaría puede registrar clientes.')
    })

    it('enviar el formulario confirma, y mientras guarda bloquea el botón', async () => {
        const { user, onConfirm } = renderForm()

        await user.click(screen.getByRole('button', { name: 'Registrar causa' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('mientras guarda, bloquea el confirmar', () => {
        renderForm(undefined, { saving: true })

        expect(screen.getByRole('button', { name: 'Registrar causa' })).toBeDisabled()
    })
})
