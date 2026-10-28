import type { Jurisdiction } from '@/features/legal-params'

/**
 * El campo es el mismo en los dos fueros (`subjectMatter`, V3 D-27); lo que
 * cambia es cómo lo llama el estudio y el ejemplo que orienta al que carga.
 * Lo usan el alta y "Modificar causa".
 */
export const SUBJECT_MATTER_TEXT: Record<Exclude<Jurisdiction, 'CRIMINAL'>, { label: string; placeholder: string }> = {
    ADMINISTRATIVE: {
        label: 'Objeto del reclamo',
        placeholder:
            'Ej. Se deje sin efecto la sanción de cesantía dispuesta por el Tribunal de Conducta Policial y se reincorpore al agente…',
    },
    AMPARO: {
        label: 'Objeto del amparo',
        placeholder:
            'Ej. Se ordene a APROSS la cobertura integral del tratamiento prescripto, denegada por resolución del…',
    },
}