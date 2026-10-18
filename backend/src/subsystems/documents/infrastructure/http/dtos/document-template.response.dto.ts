/** A formal template, as the contract shows it (V4 §3.10). */
export class DocumentTemplateResponseDto {
  id!: number;
  name!: string;
  jurisdictions!: string[];
  fileName!: string;
  copyToNewCases!: boolean;
  /** ISO 8601 with the study's offset. */
  lastVersionAt!: string;
  lastVersionBy!: { id: number; lastName: string; firstName: string };
  usageCount!: number;
  active!: boolean;
}
