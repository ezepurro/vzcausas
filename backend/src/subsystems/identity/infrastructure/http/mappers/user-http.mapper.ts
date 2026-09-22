import { RegisterUserCommand, RegisterUserResult } from "../../../core/application/use-cases/register-user.use-case";
import { Role } from "../../../core/domain/entities/role.entity";
import { RegisterUserRequestDto } from "../dtos/register-user.request.dto";
import { UserResponseDto } from "../dtos/user.response.dto";

/**
 * Translates between HTTP DTOs and the `identity` application layer.
 * Per the architecture (§5.3), this is the only place that should
 * know both vocabularies — the use case never sees a DTO, and the
 * controller never builds a command by hand.
 */
export class UserHttpMapper {
  static toRegisterCommand(dto: RegisterUserRequestDto): RegisterUserCommand {
    return {
      username: dto.username,
      fullName: dto.fullName,
      email: dto.email,
      plainPassword: dto.password,
      roles: dto.roles,
      lawyerId: dto.lawyerId ?? null,
    };
  }

  static toResponse(result: RegisterUserResult): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = result.user.id;
    dto.username = result.user.username.toString();
    dto.fullName = result.user.fullName;
    dto.email = result.user.email.toString();
    dto.roles = result.roles.map((role: Role) => role.getName());
    // `lawyer` stays null until `people` (HU-12) can resolve the
    // linked professional record — see LawyerLookupPort.
    dto.lawyer = null;
    dto.lastLoginAt = result.user.lastLoginAt?.toISOString() ?? null;
    dto.active = result.user.isActive();
    return dto;
  }
}
