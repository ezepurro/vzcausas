/**
 * La cara pública del módulo.
 *
 * Otro módulo puede importar **esto** y nada más: `@/features/cases`, nunca
 * `@/features/cases/components/...`. Lo que no está acá adentro es asunto
 * interno del módulo y puede cambiar sin avisarle a nadie.
 *
 * Existe porque Registrar acto procesal (`proceedings/`) muestra la causa con
 * el mismo encabezado y la misma barra de prescripción que el detalle, y
 * nombra su estado igual: "Sin acto procesal" mientras no tenga ninguno. Publica
 * también `useCase` y las claves de caché (`casesKeys`): el acto cambia el
 * estado de la causa y tiene que invalidarlas.
 */

export { useCase } from './api/useCase'
export { casesKeys } from './api/cases.keys'

export { CaseHeader } from './components/CaseHeader'
export { PrescriptionBar } from './components/PrescriptionBar'
export { nearestQualification } from './utils/prescription'
export { PROCEDURAL_ROLE_LABELS, type Case, type CaseState } from './types/case'
