import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

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

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
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
  get client(): PrismaTransactionalClient {
    return this.transaction.getStore() ?? this;
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

    return this.$transaction((tx) => this.transaction.run(tx, work));
  }
}
