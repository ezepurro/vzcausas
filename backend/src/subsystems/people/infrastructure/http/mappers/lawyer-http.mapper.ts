import { RegisterLawyerCommand } from "../../../core/application/use-cases/register-lawyer.use-case";
import { LawyerView } from "../../../core/application/use-cases/find-lawyer.use-case";
import { Lawyer } from "../../../core/domain/entities/lawyer.entity";
import { LawyerResponseDto } from "../dtos/lawyer.response.dto";
import { RegisterLawyerRequestDto } from "../dtos/register-lawyer.request.dto";

/**
 * A lawyer who has just been registered is responsible for no case yet, so
 * the `0` of the `POST` response is a fact, not a placeholder. It is spelled
 * out as a constant so it reads differently from the counted value that the
 * `GET`s pass in: the old constant here answered **every** response, which
 * made `GET /lawyers` look right while being wrong.
 */
const ACTIVE_CASES_ON_A_FRESH_LAWYER = 0;

export class LawyerHttpMapper {
  static toRegisterCommand(
    dto: RegisterLawyerRequestDto,
  ): RegisterLawyerCommand {
    return {
      lastName: dto.lastName,
      firstName: dto.firstName,
      registrationNumber: dto.registrationNumber,
    };
  }

  /**
   * `activeCases` is a parameter, not a constant: the caller is the one who
   * knows. `GET /lawyers` passes the count that `cases` returned;
   * {@link toRegisteredResponse} passes the definitional zero.
   */
  static toResponse(lawyer: Lawyer, activeCases: number): LawyerResponseDto {
    const dto = new LawyerResponseDto();
    dto.id = lawyer.id;
    dto.lastName = lawyer.lastName;
    dto.firstName = lawyer.firstName;
    dto.registrationNumber = lawyer.registrationNumber.toString();
    dto.activeCases = activeCases;
    dto.active = lawyer.isActive();
    return dto;
  }

  /** Response of `POST /lawyers`: a brand new lawyer has no cases yet. */
  static toRegisteredResponse(lawyer: Lawyer): LawyerResponseDto {
    return this.toResponse(lawyer, ACTIVE_CASES_ON_A_FRESH_LAWYER);
  }

  /**
   * Renders the flat {@link LawyerView} that `FindLawyer` returns.
   *
   * That use case deliberately hands back a plain object rather than
   * the entity (§6.3), so this overload exists instead of having the
   * controller rehydrate a `Lawyer` just to render it.
   */
  static fromView(view: LawyerView): LawyerResponseDto {
    const dto = new LawyerResponseDto();
    dto.id = view.id;
    dto.lastName = view.lastName;
    dto.firstName = view.firstName;
    dto.registrationNumber = view.registrationNumber;
    dto.activeCases = view.activeCases;
    dto.active = view.active;
    return dto;
  }
}
