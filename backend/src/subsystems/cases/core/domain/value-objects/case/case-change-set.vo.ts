import { CASE_FIELDS, CaseField } from '../../entities/case/case-changes';

/**
 * What a modification actually changed (HU19): the fields whose value is now
 * different. A field sent with the value it already had is not a change.
 *
 * Returned by `Case.modify`, so the use case compares nothing: it hands
 * {@link fields} to the audit trail (CA-19.15) and asks
 * {@link relocatesFolder} whether the case's Drive folder has to follow
 * (CA-19.9, D-104). Same role as `LawyerChangeSet` in HU14.
 */
export class CaseChangeSet {
  private constructor(private readonly changed: readonly CaseField[]) {}

  static of(changed: Iterable<CaseField>): CaseChangeSet {
    const set = new Set(changed);
    return new CaseChangeSet(CASE_FIELDS.filter((field) => set.has(field)));
  }

  /** The changed fields, in the contract's order. Names only, never values (audit §4). */
  get fields(): readonly CaseField[] {
    return this.changed;
  }

  isEmpty(): boolean {
    return this.changed.length === 0;
  }

  /**
   * The folder is named after the caption and lives under the responsible
   * lawyer (`/VZ Causas/Causas/{abogado}/{fuero}/{carátula}`): either change
   * means it has to be renamed or moved (D-104).
   */
  relocatesFolder(): boolean {
    return this.changed.includes('caption') || this.changed.includes('responsibleLawyerId');
  }

  /** Which of the two folder-moving changes happened, for the event `documents` listens to. */
  folderChanges(): Array<'caption' | 'responsibleLawyer'> {
    const result: Array<'caption' | 'responsibleLawyer'> = [];
    if (this.changed.includes('caption')) result.push('caption');
    if (this.changed.includes('responsibleLawyerId')) result.push('responsibleLawyer');
    return result;
  }
}
