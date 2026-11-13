import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@shared/infrastructure/http/require-permissions.decorator';
import { DeactivateLegalQualification } from '@subsystems/legal-parameters/core/application/use-cases/deactivate-legal-qualification.use-case';
import { FindLegalQualification } from '@subsystems/legal-parameters/core/application/use-cases/find-legal-qualification.use-case';
import { RegisterLegalQualification } from '@subsystems/legal-parameters/core/application/use-cases/register-legal-qualification.use-case';
import { UpdateLegalQualification } from '@subsystems/legal-parameters/core/application/use-cases/update-legal-qualification.use-case';
import { ViewLegalQualifications } from '@subsystems/legal-parameters/core/application/use-cases/view-legal-qualifications.use-case';
import { InvalidLegalQualificationIdError } from '@subsystems/legal-parameters/core/domain/errors/legal-parameters.errors';
import { getQualificationsQueryDto } from '../dtos/get-qualifications.dto';
import {
  LegalQualificationResponseDto,
  LegalQualificationsListResponseDto,
  RegisteredLegalQualificationResponseDto,
} from '../dtos/legal-qualification.response.dto';
import { RegisterQualificationRequestDto } from '../dtos/register-qualification.request.dto';
import { UpdateQualificationRequestDto } from '../dtos/update-qualification.request.dto';
import { LegalQualificationHttpMapper } from '../mappers/legal-qualification-http.mapper';

/**
 * HTTP entry point for `/legal-qualifications` (contract §3.5).
 *
 * Authorization: the three profiles read, register, modify and give up
 * legal qualifications (matriz de permisos §5.1, 2026-10-11, D-39; HU47
 * to HU50). Reading was always open, because the case registration form
 * offers the selector to every profile (CA-47.1, CA-47.10); writing used
 * to be the Administrator's alone (CA-48.9, D-04). Who holds each
 * permission is decided in `prisma/seed.ts`, not here: the decorators
 * stay so that a token without the permission is still refused.
 *
 * Modifying `prescriptionMonths` recalculates the prescription of the
 * cases that register the qualification without anything to do here:
 * they reference it and compute on every read (CA-49.4, D-08).
 */
@Controller({ path: 'legal-qualifications', version: ['1'] })
export class LegalQualificationsController {
  constructor(
    private readonly registerQualification: RegisterLegalQualification,
    private readonly viewQualifications: ViewLegalQualifications,
    private readonly findQualification: FindLegalQualification,
    private readonly updateQualification: UpdateLegalQualification,
    private readonly deactivateQualification: DeactivateLegalQualification,
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

  /** HU49. Same shape as the `POST`: no `activeCases` (CA-49.5, D-32). */
  @RequirePermissions('qualification:update')
  @Patch(':qualificationId')
  async update(
    @Param('qualificationId') qualificationIdParam: string,
    @Body() dto: UpdateQualificationRequestDto,
  ): Promise<{ data: RegisteredLegalQualificationResponseDto }> {
    const result = await this.updateQualification.execute({
      id: this.parseQualificationId(qualificationIdParam),
      name: dto.name,
      prescriptionMonths: dto.prescriptionMonths,
    });
    return { data: LegalQualificationHttpMapper.toRegisteredResponse(result.qualification) };
  }

  /** HU50. Logical deletion; answers 204 with no body (CA-50.1). */
  @RequirePermissions('qualification:delete')
  @Delete(':qualificationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('qualificationId') qualificationIdParam: string): Promise<void> {
    await this.deactivateQualification.execute({ id: this.parseQualificationId(qualificationIdParam) });
  }

  private parseQualificationId(raw: string): number {
    const qualificationId = Number(raw);
    if (!Number.isInteger(qualificationId) || qualificationId <= 0) {
      throw new InvalidLegalQualificationIdError();
    }
    return qualificationId;
  }
}
