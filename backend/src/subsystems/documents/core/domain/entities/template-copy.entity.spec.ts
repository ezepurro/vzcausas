import { TemplateCopyAlreadyDoneError } from '../errors/documents.errors';
import { TemplateCopy } from './template-copy.entity';

describe('TemplateCopy', () => {
  const at = new Date('2026-10-21T12:00:00.000Z');

  it('nace PENDING y sin archivo (CA-40.7)', () => {
    const copy = TemplateCopy.pending(10, 3);

    expect(copy).toMatchObject({ caseId: 10, templateId: 3, status: 'PENDING', cloudFileId: null, copiedAt: null });
    expect(copy.isPending).toBe(true);
  });

  it('pasa a COPIED con el id de la copia y la fecha', () => {
    const copy = TemplateCopy.pending(10, 3);

    copy.markCopied('file-9', at);

    expect(copy).toMatchObject({ status: 'COPIED', cloudFileId: 'file-9', copiedAt: at });
    expect(copy.isPending).toBe(false);
  });

  it('una copia ya hecha no se vuelve a copiar (CA-40.7)', () => {
    const copy = TemplateCopy.pending(10, 3);
    copy.markCopied('file-9', at);

    expect(() => copy.markCopied('file-10', at)).toThrow(TemplateCopyAlreadyDoneError);
    expect(copy.cloudFileId).toBe('file-9');
  });

  it('hydrate reconstruye una copia guardada sin validar', () => {
    const copy = TemplateCopy.hydrate({ caseId: 1, templateId: 2, status: 'COPIED', cloudFileId: 'f', copiedAt: at });

    expect(copy.status).toBe('COPIED');
  });
});
