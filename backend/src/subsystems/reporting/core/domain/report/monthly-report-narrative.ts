import { MonthlyReport } from './monthly-report';
import { ReportCaseLawyerName } from './report-names';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** The unicode minus the contract asks for in balances and differences (§3.13, "Formato de los números"). */
const MINUS = '−';

/**
 * The fixed phrases of the PDF (D-120): the three paragraphs of the summary and the
 * one of the terms, completed with the data of the report — nobody writes them.
 * Singular and plural resolve, tied lawyers are all named, and what does not apply
 * is left out. Lawyers are named `Apellido, Nombres`, with no "Dr." or "Dra." (D-138).
 *
 * The wording is the one of `resumen()` and `plazos()` of
 * `docs/prototypes/reporte-mensual-pdf.html`, the visual reference of the contract.
 */
export class MonthlyReportNarrative {
  /** "Agosto de 2026". */
  static periodLabel(period: string): string {
    return `${MonthlyReportNarrative.monthName(period)} de ${period.slice(0, 4)}`;
  }

  /** "Agosto". */
  static monthName(period: string): string {
    return MONTH_NAMES[Number(period.slice(5, 7)) - 1];
  }

  /** `2026-08-31` as `31/08/2026`. */
  static date(isoDate: string): string {
    return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}/${isoDate.slice(0, 4)}`;
  }

  /** A decimal with a comma: `14,1`. */
  static decimal(value: number): string {
    return value.toFixed(1).replace('.', ',');
  }

  /** A balance with its sign: `+5`, `−1`, `0`. */
  static signed(value: number): string {
    return `${value > 0 ? '+' : value < 0 ? MINUS : ''}${Math.abs(value)}`;
  }

  /** A difference with its sign and a comma; `—` when it is exactly `0`. */
  static signedDecimal(value: number): string {
    return value === 0 ? '—' : `${value > 0 ? '+' : MINUS}${MonthlyReportNarrative.decimal(Math.abs(value))}`;
  }

  /** `Apellido, Nombres` (D-138). */
  static lawyerName(lawyer: ReportCaseLawyerName): string {
    return `${lawyer.lastName}, ${lawyer.firstName}`;
  }

  /** The responsible of an alert: "Sin asignar" for an orphaned case (D-145). */
  static responsible(lawyer: ReportCaseLawyerName | null): string {
    return lawyer === null ? 'Sin asignar' : MonthlyReportNarrative.lawyerName(lawyer);
  }

  /** "1. Resumen del período": up to three paragraphs. */
  static summary(report: MonthlyReport): string[] {
    const paragraphs = [MonthlyReportNarrative.activeCasesParagraph(report), MonthlyReportNarrative.movementParagraph(report)];
    const load = MonthlyReportNarrative.loadParagraph(report);
    return load === '' ? paragraphs : [...paragraphs, load];
  }

  /** "6. Plazos procesales del mes". */
  static deadlines(report: MonthlyReport): string {
    const d = report.data.deadlines;
    const interruptive = `Se registraron ${d.interruptiveActs} actos interruptivos de la prescripción.`;
    if (d.total === 0 && d.pending === 0) {
      return `En el mes no venció ningún plazo procesal. ${interruptive}`;
    }
    const verb = (n: number, singular: string, plural: string) => (n === 1 ? singular : plural);
    let text =
      `En el mes ${d.total === 1 ? 'venció 1 plazo procesal' : `vencieron ${d.total} plazos procesales`}: ` +
      `${d.metOnTime} ${verb(d.metOnTime, 'se cumplió', 'se cumplieron')} con el acto correspondiente dentro del término y ` +
      `${d.metOnLastDay} ${verb(d.metOnLastDay, 'se cumplió', 'se cumplieron')} el último día. `;
    text +=
      d.overdue === 0
        ? 'No hubo plazos vencidos sin acto registrado. '
        : `${d.overdue} ${verb(d.overdue, 'venció', 'vencieron')} sin acto registrado. `;
    if (report.status === 'IN_PROGRESS') {
      text += `${d.pending} siguen en curso. `;
    }
    return text + interruptive;
  }

  private static activeCasesParagraph(report: MonthlyReport): string {
    const { data } = report;
    const date = MonthlyReportNarrative.date(data.dataAsOf);
    const active = data.summary.activeCases;
    if (active === 0) return `Al ${date} el estudio no registra causas activas.`;

    const phrase = (row: (typeof data.byJurisdiction)[number]): string => {
      const label =
        row.jurisdiction === 'CRIMINAL'
          ? 'en el fuero penal'
          : row.jurisdiction === 'ADMINISTRATIVE'
            ? 'en el administrativo'
            : row.atEnd === 1
              ? 'amparo'
              : 'amparos';
      return `${row.atEnd} ${label} (${row.percentage} %)`;
    };
    const parts = data.byJurisdiction.filter((row) => row.atEnd > 0).map(phrase);
    return `Al ${date} el estudio registra ${active === 1 ? '1 causa activa' : `${active} causas activas`}: ${MonthlyReportNarrative.list(parts)}.`;
  }

  private static movementParagraph(report: MonthlyReport): string {
    const { data } = report;
    const { admitted, archived } = data.summary;
    const atStart = data.byJurisdiction.reduce((sum, row) => sum + row.atStart, 0);
    return (
      `Durante ${MonthlyReportNarrative.monthName(data.period).toLowerCase()} ` +
      `${admitted === 1 ? 'ingresó 1 causa' : `ingresaron ${admitted} causas`} y ` +
      `${archived === 1 ? 'se archivó 1' : `se archivaron ${archived}`}, ` +
      `con un saldo de ${MonthlyReportNarrative.signed(admitted - archived)} respecto del cierre del mes anterior (${atStart} activas).`
    );
  }

  /** The average, the biggest and smallest portfolios, and the criminal cases near their prescription; `''` if none applies. */
  private static loadParagraph(report: MonthlyReport): string {
    const { data } = report;
    const { averagePerLawyer, maxPerLawyer, minPerLawyer } = data.summary;
    let text = '';
    if (data.lawyers.length > 0) {
      text = `La carga promedio es de ${MonthlyReportNarrative.decimal(averagePerLawyer)} causas por abogado.`;
      if (maxPerLawyer !== minPerLawyer) {
        const namesWith = (total: number | null) =>
          data.lawyers.filter((l) => l.total === total).map((l) => MonthlyReportNarrative.lawyerName(l.lawyer));
        const most = namesWith(maxPerLawyer);
        const least = namesWith(minPerLawyer);
        text +=
          ` ${MonthlyReportNarrative.list(most)} ${most.length > 1 ? 'tienen' : 'tiene'} la mayor cartera ` +
          `(${MonthlyReportNarrative.cases(maxPerLawyer ?? 0)}) y ${MonthlyReportNarrative.list(least)} la menor (${minPerLawyer}).`;
      }
    }
    if (data.prescription.cases > 0) {
      const n = data.prescription.alerts.length;
      text +=
        `${text === '' ? '' : ' '}Hay ${MonthlyReportNarrative.cases(n)} penal${n === 1 ? '' : 'es'} ` +
        'con más del 70 % del plazo de prescripción transcurrido.';
    }
    return text;
  }

  /** `a, b y c`. */
  private static list(items: string[]): string {
    return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
  }

  /** `1 causa`, `2 causas`. */
  private static cases(n: number): string {
    return `${n} ${n === 1 ? 'causa' : 'causas'}`;
  }
}
