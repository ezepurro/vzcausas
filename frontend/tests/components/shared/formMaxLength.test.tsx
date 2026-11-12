import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LawyerFormModal } from '@/features/lawyers/components/LawyerFormModal'
import { UserFormModal } from '@/features/users/components/UserFormModal'
import { LAWYER_MODES } from '@/features/users/types/user'
import { LegalQualificationFormModal } from '@/features/legal-params/components/LegalQualificationFormModal'
import { ProceduralStateFormModal } from '@/features/legal-params/components/ProceduralStateFormModal'
import { DeleteCaseModal } from '@/features/cases/components/DeleteCaseModal'
import { InterruptiveActModal } from '@/features/cases/components/InterruptiveActModal'
import { PrescriptionDeclarationModal } from '@/features/cases/components/PrescriptionDeclarationModal'

/**
 * Los topes (`maxlength`) de cada formulario de modal. Son los del contrato
 * (V5) y, donde V5 no fija ninguno, los que eligió el equipo el 06/11/2026:
 * matrícula 12, años 2, días del estado procesal 4. Los de clientes y causas
 * se prueban en sus pantallas.
 */
const noop = () => {}
const handlers = { saving: false, onChange: noop, onConfirm: noop, onCancel: noop }

const maxOf = (label: RegExp) => screen.getByLabelText(label).getAttribute('maxlength')

describe('topes de los formularios', () => {
    it('abogado: apellido y nombres 100, matrícula 12', () => {
        render(
            <LawyerFormModal mode="create" errors={{}} {...handlers}
                values={{ lastName: '', firstName: '', registrationNumber: '' }} />,
        )
        expect(maxOf(/^apellido/i)).toBe('100')
        expect(maxOf(/^nombres/i)).toBe('100')
        expect(maxOf(/^matrícula/i)).toBe('12')
    })

    it('usuario: usuario 30, apellido 100 y matrícula de la ficha nueva 12', () => {
        render(
            <UserFormModal mode="create" sub="" errors={{}} lawyerOptions={[]} roles={['LAWYER']} {...handlers}
                values={{
                    lastName: '', firstName: '', username: '', email: '', password: '', passwordConfirm: '',
                    roleAdministrator: false, roleLawyer: true, roleSecretary: false,
                    lawyerMode: LAWYER_MODES.create, lawyerId: '', registrationNumber: '',
                }} />,
        )
        expect(maxOf(/^nombre de usuario/i)).toBe('30')
        expect(maxOf(/^apellido/i)).toBe('100')
        expect(maxOf(/^matrícula/i)).toBe('12')
    })

    it('calificación legal: nombre 255, años 2', () => {
        render(
            <LegalQualificationFormModal mode="create" errors={{}} {...handlers}
                values={{ name: '', years: '', months: '0' }} />,
        )
        expect(maxOf(/^nombre de la calificación/i)).toBe('255')
        expect(maxOf(/^años/i)).toBe('2')
    })

    it('estado procesal: nombre 80, días 4', () => {
        render(
            <ProceduralStateFormModal mode="create" sub="" errors={{}} {...handlers}
                values={{ name: '', timeLimitDays: '', dayType: '', terminal: false }} />,
        )
        expect(maxOf(/^nombre del estado/i)).toBe('80')
        expect(maxOf(/^días/i)).toBe('4')
    })

    it('baja de causa: motivo 500, con contador', () => {
        render(<DeleteCaseModal caption="X" errors={{}} {...handlers} values={{ reason: '' }} />)
        expect(maxOf(/^motivo/i)).toBe('500')
        expect(screen.getByText('0 / 500')).toBeInTheDocument()
    })

    it('acto interruptivo: nombre 255, observaciones 2000', () => {
        render(
            <InterruptiveActModal caption="X" errors={{}} {...handlers}
                values={{ name: '', actDate: '', notes: '' }} />,
        )
        expect(maxOf(/^acto interruptivo/i)).toBe('255')
        expect(maxOf(/^observaciones/i)).toBe('2000')
    })

    it('prescripción: resolución 255, fundamento 2000', () => {
        render(
            <PrescriptionDeclarationModal caption="X" errors={{}} {...handlers}
                values={{ prescriptionDate: '', resolution: '', grounds: '' }} />,
        )
        expect(maxOf(/^resolución/i)).toBe('255')
        expect(maxOf(/^fundamento/i)).toBe('2000')
    })
})
