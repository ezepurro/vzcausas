/**
 * La cara pública del módulo.
 *
 * Otro módulo puede importar **esto** y nada más: `@/features/legal-params`,
 * nunca `@/features/legal-params/api/...`. Lo que no está acá adentro es
 * asunto interno del módulo y puede cambiar sin avisarle a nadie.
 *
 * Existe porque la parametría jurídica la consumen las causas y los actos:
 * - el alta de causa elige el fuero y las calificaciones legales, y ofrece
 *   "Registrar calificación nueva";
 * - el registro de un acto ofrece los estados procesales del fuero de la causa.
 *
 * El alta de causa usa `useLegalQualifications` para su selector y
 * `useCreateLegalQualification` para "Registrar calificación nueva".
 */

export { useProceduralStates } from './api/useProceduralStates';
export { isPrescribedState, PRESCRIBED_STATE_NAME } from './utils/systemStates';
export { legalQualificationKeys } from './api/legalQualifications.keys';
export { proceduralStateKeys } from './api/proceduralStates.keys';
export { useLegalQualifications } from './api/useLegalQualifications';
export { useCreateLegalQualification } from './api/useCreateLegalQualification';
export { useLegalQualificationsByIds } from './api/useLegalQualificationsByIds';
export { LegalQualificationFormModal } from './components/LegalQualificationFormModal';
export {
    validateLegalQualification,
    isValid as isValidLegalQualification,
    type LegalQualificationErrors,
} from './schemas/legalQualification.schema';
export {
    formatPrescription,
    shortQualificationName,
    splitPrescription,
    toPrescriptionMonths,
} from './utils/prescription';
export {
    DAY_TYPE_LABELS,
    JURISDICTION_LABELS,
    JURISDICTIONS,
    type DayType,
    type Jurisdiction,
    type ProceduralState,
} from './types/proceduralState';
export type {
    CreatedLegalQualification,
    LegalQualification,
    LegalQualificationFormValues,
} from './types/legalQualification';
export { toCreateLegalQualificationBody } from './utils/toCreateLegalQualificationBody';
export { toLegalQualificationFormErrors } from './utils/toLegalQualificationFormErrors';

