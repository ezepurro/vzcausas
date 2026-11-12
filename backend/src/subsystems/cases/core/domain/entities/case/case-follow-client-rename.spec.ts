import { aCase, aCaseInState, ARCHIVED, NOW } from '../../../test-support/case-fixtures';
import { ClientCaptionName } from '../../value-objects/case/client-caption-name.vo';

/** HU10, CA-10.9, D-121, D-130: la carátula sigue al nombre del cliente. */
const GOMEZ = ClientCaptionName.of('GÓMEZ', 'Ariel Fernando');
const GOMEZ_PAZ = ClientCaptionName.of('GÓMEZ PAZ', 'Ariel Fernando');
const LATER = new Date('2026-10-06T19:00:00.000Z');

describe('Case.followClientRename', () => {
  it('reemplaza el comienzo de la carátula y deja el resto igual', () => {
    const target = aCase({ caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado' });

    expect(target.followClientRename(GOMEZ, GOMEZ_PAZ, LATER)).toBe(true);

    expect(target.caption).toBe('GÓMEZ PAZ, Ariel Fernando p.s.a. Robo calificado');
    expect(target.updatedAt).toEqual(LATER);
  });

  it('no distingue mayúsculas y cambia aunque la causa esté en un estado terminal', () => {
    const archived = aCaseInState({ currentStateId: ARCHIVED.id });
    archived.modify({ caption: 'Gómez, Ariel Fernando c/ APROSS s/ amparo' }, {
      today: NOW,
      now: NOW,
      referenceErrors: {},
      legalQualificationRefs: [],
    });

    expect(archived.followClientRename(GOMEZ, GOMEZ_PAZ, LATER)).toBe(true);
    expect(archived.caption).toBe('GÓMEZ PAZ, Ariel Fernando c/ APROSS s/ amparo');
  });

  it('una carátula escrita de otra forma no se toca', () => {
    const target = aCase({ caption: 'Ariel GÓMEZ c/ PÉREZ' });

    expect(target.followClientRename(GOMEZ, GOMEZ_PAZ, LATER)).toBe(false);
    expect(target.caption).toBe('Ariel GÓMEZ c/ PÉREZ');
  });

  it('una que con el nombre nuevo pasaría de 255 caracteres no se toca', () => {
    const caption = `GÓMEZ, Ariel Fernando ${'x'.repeat(255 - 'GÓMEZ, Ariel Fernando '.length)}`;
    const target = aCase({ caption });

    expect(target.followClientRename(GOMEZ, GOMEZ_PAZ, LATER)).toBe(false);
    expect(target.caption).toBe(caption);
  });

  it('si el nombre no cambió, la carátula tampoco', () => {
    const target = aCase();
    const before = target.updatedAt;

    expect(target.followClientRename(GOMEZ, ClientCaptionName.of('Gómez', 'Ariel Fernando'), LATER)).toBe(false);
    expect(target.updatedAt).toEqual(before);
  });
});
