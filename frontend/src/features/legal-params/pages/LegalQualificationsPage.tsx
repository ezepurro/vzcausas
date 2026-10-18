import { useState } from 'react';
import { isApiError } from '@/shared/api/ApiError';
import { useToast } from '@/app/providers/ToastContext';
import { Button, Icon, PageHeader, Pagination, Panel, SearchInput } from '@/shared/components/ui';
import { useLegalQualifications } from '@/features/legal-params/api/useLegalQualifications';
import { useCreateLegalQualification } from '@/features/legal-params/api/useCreateLegalQualification';
import { useUpdateLegalQualification } from '@/features/legal-params/api/useUpdateLegalQualification';
import { useDeleteLegalQualification } from '@/features/legal-params/api/useDeleteLegalQualification';
import type {
    LegalQualification,
    LegalQualificationFormValues,
} from '@/features/legal-params/types/legalQualification';
import {
    isValid,
    validateLegalQualification,
    type LegalQualificationErrors,
} from '@/features/legal-params/schemas/legalQualification.schema';
import { formatPrescription, splitPrescription } from '@/features/legal-params/utils/prescription';
import { toCreateLegalQualificationBody } from '@/features/legal-params/utils/toCreateLegalQualificationBody';
import {
    buildLegalQualificationPatch,
    isEmptyLegalQualificationPatch,
} from '@/features/legal-params/utils/buildLegalQualificationPatch';
import { toLegalQualificationFormErrors } from '@/features/legal-params/utils/toLegalQualificationFormErrors';
import { LegalQualificationsTable } from '@/features/legal-params/components/LegalQualificationsTable';
import { LegalQualificationFormModal } from '@/features/legal-params/components/LegalQualificationFormModal';
import { DeleteLegalQualificationModal } from '@/features/legal-params/components/DeleteLegalQualificationModal';

const LIMIT = 20;

const EMPTY_FORM: LegalQualificationFormValues = {
    name: '',
    years: '',
    months: '0',
};

/** Qué modal está abierto y con qué registro: UN estado. */
type Modal =
    | { kind: 'create' }
    | { kind: 'edit'; qualification: LegalQualification }
    | { kind: 'delete'; qualification: LegalQualification }
    | null;

/**
 * Calificaciones legales: el ABMC completo (HU-47 a HU-50), en
 * `/calificaciones-legales`. Lo ven y lo operan los tres perfiles (V3 D-39).
 *
 * Modificar el plazo recalcula la prescripción de las causas que la registran
 * (V4 §3.5): el modal lo avisa. La baja procede aunque haya causas que la usen:
 * esas causas la conservan.
 */
export function LegalQualificationsPage() {
    const toast = useToast();

    /* El paginado y la búsqueda viven acá y se le pasan al hook: `DataTable`
       no pagina ni filtra, y los parámetros tienen que estar en la clave de caché. */
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const [modal, setModal] = useState<Modal>(null);
    const [values, setValues] = useState<LegalQualificationFormValues>(EMPTY_FORM);
    const [errors, setErrors] = useState<LegalQualificationErrors>({});

    const query = useLegalQualifications({
        page,
        limit: LIMIT,
        search: search.trim() === '' ? undefined : search.trim(),
    });
    const create = useCreateLegalQualification();
    const update = useUpdateLegalQualification();
    const remove = useDeleteLegalQualification();

    const rows = query.data?.data ?? [];
    const pagination = query.data?.pagination;
    const searching = search.trim() !== '';
    const saving = create.isPending || update.isPending || remove.isPending;

    /* ---------------- búsqueda ---------------- */

    function changeSearch(value: string) {
        setSearch(value);
        // Al buscar se vuelve a la primera página: si no, se puede quedar
        // parado en la página 3 de un resultado que ahora tiene una.
        setPage(1);
    }

    /* ---------------- modales ---------------- */

    function openCreate() {
        setValues(EMPTY_FORM);
        setErrors({});
        setModal({ kind: 'create' });
    }

    function openEdit(qualification: LegalQualification) {
        setValues({ name: qualification.name, ...splitPrescription(qualification.prescriptionMonths) });
        setErrors({});
        setModal({ kind: 'edit', qualification });
    }

    function closeModal() {
        setModal(null);
    }

    function changeValue(k: string, v: string | boolean) {
        setValues((current) => ({ ...current, [k]: v }));
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
        if (error.is('LEGAL_QUALIFICATION_ALREADY_EXISTS')) {
            setErrors({ name: error.message });
            return;
        }

        if (error.isValidation) {
            const fieldErrors = toLegalQualificationFormErrors(error.details);
            if (!isValid(fieldErrors)) {
                setErrors(fieldErrors);
                return;
            }
            // Un 400 sin ningún campo que marcar no puede quedar mudo.
        }

        toast('error', error.message);
    }

    /* ---------------- alta y modificación ---------------- */

    function submitForm() {
        const found = validateLegalQualification(values);
        setErrors(found);
        if (!isValid(found)) return;

        if (modal?.kind === 'create') {
            create.mutate(toCreateLegalQualificationBody(values), {
                onSuccess: (qualification) => {
                    toast(
                        'success',
                        `Calificación registrada · prescripción ${formatPrescription(qualification.prescriptionMonths)}.`,
                    );
                    closeModal();
                },
                onError: handleApiError,
            });
            return;
        }

        if (modal?.kind === 'edit') {
            const patch = buildLegalQualificationPatch(modal.qualification, values);

            // El contrato responde 400 a un PATCH vacío, así que si no cambió
            // nada ni se manda: se cierra y listo.
            if (isEmptyLegalQualificationPatch(patch)) {
                closeModal();
                return;
            }

            update.mutate(
                { id: modal.qualification.id, body: patch },
                {
                    onSuccess: (qualification) => {
                        toast(
                            'success',
                            `Calificación actualizada · prescripción ${formatPrescription(qualification.prescriptionMonths)}.`,
                        );
                        closeModal();
                    },
                    onError: handleApiError,
                },
            );
        }
    }

    /* ---------------- baja ---------------- */

    function confirmDelete() {
        if (modal?.kind !== 'delete') return;
        const { qualification } = modal;

        remove.mutate(qualification.id, {
            onSuccess: () => {
                // `info` y no `success`: salió bien, pero no es un logro.
                toast('info', `Calificación "${qualification.name}" eliminada.`);
                closeModal();
                // Si era la única fila de la página, no dejar al usuario en
                // una página que ya no existe.
                if (rows.length === 1 && page > 1) setPage(page - 1);
            },
            onError: (error) => {
                // Acá no hay campos que marcar: un rechazo de la baja es del
                // registro entero. Tener causas no la impide (V4 §3.5).
                if (isApiError(error)) toast('error', error.message);
                closeModal();
            },
        });
    }

    /* ---------------- pantalla ---------------- */

    const formOpen = modal?.kind === 'create' || modal?.kind === 'edit';

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Calificaciones legales"
                sub="Cada calificación define el plazo de prescripción de la acción. Una causa penal puede tener varias."
            />

            <Panel
                actions={
                    <>
                        <SearchInput
                            placeholder="Buscar por nombre o artículo"
                            aria-label="Buscar calificación"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                        />
                        <Button icon={<Icon name="plus" />} size="md" onClick={openCreate}>
                            Registrar calificación
                        </Button>
                    </>
                }
                footer={
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        noun={['calificación', 'calificaciones']}
                        onChange={setPage}
                    />
                }
            >
                {query.isPending ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">Cargando calificaciones…</div>
                    </div>
                ) : query.isError ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">No se pudieron cargar las calificaciones</div>
                        <div className="vz-empty__text">
                            {isApiError(query.error)
                                ? query.error.message
                                : 'Ocurrió un error inesperado.'}
                        </div>
                    </div>
                ) : (
                    <LegalQualificationsTable
                        rows={rows}
                        onEdit={openEdit}
                        onDelete={(qualification) => setModal({ kind: 'delete', qualification })}
                        empty={
                            <div className="vz-empty">
                                <div className="vz-empty__title">
                                    {searching
                                        ? 'Ninguna calificación coincide con la búsqueda'
                                        : 'Todavía no hay calificaciones legales'}
                                </div>
                                <div className="vz-empty__text">
                                    {searching
                                        ? 'Probá con otra parte del nombre o con el número de artículo.'
                                        : 'Registrá la primera para poder elegirla al registrar causas penales.'}
                                </div>
                            </div>
                        }
                    />
                )}
            </Panel>

            {formOpen && (
                <LegalQualificationFormModal
                    mode={modal.kind}
                    values={values}
                    errors={errors}
                    activeCases={modal.kind === 'edit' ? modal.qualification.activeCases : 0}
                    saving={saving}
                    onChange={changeValue}
                    onConfirm={submitForm}
                    onCancel={closeModal}
                />
            )}

            {modal?.kind === 'delete' && (
                <DeleteLegalQualificationModal
                    qualification={modal.qualification}
                    saving={saving}
                    onConfirm={confirmDelete}
                    onCancel={closeModal}
                />
            )}
        </>
    );
}
