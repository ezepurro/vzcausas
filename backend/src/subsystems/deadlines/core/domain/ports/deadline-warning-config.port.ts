/**
 * DI token for the warning days of the daily check (D-79, V-14): how many
 * business days before a due date the warning is sent. "Configuración del
 * servidor, no de pantalla": 3 by default.
 *
 * Not a port in the usual sense — a plain number behind a Symbol, same
 * criterion as `MANAGEMENT_MAILBOX` (`daily-digest-config.port.ts`), so the use
 * case is built from typed values and never reads `ConfigService` itself. Kept
 * in its own file because that one belongs to the notification half.
 */
export const DEADLINE_WARNING_BUSINESS_DAYS = Symbol('DEADLINE_WARNING_BUSINESS_DAYS');
