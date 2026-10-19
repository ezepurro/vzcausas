import type {
    DeclarePrescriptionBody,
    PrescriptionDeclarationFormValues,
} from '@/features/cases/types/prescriptionDeclaration'

/** Del modal al cuerpo de la marca: recorta espacios y un fundamento vacío no viaja. */
export function toDeclarePrescriptionBody(values: PrescriptionDeclarationFormValues): DeclarePrescriptionBody {
    const grounds = values.grounds.trim()
    return {
        prescriptionDate: values.prescriptionDate,
        resolution: values.resolution.trim(),
        ...(grounds ? { grounds } : {}),
    }
}
