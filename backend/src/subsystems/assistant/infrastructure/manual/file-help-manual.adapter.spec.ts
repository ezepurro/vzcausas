import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileHelpManual } from './file-help-manual.adapter';

describe('FileHelpManual (C16)', () => {
  it('loads the real draft manual: every section with a unique id, title and body', async () => {
    const manual = await new FileHelpManual().load();

    expect(manual.sections.length).toBeGreaterThanOrEqual(20);
    expect(new Set(manual.sections.map((s) => s.id)).size).toBe(manual.sections.length);
    expect(manual.sourceFor('causas-registrar')).toEqual({
      id: 'causas-registrar',
      title: 'Registrar una causa',
    });
    // The README describes the format: it is not a section.
    expect(manual.render()).not.toContain('BORRADOR DE DEMO');
  });

  it('reads the files once', async () => {
    const source = new FileHelpManual();

    expect(await source.load()).toBe(await source.load());
  });

  describe('with a broken manual', () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'manual-'));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('fails when two sections share an id', async () => {
      const file = '---\nid: repetida\ntitle: Algo\n---\nCuerpo.';
      await writeFile(join(dir, '01.md'), file);
      await writeFile(join(dir, '02.md'), file);

      await expect(new FileHelpManual(dir).load()).rejects.toThrow(/duplicated id/);
    });

    it('fails when a file has no header', async () => {
      await writeFile(join(dir, '01.md'), 'Solo texto.');

      await expect(new FileHelpManual(dir).load()).rejects.toThrow(/01\.md has no header/);
    });
  });
});

describe('FileHelpManual.parseSection', () => {
  it('reads id and title, ignores other keys, keeps the body and tolerates CRLF', () => {
    const section = FileHelpManual.parseSection(
      'x.md',
      '---\r\nid: perfiles\r\ntitle: Perfiles: quién hace qué\r\npantalla: /x\r\n---\r\nCuerpo.\r\n',
    );

    expect(section).toEqual({ id: 'perfiles', title: 'Perfiles: quién hace qué', body: 'Cuerpo.\r\n' });
  });
});
