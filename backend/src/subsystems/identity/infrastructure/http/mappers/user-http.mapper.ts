import { RegisterUserCommand } from "../../../core/application/use-cases/register-user.use-case";
import { UpdateUserCommand } from "../../../core/application/use-cases/update-user.use-case";
import { Role } from "../../../core/domain/entities/role.entity";
import { LawyerSummary } from "../../../core/domain/ports/lawyer-lookup.port";
import { User } from "../../../core/domain/entities/user.entity";
import { RegisterUserRequestDto } from "../dtos/register-user.request.dto";
import { UpdateUserRequestDto } from "../dtos/update-user.request.dto";
import { UserResponseDto } from "../dtos/user.response.dto";

/**
 * Shape shared by every use case that hands back a user to render
 * (`RegisterUser`, `GetUser`, `ListUsers`, ...).
 *
 * `lawyer` is optional so a caller that has not resolved the linked
 * record can omit it; it then renders as `null`, which is also the
 * right answer for a user who has no lawyer at all.
 */
export type UserWithRoles = {
  user: User;
  roles: Role[];
  lawyer?: LawyerSummary | null;
};

/**
 * Translates between HTTP DTOs and the `identity` application layer.
 * Per the architecture (§5.3), this is the only place that should
 * know both vocabularies — the use case never sees a DTO, and the
 * controller never builds a command by hand.
 */
export class UserHttpMapper {
  /**
   * `lawyer` is forwarded as a plain object, not the DTO instance:
   * the application layer must not end up holding a class that
   * carries `class-validator` metadata.
   */
  static toRegisterCommand(dto: RegisterUserRequestDto): RegisterUserCommand {
    return {
      username: dto.username,
      lastName: dto.lastName,
      firstName: dto.firstName,
      email: dto.email,
      plainPassword: dto.password,
      roles: dto.roles,
      lawyerId: dto.lawyerId ?? null,
      lawyer:
        dto.lawyer === undefined
          ? undefined
          : {
              lastName: dto.lawyer.lastName,
              firstName: dto.lawyer.firstName,
              registrationNumber: dto.lawyer.registrationNumber ?? null,
            },
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
      lastName: dto.lastName,
      firstName: dto.firstName,
      email: dto.email,
      roles: dto.roles,
      lawyerId: dto.lawyerId,
    };
  }

  static toResponse(result: UserWithRoles): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = result.user.id;
    dto.username = result.user.username.toString();
    dto.lastName = result.user.lastName;
    dto.firstName = result.user.firstName;
    dto.email = result.user.email.toString();
    dto.roles = result.roles.map((role: Role) => role.getName());
    // Resolved by the use case through `LawyerLookupPort`. This used
    // to be hardcoded to null while `people` did not exist; HU-12
    // landed, so a linked record now actually renders.
    dto.lawyer = result.lawyer ?? null;
    dto.lastLoginAt = result.user.lastLoginAt?.toISOString() ?? null;
    dto.active = result.user.isActive();
    return dto;
  }
}
