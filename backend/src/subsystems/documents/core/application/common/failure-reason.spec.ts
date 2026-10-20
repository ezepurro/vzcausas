import { ValidationError } from '@shared/domain/domain-error';
import {
  DocumentStorageUnavailableError,
  InvalidCloudFolderError,
  StudioRootNotConfiguredError,
} from '../../domain/errors/documents.errors';
import { classifyFailure } from './failure-reason';

describe('classifyFailure', () => {
  it.each([
    ['storage caído o con timeout', new DocumentStorageUnavailableError('TRANSIENT'), 'TRANSIENT'],
    [
      'storage que rechaza las credenciales',
      new DocumentStorageUnavailableError('AUTHORIZATION'),
      'AUTHORIZATION',
    ],
    [
      'carpeta configurada que ya no existe en la nube',
      new DocumentStorageUnavailableError('CONFIGURATION'),
      'CONFIGURATION',
    ],
    ['raíz de causas sin configurar', new StudioRootNotConfiguredError(), 'CONFIGURATION'],
    ['carpeta inválida', new InvalidCloudFolderError('x'), 'INVALID_DATA'],
    ['error de validación', new ValidationError('X', 'x'), 'INVALID_DATA'],
    ['error inesperado', new Error('boom'), 'INTERNAL'],
    ['algo que no es un error', 'texto', 'INTERNAL'],
  ])('%s → %s', (_label, error, expected) => {
    expect(classifyFailure(error)).toBe(expected);
  });
});
