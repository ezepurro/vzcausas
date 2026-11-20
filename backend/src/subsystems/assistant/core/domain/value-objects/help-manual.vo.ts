/** One section of the user manual: a screen or a topic. */
export interface ManualSection {
  /** Stable id. It is what travels in `sources`, so changing it changes the API. */
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

/** The part of a section the client sees in `sources`. */
export interface ManualSource {
  readonly id: string;
  readonly title: string;
}

const SECTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The user manual the help assistant answers from (proposal §2): the only
 * knowledge it has. Built once at startup; a broken manual stops the app,
 * because an assistant without its manual would answer from nothing.
 */
export class HelpManual {
  private readonly byId: ReadonlyMap<string, ManualSection>;

  private constructor(readonly sections: readonly ManualSection[]) {
    this.byId = new Map(sections.map((section) => [section.id, section]));
  }

  /**
   * Validates every section and reports **all** the problems at once, so
   * fixing the manual does not take one restart per mistake.
   */
  static create(sections: readonly ManualSection[]): HelpManual {
    const problems: string[] = [];
    const seen = new Set<string>();

    if (sections.length === 0) problems.push('the manual has no sections');

    sections.forEach((section, index) => {
      const where = `section #${index + 1}${section.id ? ` (${section.id})` : ''}`;
      if (!SECTION_ID.test(section.id ?? '')) {
        problems.push(`${where}: id must be lowercase words joined by dashes`);
      }
      if (seen.has(section.id)) problems.push(`${where}: duplicated id`);
      seen.add(section.id);
      if (!section.title?.trim()) problems.push(`${where}: empty title`);
      if (!section.body?.trim()) problems.push(`${where}: empty body`);
    });

    if (problems.length > 0) {
      throw new Error(`Invalid help manual: ${problems.join('; ')}.`);
    }

    return new HelpManual(
      sections.map((section) => ({
        id: section.id,
        title: section.title.trim(),
        body: section.body.trim(),
      })),
    );
  }

  /** `null` when the id is not a section of this manual. */
  sourceFor(id: string): ManualSource | null {
    const section = this.byId.get(id);
    return section ? { id: section.id, title: section.title } : null;
  }

  /**
   * The whole manual as the model reads it: each section headed by its id,
   * which is what the model has to quote back in the sources line. Stable
   * text on purpose: the same manual must render to the same bytes so the
   * provider can cache it.
   */
  render(): string {
    return this.sections
      .map((section) => `### [${section.id}] ${section.title}\n\n${section.body}`)
      .join('\n\n---\n\n');
  }
}
