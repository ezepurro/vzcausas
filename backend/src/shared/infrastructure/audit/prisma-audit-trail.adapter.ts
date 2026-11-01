import { Injectable } from "@nestjs/common";
import { AuditEntry, AuditTrailPort } from "@shared/domain/audit-trail.port";
import { RequestContext } from "@shared/infrastructure/http/request-context";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { Prisma } from "../../../generated/prisma/client";

/**
 * {@link AuditTrailPort} over the `audit_log` table.
 *
 * Writes through `prisma.db`, the transaction-aware client: called inside a
 * use case's `runInTransaction`, the record joins that transaction, so a
 * change is never saved without its record nor recorded without being saved.
 *
 * Insert only. The table rejects UPDATE, DELETE and TRUNCATE by trigger
 * (`trg_audit_log_append_only`), which is the point: an audit trail that can
 * be edited proves nothing.
 */
@Injectable()
export class PrismaAuditTrailAdapter implements AuditTrailPort {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.db.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        occurredAt: entry.occurredAt,
        metadata: (entry.metadata as Prisma.InputJsonObject | undefined) ?? Prisma.JsonNull,
        // Same id as the `X-Correlation-Id` header and the technical log;
        // `null` outside an HTTP request, such as the daily process.
        correlationId: RequestContext.correlationId(),
      },
    });
  }
}
