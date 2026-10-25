import { Logger } from '@nestjs/common';
import {
  CASE_TEMPLATES_COPY_REQUESTED,
  CaseTemplatesCopyRequestedEvent,
} from '@subsystems/cases/core/domain/ports/events/case-templates-copy-requested.event';
import { CopyTemplatesToCaseFolder } from '../../../core/application/use-cases/copy-templates-to-case-folder.use-case';
import { aSetUpStudio, FakeClock } from '../../../core/test-support/document-fixtures';
import { FakeTemplateCopyRepository } from '../../../core/test-support/fake-template-copy.repository';
import { CaseTemplatesCopyRequestedListener } from './case-templates-copy-requested.listener';

const requested = (caseId = 10): CaseTemplatesCopyRequestedEvent => ({
  type: CASE_TEMPLATES_COPY_REQUESTED,
  eventId: 'evt-retry',
  occurredAt: '2026-10-21T12:00:00.000Z',
  caseId,
});

describe('CaseTemplatesCopyRequestedListener', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('copia solo los modelos pendientes de la causa, sin pedir los del fuero (CA-40.7)', async () => {
    const studio = await aSetUpStudio();
    const copies = new FakeTemplateCopyRepository();
    const file = await studio.storage.uploadFile({ parentId: 'm', name: 'a.docx', mimeType: 'x', content: Buffer.from('a') });
    copies.addTemplate({ id: 1, cloudFileId: file.id });
    copies.addTemplate({ id: 2, cloudFileId: file.id }); // del fuero, pero nunca se pidió para esta causa
    const folder = await studio.assureSpace.execute({
      caseId: 10,
      caseCaption: 'GÓMEZ',
      lawyer: { id: 3, folderLabel: 'Ríos, Malena' },
      jurisdiction: { id: 1, folderLabel: 'Penal' },
    });
    await copies.registerPending(10, 1);
    copies.deactivate(2);
    const copyTemplates = new CopyTemplatesToCaseFolder(studio.folders, copies, studio.storage, new FakeClock(), studio.events);

    await new CaseTemplatesCopyRequestedListener(copyTemplates).handle(requested());

    expect(studio.storage.files.filter((f) => f.parentId === folder.cloudFolderId)).toHaveLength(1);
  });

  it('no deja escapar el error y lo registra con los ids', async () => {
    const listener = new CaseTemplatesCopyRequestedListener({
      execute: jest.fn().mockRejectedValue(new Error('boom')),
    } as never);

    await expect(listener.handle(requested(42))).resolves.toBeUndefined();

    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('eventId=evt-retry, caseId=42'));
  });
});
