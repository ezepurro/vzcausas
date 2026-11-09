import { useState } from 'react'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import type { SelectOption } from '@/shared/components/forms'
import { formatClientName, formatDocument } from '@/features/clients'
import { lawyerLabel, useLawyers } from '@/features/lawyers'
import { formatPrescription, useLegalQualifications } from '@/features/legal-params'
/* Sólo tipos: la forma de lo que el hook le arma al diálogo. Es la única
   flecha de `api/` hacia `components/` del módulo (ver cases/CAMBIOS.md). */
import type { CaseEditFormProps } from '@/features/cases/components/CaseEditForm'
import type { SelectedQualification } from '@/features/cases/components/LegalQualificationPicker'
import { isValid, validateCase, type CaseFormErrors } from '@/features/cases/schemas/case.schema'
import type { Case, CaseFormValues } from '@/features/cases/types/case'
import { buildCasePatch } from '@/features/cases/utils/buildCasePatch'
import { caseToFormValues, changeEditSacNumber } from '@/features/cases/utils/caseForm'
import { buildLawyerOptions } from '@/features/cases/utils/lawyerOptions'
import { toFormErrors } from '@/features/cases/utils/toFormErrors'
import { useUpdateCase } from './useUpdateCase'

/** Los selects de "Modificar causa" necesitan todo junto, no paginado: 100 es el tope del contrato. */
const OPTIONS_LIMIT = 100

/** El aviso de "Modificar causa", del prototipo. */
const CASE_UPDATED = 'Causa actualizada. El cambio queda asentado con usuario y fecha.'

/** El diálogo abierto, con sus valores y sus errores. */
interface EditDialogState {
    values: CaseFormValues
    errors: CaseFormErrors
}

/**
 * "Modificar causa" (HU19): todo lo que necesita `CaseEditForm`, para abrirlo
 * desde cualquier pantalla de la causa. Lo usan el detalle y "Generar
 * expediente" ("Modificá los datos de la causa", HU25).
 *
 * La pantalla llama a `open()` y dibuja `<CaseEditForm {...form} />` mientras
 * `form` no sea `null`. Al guardar, `useUpdateCase` reemplaza el detalle de la
 * causa, y con él lo que cuelga de él (la carátula, la línea de vida).
 */
export function useCaseEdit(c: Case) {
    const toast = useToast()
    const { lawyer: myLawyer } = useCurrentUser()
    const updateCase = useUpdateCase(c.id)
    const [dialog, setDialog] = useState<EditDialogState | null>(null)

    /* Las opciones de "Modificar causa" se piden con la pantalla y no al abrir
       el diálogo: así las listas ya están cuando se abre. */
    const lawyersQuery = useLawyers({ page: 1, limit: OPTIONS_LIMIT })
    const qualificationsQuery = useLegalQualifications({ page: 1, limit: OPTIONS_LIMIT })
    const lawyers = lawyersQuery.data?.data ?? []
    const qualifications = qualificationsQuery.data?.data ?? []

    /** "Modificar causa" arranca con los datos de la causa abierta (HU19). */
    function open() {
        setDialog({ values: caseToFormValues(c), errors: {} })
    }

    /** Cambia los valores del diálogo; cerrado no hace nada. */
    function changeValues(change: (values: CaseFormValues) => CaseFormValues) {
        setDialog((d) => (d === null ? d : { ...d, values: change(d.values) }))
    }

    /* ---------------- opciones ---------------- */

    /* El cliente no se modifica (D-111): se muestra el de la causa. */
    const clientLabel = `${formatClientName(c.client)} · ${formatDocument(c.client)}`

    /* Si quien modifica es abogado, su ficha va primero, con "(asignarme a mí)"
       (`buildLawyerOptions`). El responsable de la causa se ofrece siempre,
       aunque el listado no lo traiga: la causa lo tiene, y el select no puede
       quedar sin la opción elegida. Va después de la ficha propia. */
    const lawyerOptions = buildLawyerOptions(lawyers, myLawyer?.id ?? null)
    if (!lawyers.some((item) => item.id === c.responsibleLawyer.id)) {
        const mineFirst = lawyerOptions[0]?.value === String(myLawyer?.id)
        lawyerOptions.splice(mineFirst ? 1 : 0, 0, {
            value: String(c.responsibleLawyer.id),
            label: lawyerLabel(c.responsibleLawyer),
        })
    }

    const editValues = dialog?.values ?? null

    /** Una calificación ya elegida deja de ofrecerse: no puede repetirse (D-28). */
    const chosen = new Set(editValues?.legalQualifications.map((q) => q.legalQualificationId) ?? [])
    const qualificationOptions: SelectOption[] = qualifications
        .filter((q) => !chosen.has(q.id))
        .map((q) => ({ value: String(q.id), label: `${q.name} · ${formatPrescription(q.prescriptionMonths)}` }))

    /* El nombre y el plazo de cada elegida salen de la causa —una dada de baja
       sigue siendo parte de ella— o, si se agregó en el diálogo, del listado. */
    const qualificationsLoaded = qualificationsQuery.isSuccess && !qualificationsQuery.isPlaceholderData
    const selectedQualifications: SelectedQualification[] = (editValues?.legalQualifications ?? [])
        .map((chosenQ): SelectedQualification | null => {
            const q = c.legalQualifications.find((item) => item.id === chosenQ.legalQualificationId)
                ?? qualifications.find((item) => item.id === chosenQ.legalQualificationId)
            if (q) {
                // D-113: una declarada prescripta queda fija (CA-33.18).
                const declaration = 'prescriptionDeclaration' in q ? q.prescriptionDeclaration : null
                return {
                    id: q.id,
                    name: q.name,
                    prescriptionMonths: q.prescriptionMonths,
                    offenseDate: chosenQ.offenseDate,
                    ...(declaration ? { prescribedOn: declaration.prescriptionDate } : {}),
                }
            }
            if (qualificationsLoaded) return { id: chosenQ.legalQualificationId, unavailable: true, offenseDate: chosenQ.offenseDate }
            return null
        })
        .filter((q): q is SelectedQualification => q !== null)

    function addQualification(id: number) {
        changeValues((values) => ({
            ...values,
            legalQualifications: [...values.legalQualifications, { legalQualificationId: id, offenseDate: '' }],
        }))
    }

    function removeQualification(id: number) {
        changeValues((values) => ({
            ...values,
            legalQualifications: values.legalQualifications.filter((q) => q.legalQualificationId !== id),
        }))
    }

    function changeOffenseDate(id: number, offenseDate: string) {
        changeValues((values) => ({
            ...values,
            legalQualifications: values.legalQualifications.map((q) =>
                q.legalQualificationId === id ? { ...q, offenseDate } : q,
            ),
        }))
    }

    /* ---------------- guardar ---------------- */

    /* Un SAC repetido es un `409`, pero el problema es de un campo: va en el
       campo. Un 400 con detalle se marca en sus campos; el resto (el 422 de
       una causa prescripta) va al aviso, con el mensaje del servidor. */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error
        if (error.is('CASE_SAC_ALREADY_EXISTS')) {
            setDialog((d) => (d === null ? d : { ...d, errors: { sacNumber: error.message } }))
            return
        }
        if (error.isValidation) {
            // Sólo los campos que el diálogo muestra.
            const fieldErrors = toFormErrors(error.details)
            if (Object.keys(fieldErrors).length > 0) {
                setDialog((d) => (d === null ? d : { ...d, errors: fieldErrors }))
                return
            }
            // Un 400 sin ningún campo que marcar no puede quedar mudo.
        }
        toast('error', error.message)
    }

    /**
     * Viaja sólo lo que cambió (CA-19.2). Si no cambió nada, el diálogo se
     * cierra sin llamar al servidor y sin aviso: nunca sale un `PATCH` vacío.
     * Se pregunta antes de validar, así un dato viejo que no cumpla una regla
     * nueva no impide cerrar un diálogo que no tocó nadie.
     */
    function submit(values: CaseFormValues) {
        const patch = buildCasePatch(c, values)
        if (Object.keys(patch).length === 0) {
            setDialog(null)
            return
        }
        const errors = validateCase(values)
        setDialog({ values, errors })
        if (!isValid(errors)) return
        updateCase.mutate(patch, {
            onSuccess: () => {
                toast('success', CASE_UPDATED)
                setDialog(null)
            },
            onError: handleApiError,
        })
    }

    const form: CaseEditFormProps | null = dialog && {
        sub: c.sacNumber ? `SAC ${c.sacNumber}` : 'Sin N° de SAC',
        values: dialog.values,
        errors: dialog.errors,
        onChange: (key, value) => changeValues((values) => ({ ...values, [key]: value })),
        onSacNumberChange: (sacNumber) => changeValues((values) => changeEditSacNumber(values, sacNumber, c.startDate)),
        clientLabel,
        lawyerOptions,
        selectedQualifications,
        qualificationOptions,
        onAddQualification: addQualification,
        onRemoveQualification: removeQualification,
        onOffenseDateChange: changeOffenseDate,
        saving: updateCase.isPending,
        onConfirm: () => submit(dialog.values),
        onCancel: () => setDialog(null),
    }

    return { open, form }
}
