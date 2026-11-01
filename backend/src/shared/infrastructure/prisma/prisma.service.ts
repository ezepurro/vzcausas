import { AsyncLocalStorage } from "node:async_hooks";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

/**
 * Above this a committed transaction is logged as a warning: it holds a
 * connection the whole time, and §7.5 rule 1 exists precisely so none
 * waits on an external service. No case in the API should come near it.
 */
const SLOW_TRANSACTION_MS = 1000;

/**
 * The Prisma client a repository should use right now: the
 * transaction's client when one is open, the plain one otherwise.
 * `$transaction`, `$connect` and friends are not available on the
 * transactional client, which is exactly why this type exists — a
 * repository has no business calling them.
 */
export type PrismaTransactionalClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Carries the open transaction's client down the call stack.
   *
   * The alternative is threading a `tx` parameter through every
   * repository method and every use case that might one day be called
   * inside a transaction — which pushes an infrastructure detail into
   * the domain, the one thing §7.5's port exists to prevent.
   *
   * `AsyncLocalStorage` survives `await`, so everything the callback
   * awaits sees the same client without being told about it.
   */
  private readonly transaction = new AsyncLocalStorage<PrismaTransactionalClient>();

  /**
   * The Proxy that `PrismaClient`'s constructor returns, which is what
   * actually carries the model delegates (`user`, `role`, ...). Getters
   * invoked through that Proxy receive the bare target as `this`, so
   * `db` cannot just return `this` — it would hand out an object
   * where `.user` is `undefined`.
   */
  private readonly root: PrismaTransactionalClient;

  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
    this.root = this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * What every repository reads from. Outside a transaction this is
   * the service itself, so nothing changes for the common case.
   *
   * Repositories must go through this rather than using the service
   * directly: a repository that reaches for `this.prisma.user` writes
   * outside the open transaction, and that write will **not** roll
   * back with the rest.
   */
  get db(): PrismaTransactionalClient {
    return this.transaction.getStore() ?? this.root;
  }

  /**
   * Opens a transaction and runs `work` with the client bound to it.
   *
   * Nesting reuses the outer transaction instead of opening a second
   * one: Postgres has no true nested transactions, and a second
   * `$transaction` here would deadlock against the first, which holds
   * the connection.
   *
   * Used by `PrismaTransactionManager`; use cases go through the port,
   * never through this.
   */
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    const open = this.transaction.getStore();
    if (open !== undefined) {
      return work();
    }

    // Only the outer transaction is timed: a nested call is part of it.
    const startedAt = Date.now();
    try {
      const result = await this.$transaction((tx) =>
        this.transaction.run(tx, work),
      );
      this.logCommit(Date.now() - startedAt);
      return result;
    } catch (err) {
      // The error's name and not its message: a domain error's message
      // may quote what the user typed (ARQUITECTURA_BACKEND_V1.md §7.9).
      // The error itself goes up untouched.
      const name = err instanceof Error ? err.constructor.name : typeof err;
      this.logger.warn(
        `Transaction rolled back after ${Date.now() - startedAt} ms: ${name}`,
      );
      throw err;
    }
  }

  private logCommit(elapsedMs: number): void {
    if (elapsedMs > SLOW_TRANSACTION_MS) {
      this.logger.warn(`Slow transaction committed in ${elapsedMs} ms`);
    } else {
      this.logger.debug(`Transaction committed in ${elapsedMs} ms`);
    }
  }
}
