import { JurisdictionCode } from '@subsystems/cases/core/domain/value-objects/case/jurisdiction-code';
import { ReportPeriod } from '../value-objects/report-period.vo';
import {
  JurisdictionCounts,
  MonthlyReportData,
  PrescriptionBandCode,
  ReportDeadlines,
  ReportJurisdictionRow,
  ReportLawyer,
  ReportLawyerLoad,
  ReportPrescriptionAlert,
} from './monthly-report-data';
import { ReportCase } from './report-case';

const JURISDICTIONS = Object.values(JurisdictionCode);
const BANDS: PrescriptionBandCode[] = ['UNDER_50', 'FROM_50_TO_70', 'FROM_70_TO_90', 'FROM_90'];

/** What the calculation needs: the cases of the report and the lawyers vigentes at the moment the data is taken. */
export type MonthlyReportInput = {
  period: ReportPeriod;
  /** The cut-off date (`dataAsOf`): the last day of a closed month, today for the one in progress. */
  cutOff: Date;
  inProgress: boolean;
  cases: readonly ReportCase[];
  /** Lawyers `active: true` now: one given de baja is not in the data of the month of the baja (D-145). */
  lawyers: readonly ReportLawyer[];
};

/**
 * The monthly report at a cut-off date (HU43, §3.13 "Qué cuenta"): every figure
 * from the cases' own questions ({@link ReportCase}), put together once for the
 * screen and the PDF, so the two cannot disagree. It is also what the snapshot
 * keeps (D-117).
 *
 * D-145: an orphaned case has no lawyer, so it is counted in `unassigned` (as is one whose lawyer is
 * no longer vigente: no row to carry it) and
 * nowhere else among the lawyers' figures — not in `lawyers`, not in the average,
 * minimum or maximum. It stays active, so it is never "archived", and the list of
 * prescription alerts shows it with a `null` lawyer.
 */
export class MonthlyReportCalculation {
  static run(input: MonthlyReportInput): MonthlyReportData {
    const { period, cutOff, inProgress, cases, lawyers } = input;
    const beforeTheMonth = period.previous().lastDay();
    const activeAtEnd = cases.filter((c) => c.isActiveAt(cutOff));

    const byJurisdiction = MonthlyReportCalculation.byJurisdiction(
      cases,
      activeAtEnd,
      period,
      cutOff,
      beforeTheMonth,
    );
    const loads = MonthlyReportCalculation.lawyerLoads(activeAtEnd, lawyers);
    // "Sin asignar": orphaned cases and the ones of a lawyer that is no longer vigente (D-145).
    const vigentLawyerIds = new Set(lawyers.map((lawyer) => lawyer.id));
    const unassigned = MonthlyReportCalculation.count(
      activeAtEnd.filter((c) => c.countedUnder(vigentLawyerIds) === null),
    );

    const average = MonthlyReportCalculation.average(activeAtEnd.length - unassigned.total, loads.length);
    const totals = loads.map((load) => load.total);

    return {
      period: period.value,
      dataAsOf: cutOff.toISOString().slice(0, 10),
      summary: {
        activeCases: activeAtEnd.length,
        admitted: cases.filter((c) => c.wasAdmittedIn(period, cutOff)).length,
        archived: cases.filter((c) => c.wasArchivedIn(period, cutOff)).length,
        averagePerLawyer: average,
        minPerLawyer: totals.length > 0 ? Math.min(...totals) : null,
        maxPerLawyer: totals.length > 0 ? Math.max(...totals) : null,
      },
      byJurisdiction,
      lawyers: loads.map((load) => ({
        ...load,
        differenceFromAverage: MonthlyReportCalculation.round1(load.total - average),
      })),
      unassigned,
      prescription: MonthlyReportCalculation.prescription(activeAtEnd, cutOff, vigentLawyerIds),
      deadlines: MonthlyReportCalculation.deadlines(cases, period, cutOff, inProgress),
    };
  }

  /** The three fueros, always, in the contract's order. */
  private static byJurisdiction(
    cases: readonly ReportCase[],
    activeAtEnd: readonly ReportCase[],
    period: ReportPeriod,
    cutOff: Date,
    beforeTheMonth: Date,
  ): ReportJurisdictionRow[] {
    return JURISDICTIONS.map((jurisdiction) => {
      const own = cases.filter((c) => c.jurisdiction === jurisdiction);
      const atEnd = activeAtEnd.filter((c) => c.jurisdiction === jurisdiction).length;
      return {
        jurisdiction,
        atStart: own.filter((c) => c.isActiveAt(beforeTheMonth)).length,
        admitted: own.filter((c) => c.wasAdmittedIn(period, cutOff)).length,
        archived: own.filter((c) => c.wasArchivedIn(period, cutOff)).length,
        atEnd,
        percentage: MonthlyReportCalculation.percentage(atEnd, activeAtEnd.length),
      };
    });
  }

  /** One row per lawyer vigente, with or without cases; the most loaded first, ties by name. */
  private static lawyerLoads(
    activeAtEnd: readonly ReportCase[],
    lawyers: readonly ReportLawyer[],
  ): Omit<ReportLawyerLoad, 'differenceFromAverage'>[] {
    return lawyers
      .map((lawyer) => ({
        lawyer,
        ...MonthlyReportCalculation.count(activeAtEnd.filter((c) => c.responsibleLawyer?.id === lawyer.id)),
      }))
      .sort(
        (a, b) =>
          b.total - a.total ||
          a.lawyer.lastName.localeCompare(b.lawyer.lastName) ||
          a.lawyer.firstName.localeCompare(b.lawyer.firstName),
      );
  }

  private static count(cases: readonly ReportCase[]): JurisdictionCounts {
    const of = (jurisdiction: JurisdictionCode) => cases.filter((c) => c.jurisdiction === jurisdiction).length;
    return {
      criminal: of(JurisdictionCode.CRIMINAL),
      administrative: of(JurisdictionCode.ADMINISTRATIVE),
      amparo: of(JurisdictionCode.AMPARO),
      total: cases.length,
    };
  }

  /**
   * The criminal cases active at the cut-off that have a `prescription` (not the
   * ones without qualifications, D-74, nor with all of them declared, D-113), in
   * four bands; the ones at 70 % or more, most advanced first, are the alerts.
   */
  private static prescription(
    activeAtEnd: readonly ReportCase[],
    cutOff: Date,
    vigentLawyerIds: ReadonlySet<number>,
  ): MonthlyReportData["prescription"] {
    const withPrescription = activeAtEnd.flatMap((c) => {
      const summary = c.prescriptionAt(cutOff);
      return summary === null ? [] : [{ reportCase: c, summary }];
    });

    const bands = BANDS.map((band) => {
      const cases = withPrescription.filter(
        ({ summary }) => MonthlyReportCalculation.bandOf(summary.elapsedPercentage, summary.expired) === band,
      ).length;
      return { band, cases, percentage: MonthlyReportCalculation.percentage(cases, withPrescription.length) };
    });

    const alerts: ReportPrescriptionAlert[] = withPrescription
      .filter(({ summary }) => summary.alert)
      .sort((a, b) => b.summary.elapsedPercentage - a.summary.elapsedPercentage || a.reportCase.caseId - b.reportCase.caseId)
      .map(({ reportCase, summary }) => ({
        caseId: reportCase.caseId,
        sacNumber: reportCase.sacNumber,
        caption: reportCase.caption,
        responsibleLawyer: reportCase.countedUnder(vigentLawyerIds),
        legalQualificationName: summary.legalQualificationName,
        elapsedPercentage: summary.elapsedPercentage,
        expired: summary.expired,
      }));

    return { cases: withPrescription.length, bands, alerts };
  }

  /** `PrescriptionBand` (§2): a term already met is in the last band, whatever the rounding says. */
  private static bandOf(elapsedPercentage: number, expired: boolean): PrescriptionBandCode {
    if (expired || elapsedPercentage >= 90) return 'FROM_90';
    if (elapsedPercentage >= 70) return 'FROM_70_TO_90';
    if (elapsedPercentage >= 50) return 'FROM_50_TO_70';
    return 'UNDER_50';
  }

  private static deadlines(
    cases: readonly ReportCase[],
    period: ReportPeriod,
    cutOff: Date,
    inProgress: boolean,
  ): ReportDeadlines {
    const outcomes = cases.flatMap((c) => c.deadlineOutcomesIn(period, cutOff, inProgress));
    const of = (outcome: (typeof outcomes)[number]) => outcomes.filter((o) => o === outcome).length;
    return {
      total: outcomes.length,
      metOnTime: of('MET_ON_TIME'),
      metOnLastDay: of('MET_ON_LAST_DAY'),
      overdue: of('OVERDUE'),
      pending: of('PENDING'),
      interruptiveActs: cases.reduce((sum, c) => sum + c.interruptiveActsIn(period, cutOff), 0),
    };
  }

  /** "Promedio por abogado": the cases of the lawyers over the lawyers, one decimal; `0` with no lawyers. */
  private static average(assignedCases: number, lawyers: number): number {
    return lawyers === 0 ? 0 : MonthlyReportCalculation.round1(assignedCases / lawyers);
  }

  private static percentage(part: number, whole: number): number {
    return whole === 0 ? 0 : Math.round((part / whole) * 100);
  }

  private static round1(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
