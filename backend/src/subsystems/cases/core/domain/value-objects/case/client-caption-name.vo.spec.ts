import { ClientCaptionName } from './client-caption-name.vo';

/** HU10, CA-10.9, D-130: el comienzo `APELLIDO, Nombres` de la carátula. */
describe('ClientCaptionName', () => {
  const gomez = ClientCaptionName.of('Gómez', 'Ariel Fernando');
  const gomezPaz = ClientCaptionName.of('GÓMEZ PAZ', 'Ariel Fernando');

  it('pone el apellido en mayúsculas, con sus acentos, y deja los nombres como están', () => {
    expect(gomez.toString()).toBe('GÓMEZ, Ariel Fernando');
  });

  it.each([
    'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    'Gómez, Ariel Fernando c/ APROSS s/ amparo',
    'gómez, ariel fernando c/ PÉREZ',
  ])('reconoce "%s" sin distinguir mayúsculas', (caption) => {
    expect(gomez.beginsAt(caption)).toBe(true);
  });

  it.each(['Ariel GÓMEZ c/ PÉREZ', 'GOMEZ, Ariel Fernando p.s.a. Robo', 'GÓMEZ, Ariel'])(
    'no reconoce "%s": está escrita de otra forma',
    (caption) => {
      expect(gomez.beginsAt(caption)).toBe(false);
    },
  );

  it('reemplaza solo el comienzo y deja el resto igual', () => {
    expect(gomez.replacedBy(gomezPaz, 'Gómez, Ariel Fernando c/ APROSS s/ amparo')).toBe(
      'GÓMEZ PAZ, Ariel Fernando c/ APROSS s/ amparo',
    );
  });
});
