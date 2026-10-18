import { FormModal } from '@/shared/components/forms';
import type { LegalQualification } from '@/features/legal-params/types/legalQualification';
import { formatPrescription } from '@/features/legal-params/utils/prescription';

export interface DeleteLegalQualificationModalProps {
    qualification: LegalQualification;
    saving: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Confirmación de baja. Es un `FormModal` sin campos, el modo "confirmar baja"
 * del producto.
 *
 * La baja procede aunque haya causas que la usen (V3 D-06): deja de ofrecerse
 * en el alta, pero las causas la conservan con su prescripción. El texto lo
 * dice para que nadie la deje de dar de baja por miedo a romper causas.
 */
export function DeleteLegalQualificationModal({
    qualification, saving, onConfirm, onCancel,
}: DeleteLegalQualificationModalProps) {
    const inUse = qualification.activeCases > 0;

    return (
        <FormModal
            title="Eliminar calificación legal"
            sub={`${qualification.name} · ${formatPrescription(qualification.prescriptionMonths)}`}
            tone="danger"
            width="sm"
            note={
                inUse
                    ? `La usan ${qualification.activeCases === 1 ? '1 causa activa' : `${qualification.activeCases} causas activas`}. Dejará de ofrecerse al registrar causas, pero esas causas la conservan con su plazo de prescripción.`
                    : 'Dejará de ofrecerse al registrar causas.'
            }
            values={{}}
            onChange={() => {}}
            okLabel="Eliminar"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}
