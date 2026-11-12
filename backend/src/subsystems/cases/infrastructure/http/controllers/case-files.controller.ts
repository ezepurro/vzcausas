import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { GenerateCaseFile } from '../../../core/application/use-cases/case/generate-case-file.use-case';
import { InvalidCaseIdError } from '../../../core/domain/errors/case.errors';
import { CaseFileResponseDto } from '../dtos/case/case-file.response.dto';
import { GenerateCaseFileRequestDto } from '../dtos/case/generate-case-file.request.dto';
import { CaseFileHttpMapper } from '../mappers/case-file-http.mapper';

/**
 * `POST /cases/{caseId}/case-files` (HU25, contract V5 §3.12): generates the case
 * file of a case and saves it as a new version in its folder. Synchronous: the
 * answer brings it already saved (D-102). It is downloaded afterwards with
 * `GET /cases/{caseId}/documents/{documentId}/file` (`CaseDocumentsController`).
 *
 * Its own controller, like the documents and the cover. No permission is
 * declared: any authenticated user may generate it (matrix of HU18 to HU25).
 */
@Controller({ path: 'cases/:caseId/case-files', version: ['1'] })
export class CaseFilesController {
  constructor(
    private readonly generateCaseFile: GenerateCaseFile,
    private readonly mapper: CaseFileHttpMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async generate(
    @Param('caseId') caseIdParam: string,
    @Body() body: GenerateCaseFileRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: CaseFileResponseDto }> {
    const caseId = Number(caseIdParam);
    if (!Number.isInteger(caseId) || caseId <= 0) {
      throw new InvalidCaseIdError();
    }
    const caseFile = await this.generateCaseFile.execute({
      caseId,
      request: { documentIds: body.documentIds, cover: body.cover },
      actor,
    });
    return { data: this.mapper.toResponse(caseFile) };
  }
}
