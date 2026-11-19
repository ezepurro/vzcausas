import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { MonthlyReportSnapshotRepository } from '../../core/application/ports/monthly-report-snapshot.repository';
import { MonthlyReportData } from '../../core/domain/report/monthly-report-data';
import { Prisma } from '../../../../generated/prisma/client';

/**
 * Prisma-backed {@link MonthlyReportSnapshotRepository}: `monthly_report_snapshots`,
 * the one table `reporting` writes (D-146, ADR-002 amended). The data is a JSONB
 * object and no migration was needed (D-117).
 */
@Injectable()
export class MonthlyReportSnapshotPrismaRepository implements MonthlyReportSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPeriods(periods: string[]): Promise<Map<string, MonthlyReportData>> {
    if (periods.length === 0) return new Map();
    const rows = await this.prisma.db.monthlyReportSnapshot.findMany({
      where: { period: { in: periods } },
      select: { period: true, data: true },
    });
    return new Map(rows.map((row) => [row.period, row.data as unknown as MonthlyReportData]));
  }

  async saveIfAbsent(
    period: string,
    data: MonthlyReportData,
    takenAt: Date,
  ): Promise<{ data: MonthlyReportData; created: boolean }> {
    // `INSERT ... ON CONFLICT DO NOTHING` on the primary key: of two simultaneous requests
    // for the same month exactly one inserts, and both then read the same row.
    const { count } = await this.prisma.db.monthlyReportSnapshot.createMany({
      data: [{ period, takenAt, data: data as unknown as Prisma.InputJsonObject }],
      skipDuplicates: true,
    });
    const stored = await this.prisma.db.monthlyReportSnapshot.findUniqueOrThrow({
      where: { period },
      select: { data: true },
    });
    return { data: stored.data as unknown as MonthlyReportData, created: count === 1 };
  }
}
