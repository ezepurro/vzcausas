import { HelpManual } from './help-manual.vo';

describe('HelpManual (C16)', () => {
  const section = (id: string, title = 'Título', body = 'Cuerpo.') => ({ id, title, body });

  it('resolves a section by id and renders every section with its id', () => {
    const manual = HelpManual.create([section('ingreso', 'Ingresar'), section('perfiles', 'Perfiles')]);

    expect(manual.sourceFor('perfiles')).toEqual({ id: 'perfiles', title: 'Perfiles' });
    expect(manual.sourceFor('no-existe')).toBeNull();
    expect(manual.render()).toContain('### [ingreso] Ingresar');
    expect(manual.render()).toContain('### [perfiles] Perfiles');
  });

  it('renders the same text for the same manual (stable prefix for caching)', () => {
    const sections = [section('a'), section('b')];

    expect(HelpManual.create(sections).render()).toBe(HelpManual.create(sections).render());
  });

  it('reports every problem at once', () => {
    const act = () =>
      HelpManual.create([section('Mal Id'), section('ok'), section('ok'), section('vacio', ' ', ' ')]);

    expect(act).toThrow(/id must be lowercase/);
    expect(act).toThrow(/duplicated id/);
    expect(act).toThrow(/empty title/);
    expect(act).toThrow(/empty body/);
  });

  it('rejects an empty manual', () => {
    expect(() => HelpManual.create([])).toThrow(/no sections/);
  });
});
