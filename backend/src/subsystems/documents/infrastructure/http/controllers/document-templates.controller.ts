import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ContentDisposition } from '@shared/infrastructure/http/content-disposition';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { PaginatedResponse, paginate, toPageRequest } from '@shared/infrastructure/http/pagination/pagination';
import { DeactivateDocumentTemplate } from '../../../core/application/use-cases/deactivate-document-template.use-case';
import { DownloadDocumentTemplate } from '../../../core/application/use-cases/download-document-template.use-case';
import { GetDocumentTemplate } from '../../../core/application/use-cases/get-document-template.use-case';
import { ListDocumentTemplates } from '../../../core/application/use-cases/list-document-templates.use-case';
import { UpdateDocumentTemplate } from '../../../core/application/use-cases/update-document-template.use-case';
import { RegisterDocumentTemplate } from '../../../core/application/use-cases/register-document-template.use-case';
import { InvalidTemplateIdError } from '../../../core/domain/errors/documents.errors';
import { DocumentTemplateResponseDto } from '../dtos/document-template.response.dto';
import { ListDocumentTemplatesQueryDto } from '../dtos/list-document-templates.query.dto';
import { RegisterDocumentTemplateRequestDto } from '../dtos/register-document-template.request.dto';
import { UpdateDocumentTemplateRequestDto } from '../dtos/update-document-template.request.dto';
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
 * reading included (CA-34.8, CA-35.7), a rule on roles that the use cases
 * check, as `cases` does with the responsible lawyer.
 */
@Controller({ path: 'document-templates', version: ['1'] })
export class DocumentTemplatesController {
  constructor(
    private readonly registerDocumentTemplate: RegisterDocumentTemplate,
    private readonly listDocumentTemplates: ListDocumentTemplates,
    private readonly getDocumentTemplate: GetDocumentTemplate,
    private readonly downloadDocumentTemplate: DownloadDocumentTemplate,
    private readonly updateDocumentTemplate: UpdateDocumentTemplate,
    private readonly deactivateDocumentTemplate: DeactivateDocumentTemplate,
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

  /** HU35: the active templates, alphabetical, optionally of one jurisdiction. */
  @Get()
  async list(
    @Query() query: ListDocumentTemplatesQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<DocumentTemplateResponseDto>> {
    const pageRequest = toPageRequest(query);
    const page = await this.listDocumentTemplates.execute({
      actor,
      jurisdiction: query.jurisdiction,
      copyToNewCases: query.copyToNewCases,
      ...pageRequest,
    });
    return paginate(
      page.items.map((view) => this.mapper.toResponse(view)),
      page.totalItems,
      pageRequest,
    );
  }

  /** HU35: one template. */
  @Get(':templateId')
  async get(
    @Param('templateId') templateIdParam: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: DocumentTemplateResponseDto }> {
    const view = await this.getDocumentTemplate.execute({ actor, templateId: this.parseTemplateId(templateIdParam) });
    return { data: this.mapper.toResponse(view) };
  }

  /**
   * HU35 and HU23: the template's `.docx` (CA-35.6, CA-23.1). The one success
   * response of the contract that is not JSON; its errors still are (CA-23.5).
   */
  @Get(':templateId/file')
  async download(
    @Param('templateId') templateIdParam: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const { file, content } = await this.downloadDocumentTemplate.execute({
      actor,
      templateId: this.parseTemplateId(templateIdParam),
    });
    return new StreamableFile(content, {
      type: file.mimeType,
      length: content.length,
      disposition: ContentDisposition.attachment(file.fileName).toString(),
    });
  }

  /**
   * HU36: modifies a template. `multipart/form-data` like the registration, because it may
   * carry the new `.docx`; every field is optional, at least one must come (CA-36.1).
   */
  @Patch(':templateId')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES, files: 1 } }))
  async update(
    @Param('templateId') templateIdParam: string,
    @Body() dto: UpdateDocumentTemplateRequestDto,
    @UploadedFile() file: UploadedTemplateFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: DocumentTemplateResponseDto }> {
    const view = await this.updateDocumentTemplate.execute({
      actor,
      templateId: this.parseTemplateId(templateIdParam),
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

  /**
   * HU37: gives a template de baja (RN12, D-126). Logical, with no way back: the
   * client no longer sees it. `204`, no body.
   */
  @Delete(':templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param('templateId') templateIdParam: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.deactivateDocumentTemplate.execute({ actor, templateId: this.parseTemplateId(templateIdParam) });
  }

  private parseTemplateId(raw: string): number {
    const templateId = Number(raw);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      throw new InvalidTemplateIdError();
    }
    return templateId;
  }
}
