import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useToast } from '@/app/providers/ToastContext'
import { useGoBack } from '@/app/router/useGoBack'
import { isApiError } from '@/shared/api/ApiError'
import { Breadcrumbs, Button, Modal, PageHeader } from '@/shared/components/ui'
import { useFocusFirstError } from '@/shared/hooks/useFocusFirstError'
import type { SelectOption } from '@/shared/components/forms'
import { formatPersonName } from '@/shared/lib/personName'
import {
    ClientFormModal,
    formatClientName,
    formatDocument,
    isValidClient,
    toClientFormErrors,
    toCreateClientBody,
    useClients,
    useCreateClient,
    validateClient,
    type ClientFormErrors,
    type Client,
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
    toLegalQualificationFormErrors,
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
import type {
    AvailableQualification,
    SelectedQualification,
} from '@/features/cases/components/LegalQualificationPicker'
import { isValid, validateCase, type CaseFormErrors } from '@/features/cases/schemas/case.schema'
import type { CaseFormValues } from '@/features/cases/types/case'
import { changeCreateFolder, changeJurisdiction, changeSacNumber, emptyCaseForm } from '@/features/cases/utils/caseForm'
import { clearCaseDraft, readCaseDraft, writeCaseDraft } from '@/features/cases/utils/caseDraft'
import { folderFailed, folderNoticeSuffix, folderPathPreview } from '@/features/cases/utils/caseFolder'
import { buildLawyerOptions } from '@/features/cases/utils/lawyerOptions'
import { INITIAL_STATE_LABEL } from '@/features/cases/utils/caseState'
import { estimatedExpiry } from '@/features/cases/utils/prescription'
import { suggestedCaption } from '@/features/cases/utils/suggestedCaption'
import { toCreateCaseBody } from '@/features/cases/utils/toCreateCaseBody'
import { toFormErrors } from '@/features/cases/utils/toFormErrors'

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
 *
 * Lo cargado se guarda como borrador mientras se escribe (`caseDraft`): quien
 * se va a otra pantalla y vuelve elige si lo recupera. No sale del prototipo
 * ni de HU18; ver `cases/CAMBIOS.md`.
 */

/** Los selects necesitan todo junto, no paginado: 100 es el tope del contrato. */
const OPTIONS_LIMIT = 100

const EMPTY_CLIENT: ClientFormValues = {
    lastName: '',
    firstName: '',
    documentType: 'DNI',
    documentNumber: '',
    address: '',
    phone: '',
    email: '',
}
const EMPTY_QUALIFICATION: LegalQualificationFormValues = { name: '', years: '', months: '0' }

/** Qué modal está abierto: un solo estado, no dos booleanos que se contradicen. */
type ModalState =
    | { kind: 'draft'; draft: CaseFormValues }
    | { kind: 'client' }
    | { kind: 'qualification' }
    | null

export function RegisterCasePage() {
    const navigate = useNavigate()
    const toast = useToast()
    const { id: userId, lawyer: myLawyer } = useCurrentUser()

    const [values, setValues] = useState<CaseFormValues>(emptyCaseForm)
    const [errors, setErrors] = useState<CaseFormErrors>({})
    /* El cliente registrado desde "Registrar cliente nuevo": el listado trae
       sólo los primeros 100 por apellido, y puede no estar entre ellos. */
    const [createdClient, setCreatedClient] = useState<Client | null>(null)
    /* Si quedó un borrador, lo primero es preguntar qué hacer con él. */
    const [modal, setModal] = useState<ModalState>(() => {
        const draft = readCaseDraft(userId)
        return draft ? { kind: 'draft', draft } : null
    })
    const formRef = useRef<HTMLDivElement>(null)

    /* Cada cambio queda en el borrador. Mientras se pregunta por uno no: el
       formulario todavía vacío lo borraría antes de que se elija. */
    const askingForDraft = modal?.kind === 'draft'
    useEffect(() => {
        if (!askingForDraft) writeCaseDraft(userId, values)
    }, [askingForDraft, userId, values])

    /* El que confirma está abajo, junto al botón: si hay errores, sean de
       `validateCase` o del servidor, se lo lleva al primero. */
    const focusErrors = useFocusFirstError(formRef, errors)

    const clientsQuery = useClients({ page: 1, limit: OPTIONS_LIMIT })
    const lawyersQuery = useLawyers({ page: 1, limit: OPTIONS_LIMIT })
    const qualificationsQuery = useLegalQualifications({ page: 1, limit: OPTIONS_LIMIT })

    const listedClients = clientsQuery.data?.data ?? []
    /* Sin esto, un cliente nuevo que cae fuera de la primera página queda
       elegido en `values.clientId` pero sin opción en el select ni en el resumen. */
    const clients = createdClient && !listedClients.some((c) => c.id === createdClient.id)
        ? [...listedClients, createdClient]
        : listedClients
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

    /** Cancelar o volver por la miga es "no la voy a cargar": se va el borrador. */
    function goToList() {
        clearCaseDraft(userId)
        navigate('/causas')
    }

    /* La flecha también: vuelve a donde estaba, que puede no ser el listado
       (el botón "Registrar causa" del rail está en todas las pantallas). */
    const goBack = useGoBack('/causas')
    function back() {
        clearCaseDraft(userId)
        goBack()
    }

    /* ---------------- opciones de los selects ---------------- */

    const clientOptions: SelectOption[] = clients.map((c) => ({
        value: String(c.id),
        label: `${formatClientName(c)} · ${formatDocument(c)}`,
    }))

    /* Si quien registra es abogado, su ficha va primero, con "(asignarme a mí)". */
    const lawyerOptions: SelectOption[] = buildLawyerOptions(lawyers, myLawyer?.id ?? null)

    /** Una calificación ya elegida deja de ofrecerse: no puede repetirse (D-28). */
    const chosen = new Set(values.legalQualifications.map((q) => q.legalQualificationId))
    const qualificationOptions: SelectOption[] = qualifications
        .filter((q) => !chosen.has(q.id))
        .map((q) => ({
            value: String(q.id),
            label: `${q.name} · ${formatPrescription(q.prescriptionMonths)}`,
        }))

    /* Recién con el listado completo se puede decir que una calificación no
       está: mientras carga, o mientras muestra el de antes, faltarían todas. */
    const qualificationsLoaded = qualificationsQuery.isSuccess && !qualificationsQuery.isPlaceholderData

    /**
     * Las calificaciones elegidas, con su nombre y su plazo: se arma cruzando
     * lo que guarda el formulario con lo que devolvió el listado. Una recién
     * registrada aparece en cuanto llega el `GET` que invalidó su alta.
     *
     * Una elegida que el listado ya no trae se dio de baja (o venía en un
     * borrador): queda como fila "dada de baja", para que se pueda quitar.
     */
    const selectedQualifications: SelectedQualification[] = values.legalQualifications
        .map((chosenQ): SelectedQualification | null => {
            const q = qualifications.find((item) => item.id === chosenQ.legalQualificationId)
            if (q) return { id: q.id, name: q.name, prescriptionMonths: q.prescriptionMonths, offenseDate: chosenQ.offenseDate }
            if (qualificationsLoaded) return { id: chosenQ.legalQualificationId, unavailable: true, offenseDate: chosenQ.offenseDate }
            return null
        })
        .filter((q): q is SelectedQualification => q !== null)
    const availableQualifications = selectedQualifications.filter(
        (q): q is AvailableQualification => !q.unavailable,
    )

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
        qualificationNames: availableQualifications.map((q) => shortQualificationName(q.name)),
        counterparty: values.counterparty,
    })

    /* Cada calificación computa su prescripción desde su fecha del hecho (D-19):
       la de inicio de la causa no interviene. Fuera del penal, `null`. Una dada
       de baja no tiene plazo que mostrar. */
    const prescriptions: SummaryPrescription[] | null = criminal
        ? availableQualifications.map((q) => ({
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
        if (error.isValidation) {
            const fieldErrors = toFormErrors(error.details)
            if (!isValid(fieldErrors)) {
                setErrors(fieldErrors)
                return
            }
            // Un 400 sin ningún campo que marcar —o con campos que el
            // formulario no muestra— no puede quedar mudo.
        }

        toast('error', error.message)
    }

    function submit() {
        focusErrors()
        const found = validateCase(values)
        /* Una dada de baja no tiene campo de fecha: si quedó sin ella, el
           mensaje de `validateCase` pediría algo que no se puede cargar. Lo que
           hay que hacer es quitarla, y lo mismo diría el backend (CA-18.10). */
        if (selectedQualifications.some((q) => q.unavailable)) {
            found.legalQualifications = 'Quitá la calificación dada de baja: ya no está vigente.'
        }
        setErrors(found)
        if (!isValid(found)) return

        create.mutate(toCreateCaseBody(values), {
            onSuccess: (registered) => {
                clearCaseDraft(userId)
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
                // Reemplaza el alta: la flecha del detalle no vuelve a un formulario ya guardado.
                navigate(`/causas/${registered.id}`, { replace: true })
            },
            onError: handleApiError,
        })
    }

    /* ---------------- pantalla ---------------- */

    return (
        <>
            <Breadcrumbs
                items={[{ label: 'Causas', onClick: goToList }, { label: 'Registrar causa' }]}
                onBack={back}
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

            {modal?.kind === 'draft' && (
                <RecoverDraft
                    onRecover={() => {
                        setValues(modal.draft)
                        setModal(null)
                    }}
                    onDiscard={() => {
                        clearCaseDraft(userId)
                        setModal(null)
                    }}
                />
            )}
            {modal?.kind === 'client' && (
                <NewClient
                    onDone={(created) => {
                        setCreatedClient(created)
                        changeValue('clientId', String(created.id))
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

/**
 * "¿Recuperar la causa?": se contesta con uno de los dos botones y con nada
 * más. Por eso no es un `FormModal`, que cierra con Escape o con un click en
 * el fondo llamando a `onCancel`: acá eso sería borrar el borrador sin querer.
 * `onClose` no hace nada a propósito.
 */
function RecoverDraft({ onRecover, onDiscard }: { onRecover: () => void; onDiscard: () => void }) {
    return (
        <Modal
            title="Tenés una causa sin terminar"
            sub="Quedó cargada la última vez que saliste de esta pantalla sin registrarla."
            width="sm"
            onClose={() => {}}
            footer={
                <>
                    <Button variant="secondary" onClick={onDiscard}>Empezar de nuevo</Button>
                    <Button onClick={onRecover}>Recuperar</Button>
                </>
            }
        >
            <p>¿Querés recuperar lo que habías cargado?</p>
        </Modal>
    )
}

/** "Registrar cliente nuevo": el modal de `clients`, que ya trae su modo `fromCase`. */
function NewClient({ onDone, onCancel }: { onDone: (client: Client) => void; onCancel: () => void }) {
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
                onDone(client)
            },
            onError: (error) => {
                if (!isApiError(error)) throw error
                if (error.is('CLIENT_DNI_ALREADY_EXISTS')) {
                    setErrors({ documentNumber: error.message })
                    return
                }
                if (error.isValidation) {
                    const fieldErrors = toClientFormErrors(error.details)
                    if (!isValidClient(fieldErrors)) {
                        setErrors(fieldErrors)
                        return
                    }
                    // Un 400 sin ningún campo que marcar no puede quedar mudo.
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
                if (error.isValidation) {
                    /* El servidor informa el plazo como `prescriptionMonths` y el
                       formulario lo pide en años y meses: el mapa lo lleva a los años. */
                    const fieldErrors = toLegalQualificationFormErrors(error.details)
                    if (!isValidLegalQualification(fieldErrors)) {
                        setErrors(fieldErrors)
                        return
                    }
                    // Un 400 sin ningún campo que marcar no puede quedar mudo.
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
