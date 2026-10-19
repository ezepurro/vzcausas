/**
 * Marcar la causa como prescripta (HU33, V4 §3.7).
 *
 * Es una acción manual, con la resolución que la declara (D-52): el sistema
 * avisa cuando el plazo se cumple, pero no cambia el estado de la causa. Lo
 * que queda guardado en la causa es su `prescriptionDeclaration`, que está en
 * `case.ts` porque es parte del recurso.
 */

/** Cuerpo del `POST /cases/{caseId}/prescription`. */
export interface DeclarePrescriptionBody {
    prescriptionDate: string
    resolution: string
    grounds?: string
}

/** Los valores del modal "Marcar la causa como prescripta". */
export type PrescriptionDeclarationFormValues = {
    /** "Fecha de la prescripción", `YYYY-MM-DD`. */
    prescriptionDate: string
    /** "Resolución que la declara". */
    resolution: string
    /** "Fundamento (opcional)". */
    grounds: string
}
