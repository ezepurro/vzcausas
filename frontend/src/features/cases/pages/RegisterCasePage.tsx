import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import { Breadcrumbs, PageHeader } from '@/shared/components/ui'
import { useFocusFirstError } from '@/shared/hooks/useFocusFirstError'
import type { SelectOption } from '@/shared/components/forms'
import { formatPersonName } from '@/shared/lib/personName'
import {
    ClientFormModal,
    formatClientName,
    formatDni,
    isValidClient,
    toCreateClientBody,
    useClients,
    useCreateClient,
    validateClient,
    type ClientFormErrors,
    type ClientFormValues,
} from '@/features/clients'
import { useLawyers } from '@/features/lawyers'
import { useDocumentTemplates } from '@/features/documents'
import { useCanAccess } from '@/app/access/useCanAccess'
import {
    formatPrescription,
    isValidLegalQualification,
    LegalQualificationFormModal,
    shortQualificationName,
    toCreateLegalQualificationBody,
    useCreateLegalQualification,
    useLegalQualifications,
    validateLegalQualification,
    JURISDICTION_LABELS,
    type LegalQualificationErrors,
    type LegalQualificationFormValues,
} from '@/features/legal-params'
import { useCreateCase } from '@/features/cases/api/useCreateCase'
import { CaseForm } from '@/features/cases/components/CaseForm'
import {
    CaseSummaryAside,
    type ChecklistItem,
    type SummaryPrescription,
} from '@/features/cases/components/CaseSummaryAside'
import type { SelectedQualification } from '@/features/cases/components/LegalQualificationPicker'
import { isValid, validateCase, type CaseFormErrors } from '@/features/cases/schemas/case.schema'
import type { CaseFormValues } from '@/features/cases/types/case'
import { changeCreateFolder, changeJurisdiction, changeSacNumber, emptyCaseForm } from '@/features/cases/utils/caseForm'
import { folderFailed, folderNoticeSuffix, folderPathPreview } from '@/features/cases/utils/caseFolder'
import { INITIAL_STATE_LABEL } from '@/features/cases/utils/caseState'
import { estimatedExpiry } from '@/features/cases/utils/prescription'
import { suggestedCaption } from '@/features/cases/utils/suggestedCaption'
import { toCreateCaseBody } from '@/features/cases/utils/toCreateCaseBody'

/**
 * Registrar causa (HU18), en `/causas/nueva`.
 *
 * Lo opera cualquier perfil (RN11): el alta no pide permiso. Lo que sí depende
 * del perfil son los dos atajos del formulario, "Registrar cliente nuevo"
 * (Secretaría, D-05) y "Registrar calificación nueva" (Administrador, D-04).
 *
 * La causa nace en el estado inicial de su fuero, "Iniciada", sin vencimiento
 * y sin movimientos en su ciclo de vida (D-34): al guardar se va a su detalle,
 * que es donde se ve eso.
 *
 * Las casillas de la carpeta en Drive y de los modelos del fuero son HU39 y
 * HU40. Cuántos modelos se copian lo ven el Administrador y el Abogado; la
 * Secretaría no consulta modelos (CA-40.10) y no se le pide el número.
 */

/** Los selects necesitan todo junto, no paginado: 100 es el tope del contrato. */
const OPTIONS_LIMIT = 100

const EMPTY_CLIENT: ClientFormValues = { lastName: '', firstName: '', dni: '', phone: '', email: '' }
const EMPTY_QUALIFICATION: LegalQualificationFormValues = { name: '', years: '', months: '0' }

/** Qué modal está abierto: un solo estado, no dos booleanos que se contradicen. */
type Modal = { kind: 'client' } | { kind: 'qualification' } | null

export function RegisterCasePage() {
    const navigate = useNavigate()
    const toast = useToast()

    const [values, setValues] = useState<CaseFormValues>(emptyCaseForm)
    const [errors, setErrors] = useState<CaseFormErrors>({})
    const [modal, setModal] = useState<Modal>(null)
    const formRef = useRef<HTMLDivElement>(null)

    /* El que confirma está abajo, junto al botón: si hay errores, sean de
       `validateCase` o del servidor, se lo lleva al primero. */
    const focusErrors = useFocusFirstError(formRef, errors)

    const clientsQuery = useClients({ page: 1, limit: OPTIONS_LIMIT })
    const lawyersQuery = useLawyers({ page: 1, limit: OPTIONS_LIMIT })
    const qualificationsQuery = useLegalQualifications({ page: 1, limit: OPTIONS_LIMIT })

    const clients = clientsQuery.data?.data ?? []
    const lawyers = lawyersQuery.data?.data ?? []
    const qualifications = qualificationsQuery.data?.data ?? []

    /* "6 modelos parametrizados para el fuero Penal": basta con el total, así
       que se pide uno solo (V4 §3.10, "Cómo lo usa el prototipo"). */
    const canSeeTemplates = useCanAccess('/modelos')
    const templatesQuery = useDocumentTemplates(
        { jurisdiction: values.jurisdiction, copyToNewCases: true, limit: 1 },
        { enabled: canSeeTemplates },
    )
    const templatesCount = canSeeTemplates && !templatesQuery.isPlaceholderData
        ? templatesQuery.data?.pagination.totalItems
        : undefined
    const templatesNote = templatesCount === undefined
        ? null
        : `${templatesCount} ${templatesCount === 1 ? 'modelo parametrizado' : 'modelos parametrizados'} para el fuero ${JURISDICTION_LABELS[values.jurisdiction]}.`

    const create = useCreateCase()
    const goToList = () => navigate('/causas')

    /* ---------------- opciones de los selects ---------------- */

    const clientOptions: SelectOption[] = clients.map((c) => ({
        value: String(c.id),
        label: `${formatClientName(c)} · DNI ${formatDni(c.dni)}`,
    }))

    const lawyerOptions: SelectOption[] = lawyers.map((l) => ({
        value: String(l.id),
        label: `${formatPersonName(l)} · matrícula ${l.registrationNumber}`,
    }))

    /** Una calificación ya elegida deja de ofrecerse: no puede repetirse (D-28). */
    const chosen = new Set(values.legalQualifications.map((q) => q.legalQualificationId))
    const qualificationOptions: SelectOption[] = qualifications
        .filter((q) => !chosen.has(q.id))
        .map((q) => ({
            value: String(q.id),
            label: `${q.name} · ${formatPrescription(q.prescriptionMonths)}`,
        }))

    /**
     * Las calificaciones elegidas, con su nombre y su plazo: se arma cruzando
     * lo que guarda el formulario con lo que devolvió el listado. Una recién
     * registrada aparece en cuanto llega el `GET` que invalidó su alta.
     */
    const selectedQualifications: SelectedQualification[] = values.legalQualifications
        .map((chosenQ) => {
            const q = qualifications.find((item) => item.id === chosenQ.legalQualificationId)
            return q ? { id: q.id, name: q.name, prescriptionMonths: q.prescriptionMonths, offenseDate: chosenQ.offenseDate } : null
        })
        .filter((q): q is SelectedQualification => q !== null)

    /* ---------------- el formulario ---------------- */

    function changeValue<K extends keyof CaseFormValues>(key: K, value: CaseFormValues[K]) {
        setValues((current) => ({ ...current, [key]: value }))
    }

    function addQualification(id: number) {
        setValues((current) => ({
            ...current,
            legalQualifications: [...current.legalQualifications, { legalQualificationId: id, offenseDate: '' }],
        }))
    }

    /** Quitar una calificación se lleva su fecha del hecho: es de esa fila. */
    function removeQualification(id: number) {
        setValues((current) => ({
            ...current,
            legalQualifications: current.legalQualifications.filter((q) => q.legalQualificationId !== id),
        }))
    }

    function changeOffenseDate(id: number, offenseDate: string) {
        setValues((current) => ({
            ...current,
            legalQualifications: current.legalQualifications.map((q) =>
                q.legalQualificationId === id ? { ...q, offenseDate } : q,
            ),
        }))
    }

    /* ---------------- el resumen del alta ---------------- */

    const client = clients.find((c) => String(c.id) === values.clientId) ?? null
    const criminal = values.jurisdiction === 'CRIMINAL'

    const caption = suggestedCaption({
        jurisdiction: values.jurisdiction,
        clientName: client ? formatClientName(client) : null,
        qualificationNames: selectedQualifications.map((q) => shortQualificationName(q.name)),
        counterparty: values.counterparty,
    })

    /* Cada calificación computa su prescripción desde su fecha del hecho (D-19):
       la de inicio de la causa no interviene. Fuera del penal, `null`. */
    const prescriptions: SummaryPrescription[] | null = criminal
        ? selectedQualifications.map((q) => ({
            name: shortQualificationName(q.name),
            term: formatPrescription(q.prescriptionMonths),
            offenseDate: q.offenseDate,
            expiresOn: estimatedExpiry(q.offenseDate, q.prescriptionMonths),
        }))
        : null

    const checklist = buildChecklist(values, selectedQualifications)

    const lawyer = lawyers.find((l) => String(l.id) === values.responsibleLawyerId) ?? null
    const folderPath = folderPathPreview(
        lawyer ? formatPersonName(lawyer) : null,
        JURISDICTION_LABELS[values.jurisdiction],
        values.caption,
    )

    /* ---------------- errores del servidor ---------------- */

    /**
     * Un SAC repetido es un `409`, pero el problema es de un campo: va en el
     * campo, no en un aviso suelto. Un cliente, un abogado o una calificación
     * inexistente o dado de baja llega como `400` con `details`, y sus claves
     * son las del formulario (D-22).
     */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error

        if (error.is('CASE_SAC_ALREADY_EXISTS')) {
            setErrors({ sacNumber: error.message })
            return
        }
        if (error.isValidation && error.hasFieldErrors) {
            setErrors(error.details as CaseFormErrors)
            return
        }

        toast('error', error.message)
    }

    function submit() {
        focusErrors()
        const found = validateCase(values)
        setErrors(found)
        if (!isValid(found)) return

        create.mutate(toCreateCaseBody(values), {
            onSuccess: (registered) => {
                const sac = registered.sacNumber ? `${registered.sacNumber} ` : ''
                const message = `Causa ${sac}registrada. El estado lo fija el primer acto procesal`
                if (folderFailed(registered.folder)) {
                    /* La causa no se pierde (D-60): se registra igual y la
                       carpeta se crea desde el detalle (CA-39.4). */
                    toast('success', `${message}.`)
                    toast('error', 'No se pudo crear la carpeta en Drive. Podés crearla desde el detalle de la causa.')
                } else {
                    toast('success', `${message}${folderNoticeSuffix(registered.folder)}.`)
                }
                navigate(`/causas/${registered.id}`)
            },
            onError: handleApiError,
        })
    }

    /* ---------------- pantalla ---------------- */

    return (
        <>
            <Breadcrumbs
                items={[{ label: 'Causas', onClick: goToList }, { label: 'Registrar causa' }]}
            />
            <PageHeader
                title="Registrar causa"
                sub={`La causa nace en el estado ${INITIAL_STATE_LABEL}. El primer acto procesal que registre el abogado responsable la hace entrar al ciclo de vida del fuero.`}
            />

            <div className="vz-split" ref={formRef}>
                <CaseForm
                    values={values}
                    errors={errors}
                    onChange={changeValue}
                    onSacNumberChange={(sacNumber) =>
                        setValues((current) => changeSacNumber(current, sacNumber))
                    }
                    onJurisdictionChange={(jurisdiction) =>
                        setValues((current) => changeJurisdiction(current, jurisdiction))
                    }
                    onCreateFolderChange={(createFolder) =>
                        setValues((current) => changeCreateFolder(current, createFolder))
                    }
                    templatesNote={templatesNote}
                    clientOptions={clientOptions}
                    lawyerOptions={lawyerOptions}
                    selectedQualifications={selectedQualifications}
                    qualificationOptions={qualificationOptions}
                    onAddQualification={addQualification}
                    onRemoveQualification={removeQualification}
                    onOffenseDateChange={changeOffenseDate}
                    onNewClient={() => setModal({ kind: 'client' })}
                    onNewQualification={() => setModal({ kind: 'qualification' })}
                    saving={create.isPending}
                    onConfirm={submit}
                    onCancel={goToList}
                />
                <aside className="vz-split__aside">
                    <CaseSummaryAside
                        suggestedCaption={caption}
                        onUseCaption={() => caption && changeValue('caption', caption)}
                        captionIsSuggested={caption !== null && values.caption === caption}
                        prescriptions={prescriptions}
                        jurisdictionLabel={JURISDICTION_LABELS[values.jurisdiction]}
                        checklist={checklist}
                        createFolder={values.createFolder}
                        folderPath={folderPath}
                    />
                </aside>
            </div>

            {modal?.kind === 'client' && (
                <NewClient
                    onDone={(id) => {
                        changeValue('clientId', String(id))
                        setModal(null)
                    }}
                    onCancel={() => setModal(null)}
                />
            )}
            {modal?.kind === 'qualification' && (
                <NewQualification
                    onDone={(id) => {
                        addQualification(id)
                        setModal(null)
                    }}
                    onCancel={() => setModal(null)}
                />
            )}
        </>
    )
}

/**
 * "Para poder registrar": los rótulos cambian según el caso, como en el
 * prototipo. El SAC es opcional, y las calificaciones también (D-33); lo que no
 * se puede es elegir una y no cargarle la fecha del hecho, ni informar el SAC
 * sin la fecha de inicio (CA-18.2).
 */
function buildChecklist(
    values: CaseFormValues,
    selected: SelectedQualification[],
): ChecklistItem[] {
    const criminal = values.jurisdiction === 'CRIMINAL'
    const sac = values.sacNumber.trim()
    const sacValid = sac === '' || /^\d{8}$/.test(sac)
    const datesLoaded = selected.every((q) => q.offenseDate !== '')

    const items: ChecklistItem[] = [
        { label: sac ? 'N° de SAC válido y no repetido' : 'N° de SAC: opcional', done: sacValid },
        ...(sac ? [{ label: 'Fecha de inicio cargada', done: values.startDate !== '' }] : []),
        { label: 'Cliente seleccionado', done: values.clientId !== '' },
        {
            label: criminal
                ? selected.length > 0
                    ? 'Fecha del hecho en cada calificación legal'
                    : 'Calificaciones legales: opcionales'
                : 'Calificación legal: no aplica a este fuero',
            done: criminal ? datesLoaded : true,
        },
    ]

    if (!criminal) {
        items.push({
            label: values.jurisdiction === 'AMPARO' ? 'Objeto del amparo redactado' : 'Objeto del reclamo redactado',
            done: values.subjectMatter.trim() !== '',
        })
    }

    items.push(
        { label: 'Carátula cargada', done: values.caption.trim() !== '' },
        { label: 'Abogado responsable asignado', done: values.responsibleLawyerId !== '' },
    )
    return items
}

/** "Registrar cliente nuevo": el modal de `clients`, que ya trae su modo `fromCase`. */
function NewClient({ onDone, onCancel }: { onDone: (id: number) => void; onCancel: () => void }) {
    const toast = useToast()
    const [values, setValues] = useState<ClientFormValues>(EMPTY_CLIENT)
    const [errors, setErrors] = useState<ClientFormErrors>({})
    const create = useCreateClient()

    function submit() {
        const found = validateClient(values)
        setErrors(found)
        if (!isValidClient(found)) return

        create.mutate(toCreateClientBody(values), {
            onSuccess: (client) => {
                toast('success', `Cliente ${formatClientName(client)} registrado.`)
                onDone(client.id)
            },
            onError: (error) => {
                if (!isApiError(error)) throw error
                if (error.is('CLIENT_DNI_ALREADY_EXISTS')) {
                    setErrors({ dni: error.message })
                    return
                }
                if (error.isValidation && error.hasFieldErrors) {
                    setErrors(error.details as ClientFormErrors)
                    return
                }
                toast('error', error.message)
            },
        })
    }

    return (
        <ClientFormModal
            values={values}
            errors={errors}
            fromCase
            saving={create.isPending}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            onConfirm={submit}
            onCancel={onCancel}
        />
    )
}

/** "Registrar calificación nueva": el modal de `legal-params`, en su modo `fromCase`. */
function NewQualification({ onDone, onCancel }: { onDone: (id: number) => void; onCancel: () => void }) {
    const toast = useToast()
    const [values, setValues] = useState<LegalQualificationFormValues>(EMPTY_QUALIFICATION)
    const [errors, setErrors] = useState<LegalQualificationErrors>({})
    const create = useCreateLegalQualification()

    function submit() {
        const found = validateLegalQualification(values)
        setErrors(found)
        if (!isValidLegalQualification(found)) return

        create.mutate(toCreateLegalQualificationBody(values), {
            onSuccess: (qualification) => {
                toast(
                    'success',
                    `Calificación registrada · prescripción ${formatPrescription(qualification.prescriptionMonths)}.`,
                )
                onDone(qualification.id)
            },
            onError: (error) => {
                if (!isApiError(error)) throw error
                if (error.isValidation && error.hasFieldErrors) {
                    setErrors(error.details as LegalQualificationErrors)
                    return
                }
                toast('error', error.message)
            },
        })
    }

    return (
        <LegalQualificationFormModal
            mode="create"
            values={values}
            errors={errors}
            fromCase
            saving={create.isPending}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            onConfirm={submit}
            onCancel={onCancel}
        />
    )
}
