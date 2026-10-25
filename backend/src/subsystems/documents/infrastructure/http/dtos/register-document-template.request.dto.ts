import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Text fields of the `multipart/form-data` body of `POST /document-templates`
 * (HU34). The file comes apart, through `FileInterceptor`.
 *
 * Only the shape is checked here. Whether a field is missing or invalid is the
 * entity's job, so that all the problems, the file included, come back in one
 * 400 (CA-34.4).
 */
export class RegisterDocumentTemplateRequestDto {
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  name?: string;

  /** The field is repeated once per jurisdiction; with only one it arrives as a plain string. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsString({ each: true, message: 'Cada fuero debe ser un texto.' })
  jurisdictions?: string[];

  /** A form sends text: `"true"` or `"false"`. */
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean({ message: 'Debe ser true o false.' })
  copyToNewCases?: boolean;
}
