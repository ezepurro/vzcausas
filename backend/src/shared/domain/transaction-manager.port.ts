/**
 * DI token for {@link TransactionManagerPort}. Symbol-as-token
 * convention, same as every other port in the project.
 */
export const TRANSACTION_MANAGER = Symbol("TRANSACTION_MANAGER");

/**
 * Runs a sequence of writes atomically (§7.5 of the architecture).
 *
 * A use case that writes to more than one table wraps the sequence in
 * {@link runInTransaction}: either every write lands or none does. The
 * domain never sees Prisma — it only knows "do this together".
 *
 * Two rules from §7.5 that this port cannot enforce on its own, and
 * that the caller has to respect:
 *
 * 1. Never call a port that talks to an **external service** while a
 *    transaction is open. Holding a database transaction while waiting
 *    on, say, Google Drive ties up a connection for the length of an
 *    HTTP round trip.
 * 2. Read-only validations — "does this lawyer exist", "is this email
 *    taken" — happen **before** opening the transaction, so it stays
 *    as short as possible.
 */
export interface TransactionManagerPort {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
