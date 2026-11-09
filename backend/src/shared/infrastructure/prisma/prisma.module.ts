import { Global, Module } from "@nestjs/common";
import { TRANSACTION_MANAGER } from "@shared/domain/transaction-manager.port";
import { PrismaTransactionManager } from "./prisma-transaction-manager";
import { PrismaService } from "./prisma.service";

/**
 * Shared database client and the {@link TRANSACTION_MANAGER} bound to it.
 * Global: every subsystem's persistence adapters inject `PrismaService`, and
 * the transaction manager is just the port over that same client.
 */
@Global()
@Module({
  providers: [PrismaService, { provide: TRANSACTION_MANAGER, useClass: PrismaTransactionManager }],
  exports: [PrismaService, TRANSACTION_MANAGER],
})
export class PrismaModule {}
