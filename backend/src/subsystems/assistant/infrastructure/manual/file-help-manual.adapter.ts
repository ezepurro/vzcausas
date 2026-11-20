import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HelpManual, ManualSection } from '../../core/domain/value-objects/help-manual.vo';
import { HelpManualPort } from '../../core/domain/ports/help-manual.port';

/** Where the draft manual lives, next to this file (copied to `dist` by `nest-cli.json`). */
export const DEFAULT_MANUAL_DIR = join(__dirname, 'content');

/**
 * Reads the manual from markdown files, one per section (format in
 * `content/README.md`). Loaded once and kept: the manual changes with a
 * deploy, not between requests, and reading it again would also break the
 * stable prefix the provider caches.
 *
 * The module calls `load()` at startup, so a broken manual stops the app
 * there instead of failing on the first question.
 */
export class FileHelpManual implements HelpManualPort {
  private manual: Promise<HelpManual> | null = null;

  constructor(private readonly directory: string = DEFAULT_MANUAL_DIR) {}

  load(): Promise<HelpManual> {
    this.manual ??= this.read().catch((error: unknown) => {
      this.manual = null;
      throw error;
    });
    return this.manual;
  }

  private async read(): Promise<HelpManual> {
    const files = (await readdir(this.directory))
      .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
      .sort();

    const sections = await Promise.all(
      files.map(async (name) =>
        FileHelpManual.parseSection(name, await readFile(join(this.directory, name), 'utf8')),
      ),
    );
    return HelpManual.create(sections);
  }

  /**
   * A section file: a header between `---` lines with `id` and `title` (and
   * optional keys, ignored), then the body. Hand-parsed: two keys do not
   * justify a YAML dependency. Public so the spec can check the format alone.
   */
  static parseSection(fileName: string, raw: string): ManualSection {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw.replace(/^﻿/, ''));
    if (!match) {
      throw new Error(`Invalid help manual: ${fileName} has no header between --- lines.`);
    }

    const header = new Map<string, string>();
    for (const line of match[1].split(/\r?\n/)) {
      const separator = line.indexOf(':');
      if (separator > 0) header.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }

    return { id: header.get('id') ?? '', title: header.get('title') ?? '', body: match[2] };
  }
}
