import { RegisterLawyerCommand } from "../../../core/application/use-cases/register-lawyer.use-case";
import { Lawyer } from "../../../core/domain/entities/lawyer.entity";
import { LawyerResponseDto } from "../dtos/lawyer.response.dto";
import { RegisterLawyerRequestDto } from "../dtos/register-lawyer.request.dto";

/**
 * `activeCases` counts the cases where this lawyer is the responsible
 * one. That lives in the `cases` subsystem, which is out of scope, so
 * the contract (§3.3) fixes the value at `0` until it exists — the
 * field is in the payload from day one so the resource's shape never
 * has to change.
 */
const ACTIVE_CASES_UNTIL_CASES_SUBSYSTEM_EXISTS = 0;

export class LawyerHttpMapper {
  static toRegisterCommand(
    dto: RegisterLawyerRequestDto,
  ): RegisterLawyerCommand {
    return {
      fullName: dto.fullName,
      registrationNumber: dto.registrationNumber,
    };
  }

  static toResponse(lawyer: Lawyer): LawyerResponseDto {
    const dto = new LawyerResponseDto();
    dto.id = lawyer.id;
    dto.fullName = lawyer.fullName;
    dto.registrationNumber = lawyer.registrationNumber.toString();
    dto.activeCases = ACTIVE_CASES_UNTIL_CASES_SUBSYSTEM_EXISTS;
    dto.active = lawyer.isActive();
    return dto;
  }
}
