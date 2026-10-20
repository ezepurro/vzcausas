import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { LAWYER_DASHBOARD_QUERY } from './core/application/ports/lawyer-dashboard.query';
import { GetAdministratorDashboard } from './core/application/use-cases/get-administrator-dashboard.use-case';
import { GetLawyerDashboard } from './core/application/use-cases/get-lawyer-dashboard.use-case';
import { DashboardsController } from './infrastructure/http/controllers/dashboards.controller';
import { LawyerDashboardPrismaQuery } from './infrastructure/persistence/lawyer-dashboard-prisma.query';

/**
 * Composition root of `reporting` (EP-08): dashboards and reports.
 *
 * A read-only subsystem with no entities of its own (ADR-002). It reads the
 * database directly through its own read models instead of crossing four
 * subsystems through ports, under three conditions: it never writes, it imposes
 * no invariants, and its read models are used by nobody else. The business
 * rules it shows — what an active case is, how business days count — are
 * imported from `cases`, which owns them.
 *
 * `SharedModule` is imported for the {@link CLOCK}: every dashboard is computed
 * against today's date in Córdoba.
 */
@Module({
  imports: [SharedModule],
  controllers: [DashboardsController],
  providers: [
    // HU41: el tablero del abogado, "Mi día".
    GetLawyerDashboard,
    // HU42: el tablero del administrador, "Estudio". Mismo puerto que HU41.
    GetAdministratorDashboard,
    { provide: LAWYER_DASHBOARD_QUERY, useClass: LawyerDashboardPrismaQuery },
  ],
})
export class ReportingModule {}
