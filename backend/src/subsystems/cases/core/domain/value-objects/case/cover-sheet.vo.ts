import { CaseListItem } from '../../ports/case/case.repository';
import { JurisdictionCode } from './jurisdiction-code';
import { ProceduralRole } from './procedural-role';

const SECRETARY_LABEL = 'SECRETARIO/A:';
const LAWYER_LABEL = 'DEFENSOR: DR.';

/** What the sheet reads from a case: a slice of the read model, so the use case passes it as is. */
export type CoverSheetSource = Pick<
  CaseListItem,
  | 'id'
  | 'sacNumber'
  | 'caption'
  | 'court'
  | 'jurisdiction'
  | 'proceduralRole'
  | 'instructorName'
  | 'counterparty'
  | 'client'
  | 'responsibleLawyer'
>;

interface CoverSheetProps {
  caseId: number;
  jurisdiction: JurisdictionCode;
  sacNumber: string;
  caption: string;
  plaintiff: string[];
  defendant: string[];
  interveningBody: string[];
  observations: string[];
}

/**
 * The content of the cover sheet of a case (HU24, `GET /cases/{caseId}/cover`): the
 * six boxes of the studio's template, in capitals. Single-line boxes are a `string`,
 * the ones that can hold several lines are a `string[]` (empty when the box is blank).
 *
 * **A value object, not a function that assembles pieces.** It has no identity and is
 * never stored: it is rebuilt from the current data on every emission (CA-24.8), and
 * the rule of which party goes in which box (D-94, contract V5 §3.7 "Partes") lives
 * here, not in the use case or in the PDF drawing. `documents` only draws it.
 */
export class CoverSheet {
  private constructor(private readonly props: CoverSheetProps) {}

  static create(source: CoverSheetSource): CoverSheet {
    const { plaintiff, defendant } = CoverSheet.partiesOf(source);

    return new CoverSheet({
      caseId: source.id,
      jurisdiction: source.jurisdiction,
      sacNumber: (source.sacNumber ?? '').toUpperCase(),
      caption: source.caption.toUpperCase(),
      plaintiff: plaintiff.map((line) => line.toUpperCase()),
      defendant: defendant.map((line) => line.toUpperCase()),
      interveningBody: CoverSheet.interveningBodyOf(source).map((line) => line.toUpperCase()),
      // The studio fills it by hand; a default text can be added later (decision 4, IMPLEMENTACION_CARATULA.md).
      observations: [],
    });
  }

  /**
   * Plaintiff and defendant boxes by jurisdiction and procedural role (D-94). A `null`
   * datum leaves its side empty. The criminal sheet never carries the other party: it is
   * not in the case, and the expediente takes it from the client's submission.
   */
  private static partiesOf(source: CoverSheetSource): { plaintiff: string[]; defendant: string[] } {
    const client = CoverSheet.clientName(source);

    if (source.jurisdiction === JurisdictionCode.CRIMINAL) {
      const lawyerLine = `${LAWYER_LABEL} ${source.responsibleLawyer.firstName} ${source.responsibleLawyer.lastName}`.trim();
      // The factory only admits these two roles in CRIMINAL, so anything else is a defense.
      return source.proceduralRole === ProceduralRole.QUERELLANTE_PARTICULAR
        ? { plaintiff: [`QUERELLANTE (${client})`, lawyerLine], defendant: [] }
        : { plaintiff: [], defendant: [client, lawyerLine] };
    }

    const counterparty = source.counterparty ? [source.counterparty] : [];
    return source.proceduralRole === ProceduralRole.DEMANDADA
      ? { plaintiff: counterparty, defendant: [client] }
      : { plaintiff: [client], defendant: counterparty };
  }

  /**
   * Two lines: the court and the secretary label with the instructor, who is the
   * secretary of the body (CA-24.3). Isolated on purpose: the studio's templates carry
   * a third line (C-34) and this is the one place to change when that is confirmed.
   */
  private static interveningBodyOf(source: CoverSheetSource): string[] {
    return [source.court ?? '', `${SECRETARY_LABEL} ${source.instructorName ?? ''}`.trim()];
  }

  /** `APELLIDO NOMBRES`, as the contract fixes it for the client. */
  private static clientName(source: CoverSheetSource): string {
    return `${source.client.lastName} ${source.client.firstName}`.trim();
  }

  /** Which template the sheet is drawn on (CA-24.2). It is not a box of the sheet. */
  get jurisdiction(): JurisdictionCode {
    return this.props.jurisdiction;
  }

  get sacNumber(): string {
    return this.props.sacNumber;
  }

  get caption(): string {
    return this.props.caption;
  }

  get plaintiff(): readonly string[] {
    return this.props.plaintiff;
  }

  get defendant(): readonly string[] {
    return this.props.defendant;
  }

  get interveningBody(): readonly string[] {
    return this.props.interveningBody;
  }

  get observations(): readonly string[] {
    return this.props.observations;
  }

  /** `Caratula_{SAC}.pdf`; without SAC, `Caratula_causa-{id}.pdf` (CA-24.10). */
  get fileName(): string {
    return this.props.sacNumber === ''
      ? `Caratula_causa-${this.props.caseId}.pdf`
      : `Caratula_${this.props.sacNumber}.pdf`;
  }
}
