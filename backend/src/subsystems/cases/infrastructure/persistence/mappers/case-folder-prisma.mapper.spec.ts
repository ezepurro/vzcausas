import { toCaseFolderView } from './case-folder-prisma.mapper';

const CHAIN = {
  name: 'GÓMEZ, Ariel c/ PÉREZ',
  url: 'https://drive.google.com/drive/folders/case',
  parent: {
    name: 'Penal',
    parent: {
      name: 'Ríos, Malena',
      parent: { name: 'Causas', parent: { name: 'VZ Causas', parent: null } },
    },
  },
};

const copy = (status: 'COPIED' | 'PENDING', active = true) => ({ status, template: { active } });

describe('toCaseFolderView', () => {
  it('una causa sin estado (anterior a las carpetas) no tiene carpeta', () => {
    expect(toCaseFolderView({ folderStatus: null, cloudFolder: null, templateCopies: [] })).toBeNull();
  });

  it('CREATED lleva el enlace y la ruta desde MAIN hasta la carpeta de la causa', () => {
    expect(toCaseFolderView({ folderStatus: 'CREATED', cloudFolder: CHAIN, templateCopies: [] })).toEqual({
      status: 'CREATED',
      url: 'https://drive.google.com/drive/folders/case',
      path: '/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel c/ PÉREZ',
      templatesCopied: 0,
      templatesPending: 0,
    });
  });

  it.each(['PENDING', 'CREATING', 'ERROR'] as const)(
    '%s no tiene enlace ni ruta, aunque la causa apunte a una carpeta',
    (folderStatus) => {
      expect(toCaseFolderView({ folderStatus, cloudFolder: CHAIN, templateCopies: [] })).toMatchObject({
        status: folderStatus,
        url: null,
        path: null,
      });
    },
  );

  it('una causa CREATED sin carpeta cargada no inventa un enlace', () => {
    expect(toCaseFolderView({ folderStatus: 'CREATED', cloudFolder: null, templateCopies: [] })).toMatchObject({
      status: 'CREATED',
      url: null,
      path: null,
    });
  });

  describe('modelos copiados (HU40)', () => {
    it('cuenta los copiados y los pendientes (CA-40.2, CA-40.7)', () => {
      const templateCopies = [copy('COPIED'), copy('COPIED'), copy('PENDING')];

      expect(toCaseFolderView({ folderStatus: 'CREATED', cloudFolder: CHAIN, templateCopies })).toMatchObject({
        templatesCopied: 2,
        templatesPending: 1,
      });
    });

    it('con la carpeta en ERROR muestra los pendientes que se pidieron', () => {
      const templateCopies = Array.from({ length: 6 }, () => copy('PENDING'));

      expect(toCaseFolderView({ folderStatus: 'ERROR', cloudFolder: null, templateCopies })).toEqual({
        status: 'ERROR',
        url: null,
        path: null,
        templatesCopied: 0,
        templatesPending: 6,
      });
    });

    it('no cuenta como pendiente la copia de un modelo dado de baja', () => {
      const templateCopies = [copy('PENDING'), copy('PENDING', false)];

      expect(toCaseFolderView({ folderStatus: 'CREATED', cloudFolder: CHAIN, templateCopies })).toMatchObject({
        templatesPending: 1,
      });
    });

    it('una copia ya hecha cuenta aunque el modelo se haya dado de baja después', () => {
      const templateCopies = [copy('COPIED', false)];

      expect(toCaseFolderView({ folderStatus: 'CREATED', cloudFolder: CHAIN, templateCopies })).toMatchObject({
        templatesCopied: 1,
      });
    });
  });
});
