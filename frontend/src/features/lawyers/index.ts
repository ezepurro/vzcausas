/**
 * La cara pública del módulo.
 *
 * Otro módulo puede importar **esto** y nada más: `@/features/lawyers`, nunca
 * `@/features/lawyers/api/...`. Lo que no está acá adentro es asunto interno
 * del módulo y puede cambiar sin avisarle a nadie.
 *
 * Existe porque el abogado se elige desde otras pantallas: el usuario que se
 * vincula a una ficha, y más adelante el abogado responsable de una causa.
 * La alternativa era que cada módulo se escribiera su propio `GET /lawyers`,
 * y entonces el mismo endpoint se mantiene en cuatro lugares.
 */

export { useLawyers } from './api/useLawyers'
export type { Lawyer, LawyerListParams } from './types/lawyer'