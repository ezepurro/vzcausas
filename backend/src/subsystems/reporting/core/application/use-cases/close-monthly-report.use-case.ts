import { Injectable } from '@nestjs/common';
import { MonthlyReportSnapshots } from '../services/monthly-report-snapshots.service';

export type CloseMonthlyReportResult = {
  /** The months this run photographed (`AAAA-MM`), oldest first; empty if every closed month already had its photo. */
  taken: string[];
};

/**
 * HU43 — "Cerrar el mes", the step of the daily process (§4, "Proceso automático
 * diario"): on the first run of each month it takes the photo of the month that
 * ended, and of any other closed month that was left without one.
 *
 * Idempotent: every run of the day may call it, and only the first one of the
 * month finds something to photograph. Not an HTTP endpoint of its own: the daily
 * process of `deadlines` calls it (see `IMPLEMENTACION_CAUSAS_HUERFANAS.md`, T2.5).
 * It is not user-driven, so it has no actor to check.
 */
@Injectable()
export class CloseMonthlyReport {
  constructor(private readonly snapshots: MonthlyReportSnapshots) {}

  async execute(): Promise<CloseMonthlyReportResult> {
    const { taken } = await this.snapshots.ensure(this.snapshots.calendar().closedPeriods());
    return { taken };
  }
}
