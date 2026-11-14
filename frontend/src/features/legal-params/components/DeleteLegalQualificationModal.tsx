import { FormModal } from '@/shared/components/forms';
import type { LegalQualification } from '@/features/legal-params/types/legalQualification';

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
 * La baja procede aunque haya causas que la usen (V3 D-06, CA-50.3): deja de ofrecerse
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
            sub={qualification.name}
            tone="danger"
            width="sm"
            /* Los textos del prototipo (CA-50.3). */
            note={
                inUse
                    ? `Se usa en ${qualification.activeCases === 1 ? '1 causa' : `${qualification.activeCases} causas`}, que la conservan. Deja de ofrecerse al registrar causas nuevas.`
                    : 'Deja de ofrecerse al registrar causas nuevas.'
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
