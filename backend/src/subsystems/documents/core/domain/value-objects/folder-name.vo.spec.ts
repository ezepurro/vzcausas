import { InvalidCloudFolderError } from '../errors/documents.errors';
import { FolderName, MAX_FOLDER_NAME_LENGTH } from './folder-name.vo';

describe('FolderName', () => {
  it('conserva una carátula válida tal cual', () => {
    expect(FolderName.of('GÓMEZ, Ariel p.s.a. Robo').toString()).toBe('GÓMEZ, Ariel p.s.a. Robo');
  });

  it('elimina los caracteres que el proveedor no admite', () => {
    expect(FolderName.of('A/B\\C:D*E?F"G<H>I|J').toString()).toBe('A B C D E F G H I J');
  });

  it('elimina caracteres de control y colapsa espacios', () => {
    expect(FolderName.of('  Uno\t\n  dos\u0000 ').toString()).toBe('Uno dos');
  });

  it('trunca al máximo permitido', () => {
    const name = FolderName.of('x'.repeat(MAX_FOLDER_NAME_LENGTH + 50)).toString();
    expect(name).toHaveLength(MAX_FOLDER_NAME_LENGTH);
  });

  it('no deja un espacio al final tras truncar', () => {
    const raw = `${'x'.repeat(MAX_FOLDER_NAME_LENGTH - 1)} y`;
    expect(FolderName.of(raw).toString().endsWith(' ')).toBe(false);
  });

  it('falla si no queda nada utilizable', () => {
    expect(() => FolderName.of(' /:? ')).toThrow(InvalidCloudFolderError);
    expect(() => FolderName.of('')).toThrow(InvalidCloudFolderError);
  });
});
