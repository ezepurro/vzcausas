/**
 * La cara pública del módulo.
 *
 * Otro módulo puede importar **esto** y nada más: `@/features/cases`, nunca
 * `@/features/cases/components/...`. Lo que no está acá adentro es asunto
 * interno del módulo y puede cambiar sin avisarle a nadie.
 *
 * Existe porque Registrar acto procesal (`proceedings/`) muestra la causa con
 * el mismo encabezado y la misma barra de prescripción que el detalle, nombra
 * su SAC igual —"Sin SAC" si no tiene— y se habilita con la misma regla: sólo
 * el abogado responsable (V3 D-30). Publica también `useCase` y las claves de
 * caché (`casesKeys`): el acto cambia el estado de la causa y tiene que
 * invalidarlas. La forma del acto procesal (`ProceduralAct`) también vive
 * acá, porque la línea de vida de la causa (HU27) la trae embebida.
 */

export { useCase } from './api/useCase'
export { useCreateCase } from './api/useCreateCase'
export { casesKeys } from './api/cases.keys'
export { CaseHeader } from './components/CaseHeader'
export { CaseHeaderSkeleton } from './components/CaseSkeletons'
export { PrescriptionBar } from './components/PrescriptionBar'
export { nearestQualification, prescriptionNote } from './utils/prescription'
export { openDeadline, DEADLINE_KIND_LABELS, type DeadlineKind, type OpenDeadline } from './utils/openDeadline'
export { isResponsibleLawyer } from './utils/responsibleLawyer'
export { NO_SAC_LABEL, sacLabel } from './utils/sac'
export {
    PROCEDURAL_ROLE_LABELS,
    type Case,
    type CaseLawyer,
    type CasePrescription,
    type CurrentState,
    type ResultingState,
} from './types/case'
export type { ActDeadline, ProceduralAct } from './types/proceduralAct'
