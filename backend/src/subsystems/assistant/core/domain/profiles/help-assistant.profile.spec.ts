import { HelpManual } from '../value-objects/help-manual.vo';
import { HelpAssistantProfile } from './help-assistant.profile';

const manual = HelpManual.create([{ id: 'perfiles', title: 'Perfiles', body: 'Tres perfiles.' }]);

describe('HelpAssistantProfile (C6)', () => {
  it('puts the rules first, the manual last, and asks for the sources line', () => {
    const text = HelpAssistantProfile.create({ model: 'm', maxOutputTokens: 100 }).instructions(manual);

    expect(text.indexOf('Reglas:')).toBeLessThan(text.indexOf('### [perfiles] Perfiles'));
    expect(text).toContain('FUENTES:');
    expect(text.endsWith(manual.render())).toBe(true);
  });

  it('sends app questions the manual does not cover to the Administrator, legal ones to the lawyer', () => {
    const text = HelpAssistantProfile.create({ model: 'm', maxOutputTokens: 100 }).instructions(manual);

    expect(text).toContain('consultarla con el Administrador del estudio');
    expect(text).toContain('consultarlo con el abogado responsable');
  });

  it('renders the same instructions every time (stable prefix for caching)', () => {
    const profile = HelpAssistantProfile.create({ model: 'm', maxOutputTokens: 100 });

    expect(profile.instructions(manual)).toBe(profile.instructions(manual));
  });

  it('rejects an empty model or a cap that is not a positive integer', () => {
    expect(() => HelpAssistantProfile.create({ model: ' ', maxOutputTokens: 100 })).toThrow(/model id/);
    expect(() => HelpAssistantProfile.create({ model: 'm', maxOutputTokens: 0 })).toThrow(/maxOutputTokens/);
  });
});
