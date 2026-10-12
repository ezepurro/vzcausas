import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@shared/infrastructure/http/require-permissions.decorator';
import { FindLegalQualification } from '@subsystems/legal-parameters/core/application/use-cases/find-legal-qualification.use-case';
import { RegisterLegalQualification } from '@subsystems/legal-parameters/core/application/use-cases/register-legal-qualification.use-case';
import { ViewLegalQualifications } from '@subsystems/legal-parameters/core/application/use-cases/view-legal-qualifications.use-case';
import { InvalidLegalQualificationIdError } from '@subsystems/legal-parameters/core/domain/errors/legal-parameters.errors';
import { getQualificationsQueryDto } from '../dtos/get-qualifications.dto';
import {
  LegalQualificationResponseDto,
  LegalQualificationsListResponseDto,
  RegisteredLegalQualificationResponseDto,
} from '../dtos/legal-qualification.response.dto';
import { RegisterQualificationRequestDto } from '../dtos/register-qualification.request.dto';
import { LegalQualificationHttpMapper } from '../mappers/legal-qualification-http.mapper';

/**
 * HTTP entry point for `/legal-qualifications` (contract §3.5).
 *
 * Authorization: the three profiles read and register legal
 * qualifications (matriz de permisos §5.1, 2026-10-11). Reading was
 * always open, because the case registration form offers the selector
 * to every profile (CA-47.1, CA-47.10); writing used to be the
 * Administrator's alone (CA-48.9, D-04). Who holds each permission is
 * decided in `prisma/seed.ts`, not here: the decorators stay so that a
 * token without the permission is still refused.
 *
 * `PATCH` and `DELETE` are out of scope for Sprint 2 by the stories'
 * own definition; modifying `prescriptionMonths` also recalculates
 * the prescription of the cases that register the qualification, and
 * that belongs with HU-18.
 */
@Controller({ path: 'legal-qualifications', version: ['1'] })
export class LegalQualificationsController {
  constructor(
    private readonly registerQualification: RegisterLegalQualification,
    private readonly viewQualifications: ViewLegalQualifications,
    private readonly findQualification: FindLegalQualification,
  ) {}

  @RequirePermissions('qualification:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterQualificationRequestDto,
  ): Promise<{ data: RegisteredLegalQualificationResponseDto }> {
    const result = await this.registerQualification.execute({
      name: dto.name,
      prescriptionMonths: dto.prescriptionMonths,
    });
    return { data: LegalQualificationHttpMapper.toRegisteredResponse(result.qualification) };
  }

  /**
   * Declared before `@Get(':qualificationId')`: Nest matches routes in
   * declaration order, and the parametric one would otherwise swallow
   * `GET /legal-qualifications` as a request for the qualification
   * whose id is the empty string.
   */
  @RequirePermissions('qualification:read')
  @Get()
  async findAll(
    @Query() query: getQualificationsQueryDto,
  ): Promise<LegalQualificationsListResponseDto> {
    const result = await this.viewQualifications.getAll(query);
    return LegalQualificationHttpMapper.toListResponse(result);
  }

  @RequirePermissions('qualification:read')
  @Get(':qualificationId')
  async findOne(
    @Param('qualificationId') qualificationIdParam: string,
  ): Promise<{ data: LegalQualificationResponseDto }> {
    const result = await this.findQualification.execute({
      id: this.parseQualificationId(qualificationIdParam),
    });
    return { data: LegalQualificationHttpMapper.toResponse(result) };
  }

  private parseQualificationId(raw: string): number {
    const qualificationId = Number(raw);
    if (!Number.isInteger(qualificationId) || qualificationId <= 0) {
      throw new InvalidLegalQualificationIdError();
    }
    return qualificationId;
  }
}
