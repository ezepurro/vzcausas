import { useState } from 'react';
import { isApiError } from '@/shared/api/ApiError';
import { useToast } from '@/app/providers/ToastContext';
import { Button, Icon, PageHeader, Panel, SearchInput, Tabs } from '@/shared/components/ui';
import { useProceduralStates } from '@/features/legal-params/api/useProceduralStates';
import { useProceduralStateCycle } from '@/features/legal-params/api/useProceduralStateCycle';
import { useCreateProceduralState } from '@/features/legal-params/api/useCreateProceduralState';
import { useUpdateProceduralState } from '@/features/legal-params/api/useUpdateProceduralState';
import { useDeleteProceduralState } from '@/features/legal-params/api/useDeleteProceduralState';
import {
    JURISDICTION_LABELS,
    JURISDICTIONS,
    POSITION_LAST,
    type Jurisdiction,
    type ProceduralState,
    type ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';
import {
    validateProceduralState,
    type ProceduralStateErrors,
} from '@/features/legal-params/schemas/proceduralState.schema';
import { toCreateProceduralStateBody } from '@/features/legal-params/utils/toCreateProceduralStateBody';
import {
    buildProceduralStatePatch,
    isEmptyPatch,
} from '@/features/legal-params/utils/buildProceduralStatePatch';
import {
    buildPositionOptions,
    currentPositionChoice,
    siblingsOf,
} from '@/features/legal-params/utils/positionOptions';
import { hasNoFieldErrors, toFormErrors } from '@/features/legal-params/utils/toFormErrors';
import { ProceduralStatesTable } from '@/features/legal-params/components/ProceduralStatesTable';
import { ProceduralStateFormModal } from '@/features/legal-params/components/ProceduralStateFormModal';
import { DeleteProceduralStateModal } from '@/features/legal-params/components/DeleteProceduralStateModal';
import { Pagination } from '@/features/legal-params/components/Pagination';

const LIMIT = 20;

/**
 * Las lengüetas son los fueros, sin "Todos".
 *
 * El ciclo de vida es por fuero: mezclarlos pondría tres veces la posición 1 en
 * la misma tabla y el orden dejaría de querer decir algo.
 */
const JURISDICTION_TABS = JURISDICTIONS.map((j) => ({ id: j, label: JURISDICTION_LABELS[j] }));

/**
 * Qué modal está abierto y con qué registro: UN estado, no tres booleanos
 * que se pueden contradecir entre sí.
 */
type Modal =
    | { kind: 'create' }
    | { kind: 'edit'; state: ProceduralState }
    | { kind: 'delete'; state: ProceduralState }
    | null;

const EMPTY_FORM: ProceduralStateFormValues = {
    name: '',
    positionChoice: POSITION_LAST,
    timeLimitDays: '',
    dayType: 'BUSINESS',
    terminal: false,
};

export function ProceduralStatesPage() {
    const toast = useToast();

    /* Filtros y paginado viven acá y se le pasan al hook: `DataTable` no
       pagina ni filtra, y los parámetros tienen que estar en la clave de caché. */
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(JURISDICTIONS[0]);

    const [modal, setModal] = useState<Modal>(null);
    const [values, setValues] = useState<ProceduralStateFormValues>(EMPTY_FORM);
    const [errors, setErrors] = useState<ProceduralStateErrors>({});
    /* Si el usuario no tocó el select de posición, la edición no manda
       `position`: mover el estado tiene que ser algo que se pidió, no el efecto
       secundario de haber abierto el modal para corregir un nombre. */
    const [positionTouched, setPositionTouched] = useState(false);

    const query = useProceduralStates({
        page,
        limit: LIMIT,
        search: search.trim() === '' ? undefined : search.trim(),
        jurisdiction,
    });

    /* El select de posición necesita el ciclo entero del fuero, no la página
       que se ve: está paginada y filtrada por el buscador. */
    const formOpen = modal?.kind === 'create' || modal?.kind === 'edit';
    const cycleQuery = useProceduralStateCycle(jurisdiction);
    const cycle = cycleQuery.data?.data ?? [];
    const siblings = siblingsOf(cycle, modal?.kind === 'edit' ? modal.state.id : undefined);

    const create = useCreateProceduralState();
    const update = useUpdateProceduralState();
    const remove = useDeleteProceduralState();

    const rows = query.data?.data ?? [];
    const pagination = query.data?.pagination;
    const saving = create.isPending || update.isPending || remove.isPending;

    /* ---------------- filtros ---------------- */

    function changeSearch(value: string) {
        setSearch(value);
        // Al cambiar un filtro se vuelve a la primera página: si no, se puede
        // quedar parado en la página 3 de un resultado que ahora tiene una.
        setPage(1);
    }

    function changeJurisdiction(value: Jurisdiction) {
        setJurisdiction(value);
        setPage(1);
    }

    /* ---------------- modales ---------------- */

    function openCreate() {
        setValues(EMPTY_FORM);
        setErrors({});
        setPositionTouched(false);
        setModal({ kind: 'create' });
    }

    function openEdit(state: ProceduralState) {
        setValues({
            name: state.name,
            // El lugar actual se nombra por el estado anterior, no por el
            // número: si alguien reordena el ciclo mientras el modal está
            // abierto, "después de X" sigue queriendo decir lo mismo.
            positionChoice: currentPositionChoice(state, siblingsOf(cycle, state.id)),
            timeLimitDays: String(state.timeLimitDays),
            dayType: state.dayType,
            terminal: state.terminal,
        });
        setErrors({});
        setPositionTouched(false);
        setModal({ kind: 'edit', state });
    }

    function closeModal() {
        setModal(null);
    }

    /**
     * Un cambio en el formulario.
     *
     * El plazo y el tipo de día son un solo dato con dos controles: el contrato
     * exige `NONE` si y sólo si el plazo es 0. En vez de dejar que el usuario
     * arme una combinación que el backend va a rechazar, el tipo de día se
     * acomoda solo cuando el plazo cruza el 0 (y el campo se esconde).
     */
    function changeValue(k: string, v: string | boolean) {
        if (k === 'positionChoice') setPositionTouched(true);
        setValues((current) => {
            const next = { ...current, [k]: v };
            if (k === 'timeLimitDays') {
                const opensNoTimeLimit = String(v).trim() === '0';
                if (opensNoTimeLimit) next.dayType = 'NONE';
                else if (current.dayType === 'NONE') next.dayType = 'BUSINESS';
            }
            return next;
        });
    }

    /* ---------------- errores del servidor ---------------- */

    /**
     * Los errores llegan siempre como `ApiError`. Se ramifica por código y por
     * los getters, nunca comparando `e.message`, y para mostrar se usa
     * `e.message`, que ya viene en castellano.
     */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error;

        // Es un 409, pero es el problema de UN campo: va en el campo, no en
        // un aviso suelto.
        if (error.is('PROCEDURAL_STATE_ALREADY_EXISTS')) {
            setErrors({ name: error.message });
            return;
        }

        if (error.isValidation) {
            // Los nombres del contrato no son los del formulario: `position` es
            // un número allá y un select acá.
            const fieldErrors = toFormErrors(error.details);
            if (!hasNoFieldErrors(fieldErrors)) {
                setErrors(fieldErrors);
                return;
            }
            // Un 400 sin ningún campo que marcar —o con campos que la pantalla
            // no muestra— no puede quedar mudo.
        }

        toast('error', error.message);
    }

    /* ---------------- alta y edición ---------------- */

    function submitForm() {
        const found = validateProceduralState(values, siblings);
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        if (modal?.kind === 'create') {
            create.mutate(toCreateProceduralStateBody(values, jurisdiction, siblings), {
                onSuccess: (state) => {
                    toast(
                        'success',
                        `Estado "${state.name}" agregado al fuero ${JURISDICTION_LABELS[state.jurisdiction]}, en la posición ${state.position}.`,
                    );
                    closeModal();
                },
                onError: handleApiError,
            });
            return;
        }

        if (modal?.kind === 'edit') {
            const patch = buildProceduralStatePatch(modal.state, values, siblings, positionTouched);

            // El contrato responde 400 a un PATCH vacío, así que si no cambió
            // nada ni se manda: se cierra y listo.
            if (isEmptyPatch(patch)) {
                closeModal();
                return;
            }

            update.mutate(
                { id: modal.state.id, body: patch },
                {
                    onSuccess: (state) => {
                        toast('success', `Estado "${state.name}" actualizado.`);
                        closeModal();
                    },
                    onError: handleApiError,
                },
            );
        }
    }

    /* ---------------- eliminación ---------------- */

    function confirmDelete() {
        if (modal?.kind !== 'delete') return;
        const { state } = modal;

        remove.mutate(state.id, {
            onSuccess: () => {
                // `info` y no `success`: salió bien, pero no es un logro.
                toast('info', `Estado "${state.name}" eliminado del fuero ${JURISDICTION_LABELS[state.jurisdiction]}.`);
                closeModal();
                // Si era la única fila de la página, no dejar al usuario en una
                // página que ya no existe.
                if (rows.length === 1 && page > 1) setPage(page - 1);
            },
            onError: (error) => {
                // Acá no hay campos que marcar: el 409 de dependencias es del
                // registro entero.
                if (isApiError(error)) toast('error', error.message);
                closeModal();
            },
        });
    }

    /* ---------------- pantalla ---------------- */

    const jurisdictionLabel = JURISDICTION_LABELS[jurisdiction];

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Estados y plazos"
                sub="Administración de términos y etapas. Esta sección rige el cálculo de vencimientos. El ciclo de vida de cada fuero se compone de estados procesales secuenciales, donde se define el orden, el plazo otorgado y la modalidad de los días (hábiles o corridos)."
            />

            <Tabs
                tabs={JURISDICTION_TABS}
                active={jurisdiction}
                onChange={changeJurisdiction}
            />

            <Panel
                title={`Ciclo de vida del fuero ${jurisdictionLabel}`}
                sub="Los estados se listan en el orden en que recorre la causa. El primer estado es el que abre la causa, y el último es el que la cierra."
                actions={
                    <>
                        <SearchInput
                            placeholder="Buscar estado"
                            aria-label="Buscar estado procesal"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                        />
                        <Button
                            icon={<Icon name="plus" />}
                            size="md"
                            onClick={openCreate}
                        >
                            Registrar estado
                        </Button>
                    </>
                }
                footer={
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        onChange={setPage}
                    />
                }
            >
                {query.isPending ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">Cargando estados…</div>
                    </div>
                ) : query.isError ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">No se pudieron cargar los estados</div>
                        <div className="vz-empty__text">
                            {isApiError(query.error)
                                ? query.error.message
                                : 'Ocurrió un error inesperado.'}
                        </div>
                    </div>
                ) : (
                    <ProceduralStatesTable
                        rows={rows}
                        onEdit={openEdit}
                        onDelete={(state) => setModal({ kind: 'delete', state })}
                        empty={
                            <div className="vz-empty">
                                <div className="vz-empty__title">Sin estados procesales</div>
                                <div className="vz-empty__text">
                                    No hay estados que coincidan con la búsqueda en este fuero.
                                </div>
                            </div>
                        }
                    />
                )}
            </Panel>

            {formOpen && (
                <ProceduralStateFormModal
                    mode={modal.kind}
                    sub={
                        modal.kind === 'edit'
                            ? `${modal.state.name} · fuero ${jurisdictionLabel}`
                            : `Ciclo de vida del fuero ${jurisdictionLabel}`
                    }
                    values={values}
                    errors={errors}
                    positionOptions={buildPositionOptions(siblings)}
                    saving={saving}
                    onChange={changeValue}
                    onConfirm={submitForm}
                    onCancel={closeModal}
                />
            )}

            {modal?.kind === 'delete' && (
                <DeleteProceduralStateModal
                    state={modal.state}
                    saving={saving}
                    onConfirm={confirmDelete}
                    onCancel={closeModal}
                />
            )}
        </>
    );
}
