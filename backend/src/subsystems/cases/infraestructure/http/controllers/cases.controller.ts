import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import { RegisterCaseResult } from '../../../core/application/common/register-case.interfaces';
import { RegisterCase } from '../../../core/application/use-cases/register-case.use-case';
import { AdministrativeCase } from '../../../core/domain/entities/administrative';
import { Amparo } from '../../../core/domain/entities/amparo';
import { CaseResponseDto } from '../dtos/case.response.dto';
import { RegisterCaseRequestDto } from '../dtos/register-case.request.dto';

/**
 * HTTP entry point for `/cases` (API contract §3.7). Any authenticated user
 * can register a case (RN11), so no permission is declared: the global
 * authentication guard is enough.
 */
@Controller({ path: 'cases', version: ['1'] })
export class CasesController {
  constructor(private readonly registerCase: RegisterCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterCaseRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: CaseResponseDto }> {
    const result = await this.registerCase.execute({ ...dto, createdByUserId: actor.userId });
    return { data: this.toResponse(result) };
  }

  private toResponse(result: RegisterCaseResult): CaseResponseDto {
    const { newCase, client, responsibleLawyer, currentState } = result;
    const hasCounterparty = newCase instanceof AdministrativeCase || newCase instanceof Amparo;

    return {
      id: newCase.id,
      sacNumber: newCase.sacNumber,
      caption: newCase.caption,
      court: newCase.court,
      jurisdiction: newCase.jurisdictionCode,
      proceduralRole: newCase.proceduralRole,
      instructorName: newCase.instructor.name,
      tribunalPhone: newCase.instructor.phone,
      instructorExtension: newCase.instructor.extension,
      counterparty: hasCounterparty ? newCase.counterparty : null,
      subjectMatter: hasCounterparty ? newCase.subjectMatter : null,
      client: { ...client, clientSince: toIsoDate(client.clientSince) },
      responsibleLawyer,
      legalQualifications: result.offenses.map((offense) => ({
        id: offense.legalQualificationId,
        name: offense.legalQualificationName,
        prescriptionMonths: offense.prescriptionMonths,
        offenseDate: toIsoDate(offense.offenseDate),
        prescriptionStartsOn: toIsoDate(offense.prescriptionStartsOn),
        prescriptionExpiresOn: offense.prescriptionExpiresOn && toIsoDate(offense.prescriptionExpiresOn),
      })),
      startDate: toIsoDate(newCase.startDate),
      // The fields that come from a procedural act stay empty: a new case has none yet.
      currentState: {
        proceduralStateId: currentState.isInitial ? null : currentState.id,
        name: currentState.name,
        custom: false,
        initial: currentState.isInitial,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
      },
      active: newCase.active,
    };
  }
}
