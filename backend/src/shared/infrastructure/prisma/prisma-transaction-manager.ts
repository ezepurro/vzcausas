import { Injectable } from "@nestjs/common";
import { TransactionManagerPort } from "@shared/domain/transaction-manager.port";
import { PrismaService } from "./prisma.service";

/**
 * Prisma implementation of {@link TransactionManagerPort} (§7.5).
 *
 * Holds no logic of its own: the mechanism lives in
 * {@link PrismaService.runInTransaction}, which is where the client
 * and the `AsyncLocalStorage` that binds it are. This class exists so
 * the application layer depends on the port rather than on
 * `PrismaService`.
 */
@Injectable()
export class PrismaTransactionManager implements TransactionManagerPort {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.runInTransaction(work);
  }
}
