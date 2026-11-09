import { Module } from "@nestjs/common";
import { AUDIT_TRAIL } from "@shared/domain/audit-trail.port";
import { PrismaAuditTrailAdapter } from "./prisma-audit-trail.adapter";

/**
 * Binds the {@link AUDIT_TRAIL} token to the `audit_log` adapter. Not global,
 * like `ClockModule`: each subsystem that audits imports it, so the
 * dependency shows in its module.
 */
@Module({
  providers: [{ provide: AUDIT_TRAIL, useClass: PrismaAuditTrailAdapter }],
  exports: [AUDIT_TRAIL],
})
export class AuditModule {}
