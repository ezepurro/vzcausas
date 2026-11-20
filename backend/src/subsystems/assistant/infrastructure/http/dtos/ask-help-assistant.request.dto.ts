import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const MESSAGES_COUNT = 'Debe incluir entre 1 y 20 mensajes.';
const CONTENT_LENGTH = 'Debe tener entre 1 y 2000 caracteres.';

/**
 * "An array of 1 to 20 items" as **one** rule. With `@IsArray`,
 * `@ArrayMinSize` and `@ArrayMaxSize` a missing field fails the three, and the
 * global pipe joins their messages (`flatten`, `app.setup.ts:112`) into the
 * same sentence three times.
 */
@ValidatorConstraint({ name: 'messagesCount' })
class MessagesCount implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return Array.isArray(value) && value.length >= 1 && value.length <= 20;
  }

  defaultMessage(): string {
    return MESSAGES_COUNT;
  }
}

/** A string of 1 to 2000 characters, as one rule (see `MessagesCount`). */
@ValidatorConstraint({ name: 'contentLength' })
class ContentLength implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length >= 1 && value.length <= 2000;
  }

  defaultMessage(): string {
    return CONTENT_LENGTH;
  }
}

/**
 * One message of the conversation (proposal §2, table of the body). The
 * messages are the ones of the proposal, in Spanish: the global pipe keys them
 * `messages.<i>.role` / `messages.<i>.content`.
 */
export class HelpMessageDto {
  @IsIn(['user', 'assistant'], { message: 'Debe ser user o assistant.' })
  role!: 'user' | 'assistant';

  // Length counted without the spaces at both ends (proposal §2). One rule
  // for the same reason as `MessagesCount`: a number would fail both
  // `@IsString` and `@Length` and repeat the message.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Validate(ContentLength)
  content!: string;
}

/** Body of `POST /help/assistant`. */
export class AskHelpAssistantRequestDto {
  @Validate(MessagesCount)
  @ValidateNested({ each: true })
  @Type(() => HelpMessageDto)
  messages!: HelpMessageDto[];
}
