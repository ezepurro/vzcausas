import { JurisdictionCode } from '@subsystems/cases/core/domain/value-objects/case/jurisdiction-code';
import {
  MonthlyReportDataset,
  MonthlyReportSource,
} from '../application/ports/monthly-report-source.port';
import { MonthlyReportSnapshotRepository } from '../application/ports/monthly-report-snapshot.repository';
import { MonthlyReportData, ReportLawyer } from '../domain/report/monthly-report-data';
import { ReportCase, ReportCaseProps } from '../domain/report/report-case';

export const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export const RIOS: ReportLawyer = { id: 2, lastName: 'Ríos', firstName: 'Malena', registrationNumber: '1-36842' };
export const ZARATE: ReportLawyer = { id: 3, lastName: 'Zárate', firstName: 'Oscar', registrationNumber: null };

let nextCaseId = 1;

/** Call from `beforeEach` so `caseId` starts at 1 in every test. */
export function resetReportCaseIds(): void {
  nextCaseId = 1;
}

/** A criminal case of Ríos, started on 2026-01-10, in the initial state, with no acts. */
export function aReportCase(overrides: Partial<ReportCaseProps> = {}): ReportCase {
  const id = nextCaseId++;
  return ReportCase.hydrate({
    caseId: id,
    sacNumber: `1000000${id}`,
    caption: `Causa ${id}`,
    jurisdiction: JurisdictionCode.CRIMINAL,
    startDate: day('2026-01-10'),
    prescribedOn: null,
    responsibleLawyer: { id: RIOS.id, lastName: RIOS.lastName, firstName: RIOS.firstName },
    proceduralActs: [],
    interruptiveActDates: [],
    offenses: [],
    ...overrides,
  });
}

/** An orphaned case (D-143): no responsible lawyer. */
export const orphan = (overrides: Partial<ReportCaseProps> = {}) => aReportCase({ responsibleLawyer: null, ...overrides });

/** A procedural act in force; `terminal: true` for "Archivada". */
export function anAct(
  id: number,
  actDate: string,
  options: { terminal?: boolean; dueDate?: string | null } = {},
): ReportCaseProps['proceduralActs'][number] {
  return {
    id,
    actDate: day(actDate),
    terminal: options.terminal ?? false,
    dueDate: options.dueDate === undefined || options.dueDate === null ? null : day(options.dueDate),
  };
}

export class FakeReportSource implements MonthlyReportSource {
  dataset: MonthlyReportDataset = { cases: [], lawyers: [RIOS] };
  loads = 0;
  userName: string | null = 'Vázquez, Fernando G.';

  async load(): Promise<MonthlyReportDataset> {
    this.loads += 1;
    return this.dataset;
  }

  async findUserName(): Promise<string | null> {
    return this.userName;
  }
}

export class FakeSnapshotRepository implements MonthlyReportSnapshotRepository {
  readonly rows = new Map<string, { data: MonthlyReportData; takenAt: Date }>();

  async findByPeriods(periods: string[]): Promise<Map<string, MonthlyReportData>> {
    return new Map(periods.filter((p) => this.rows.has(p)).map((p) => [p, this.rows.get(p)!.data]));
  }

  async saveIfAbsent(period: string, data: MonthlyReportData, takenAt: Date) {
    const existing = this.rows.get(period);
    if (existing) return { data: existing.data, created: false };
    this.rows.set(period, { data, takenAt });
    return { data, created: true };
  }
}
