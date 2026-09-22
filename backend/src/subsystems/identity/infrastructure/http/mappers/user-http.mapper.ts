import { RegisterUserCommand } from "../../../core/application/use-cases/register-user.use-case";
import { UpdateUserCommand } from "../../../core/application/use-cases/update-user.use-case";
import { Role } from "../../../core/domain/entities/role.entity";
import { User } from "../../../core/domain/entities/user.entity";
import { RegisterUserRequestDto } from "../dtos/register-user.request.dto";
import { UpdateUserRequestDto } from "../dtos/update-user.request.dto";
import { UserResponseDto } from "../dtos/user.response.dto";

/** Shape shared by every use case that hands back a user to render (`RegisterUser`, `GetUser`, ...). */
export type UserWithRoles = { user: User; roles: Role[] };

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

  /**
   * `lawyerId` is passed through as-is (`undefined` | `null` |
   * `number`) — collapsing it (e.g. with `?? null`) would destroy the
   * "don't touch" vs "unlink" distinction PATCH semantics need.
   */
  static toUpdateCommand(
    dto: UpdateUserRequestDto,
    userId: number,
  ): UpdateUserCommand {
    return {
      id: userId,
      username: dto.username,
      fullName: dto.fullName,
      email: dto.email,
      roles: dto.roles,
      lawyerId: dto.lawyerId,
    };
  }

  static toResponse(result: UserWithRoles): UserResponseDto {
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
