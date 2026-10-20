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

describe('toCaseFolderView', () => {
  it('una causa sin estado (anterior a las carpetas) no tiene carpeta', () => {
    expect(toCaseFolderView({ folderStatus: null, cloudFolder: null })).toBeNull();
  });

  it('CREATED lleva el enlace y la ruta desde MAIN hasta la carpeta de la causa', () => {
    expect(toCaseFolderView({ folderStatus: 'CREATED', cloudFolder: CHAIN })).toEqual({
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
      expect(toCaseFolderView({ folderStatus, cloudFolder: CHAIN })).toMatchObject({
        status: folderStatus,
        url: null,
        path: null,
      });
    },
  );

  it('una causa CREATED sin carpeta cargada no inventa un enlace', () => {
    expect(toCaseFolderView({ folderStatus: 'CREATED', cloudFolder: null })).toMatchObject({
      status: 'CREATED',
      url: null,
      path: null,
    });
  });
});
