import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { RegisterDocumentTemplate } from '../../../core/application/use-cases/register-document-template.use-case';
import { DocumentTemplateResponseDto } from '../dtos/document-template.response.dto';
import { RegisterDocumentTemplateRequestDto } from '../dtos/register-document-template.request.dto';
import { DocumentTemplateHttpMapper } from '../mappers/document-template-http.mapper';

/** The part of multer's file the endpoint reads (no `@types/multer` in the project). */
interface UploadedTemplateFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/** "Hasta 10 MB" (CA-34.10). Above it multer answers 413, which the error filter turns into `FILE_TOO_LARGE`. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * HTTP entry point for `/document-templates` (contract V4 §3.10).
 *
 * No permission is declared: the resource is for administrators and lawyers,
 * a rule on roles that the use case checks (CA-34.8), as `cases` does with the
 * responsible lawyer.
 */
@Controller({ path: 'document-templates', version: ['1'] })
export class DocumentTemplatesController {
  constructor(
    private readonly registerDocumentTemplate: RegisterDocumentTemplate,
    private readonly mapper: DocumentTemplateHttpMapper,
  ) {}

  /** HU34: registers a template with its `.docx`, sent as `multipart/form-data`. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES, files: 1 } }))
  async register(
    @Body() dto: RegisterDocumentTemplateRequestDto,
    @UploadedFile() file: UploadedTemplateFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: DocumentTemplateResponseDto }> {
    const view = await this.registerDocumentTemplate.execute({
      actor,
      name: dto.name,
      jurisdictions: dto.jurisdictions,
      copyToNewCases: dto.copyToNewCases,
      file: file && {
        // Multer reads the file name as latin1; the browser sends it in UTF-8 ("Designación…").
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        mimeType: file.mimetype,
        content: file.buffer,
      },
    });
    return { data: this.mapper.toResponse(view) };
  }
}
