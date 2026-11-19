/**
 * DI token for the first month with a report (`availableFrom`, D-137): `AAAA-MM`,
 * server configuration fixed when the report is deployed, or `null` if it was not
 * configured (then only the current month has a report).
 */
export const MONTHLY_REPORT_AVAILABLE_FROM = Symbol('MONTHLY_REPORT_AVAILABLE_FROM');
