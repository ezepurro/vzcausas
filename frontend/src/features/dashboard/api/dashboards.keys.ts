export const dashboardKeys = {
    /** Todo lo de los tableros. Invalidarla vuelve a pedir los dos. */
    all: ['dashboards'] as const,

    /** "Mi día". No lleva id: el backend sabe de quién es por la sesión. */
    lawyer: () => [...dashboardKeys.all, 'lawyer'] as const,

    /** "Estudio". */
    administrator: () => [...dashboardKeys.all, 'administrator'] as const,

    /**
     * El reporte mensual de un período (HU43). Sin período, el que el backend
     * elige por defecto: el último mes cerrado.
     */
    monthlyReport: (period: string | null) => [...dashboardKeys.all, 'monthly-report', period] as const,
}