import { PrescriptionDeclarationView } from '../../../core/domain/ports/case/case-timeline-query.port';

/**
 * The prescription declaration columns of `cases` (HU33), as a `select` or an
 * `include` asks for them.
 *
 * Shared by `PrismaCaseRepository` (the case resource) and
 * `CaseTimelinePrismaAdapter` (the line of life): the contract shows the same
 * `prescriptionDeclaration` in both (V4 §3.7), so it is read one way only.
 */
export const PRESCRIPTION_DECLARATION_SELECT = {
  prescriptionDate: true,
  prescriptionResolution: true,
  prescriptionGrounds: true,
  prescriptionRegisteredAt: true,
  prescriptionRegisteredBy: { select: { id: true, lastName: true, firstName: true } },
} as const;

/** What {@link toPrescriptionDeclarationView} needs from the case row. */
export type PrescriptionDeclarationRow = {
  prescriptionDate: Date | null;
  prescriptionResolution: string | null;
  prescriptionGrounds: string | null;
  prescriptionRegisteredAt: Date | null;
  prescriptionRegisteredBy: { id: number; lastName: string; firstName: string } | null;
};

/**
 * `null` while the case was not marked as prescribed. HU33 writes all of these
 * columns at once, so a date without the rest is corrupt data, not something to
 * render half-filled.
 */
export function toPrescriptionDeclarationView(
  caseId: number,
  row: PrescriptionDeclarationRow,
): PrescriptionDeclarationView | null {
  if (row.prescriptionDate === null) {
    return null;
  }
  if (row.prescriptionResolution === null || row.prescriptionRegisteredAt === null || row.prescriptionRegisteredBy === null) {
    throw new Error(`Case ${caseId} has a prescription date but an incomplete prescription declaration.`);
  }
  return {
    prescriptionDate: row.prescriptionDate,
    resolution: row.prescriptionResolution,
    grounds: row.prescriptionGrounds,
    registeredBy: row.prescriptionRegisteredBy,
    registeredAt: row.prescriptionRegisteredAt,
  };
}
