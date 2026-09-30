/**
 * El plazo de prescripción, entre cómo lo guarda el contrato (meses enteros) y
 * cómo lo lee y lo carga el estudio (años y meses).
 */

/** Los meses que ofrece el select, además de los años enteros. */
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i));

/**
 * `78` → `6 años y 6 meses`; `24` → `2 años`; `8` → `8 meses`; `13` →
 * `1 año y 1 mes`. Es el texto de la tabla, del alta de causa y del detalle.
 */
export function formatPrescription(totalMonths: number): string {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const yearsText = years === 0 ? '' : `${years} ${years === 1 ? 'año' : 'años'}`;
    const monthsText = months === 0 ? '' : `${months} ${months === 1 ? 'mes' : 'meses'}`;

    if (yearsText && monthsText) return `${yearsText} y ${monthsText}`;
    return yearsText || monthsText || '0 meses';
}

/**
 * Años y meses del formulario → meses del contrato. Si alguno no es un
 * entero, devuelve `null`: la validación ya lo marcó y el cuerpo no se arma.
 */
export function toPrescriptionMonths(years: string, months: string): number | null {
    const y = years.trim();
    const m = months.trim() || '0';
    if (!/^\d+$/.test(y) || !/^\d+$/.test(m)) return null;
    return Number(y) * 12 + Number(m);
}

/** Meses del contrato → años y meses para precargar el formulario de edición. */
export function splitPrescription(totalMonths: number): { years: string; months: string } {
    return {
        years: String(Math.floor(totalMonths / 12)),
        months: String(totalMonths % 12),
    };
}

/**
 * La parte de la denominación antes del artículo: `Hurto simple — art. 162 CP`
 * → `Hurto simple`. La usa la carátula sugerida (V3 §3.5, "ese corte lo hace
 * el cliente").
 */
export function shortQualificationName(name: string): string {
    return name.split(' — ')[0].trim();
}
