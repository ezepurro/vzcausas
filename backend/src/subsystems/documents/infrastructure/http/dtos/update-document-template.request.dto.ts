import { RegisterDocumentTemplateRequestDto } from './register-document-template.request.dto';

/**
 * Text fields of the `multipart/form-data` body of `PATCH /document-templates/{templateId}`
 * (HU36): the same as the registration's (CA-36.2: the jurisdictions are a list too, one
 * field per jurisdiction), and every one is optional. The file comes apart, through
 * `FileInterceptor`.
 *
 * Only the shape is checked here. Whether a field is invalid, or none was sent, is the
 * entity's job, so that all the problems come back in one 400 (CA-36.1).
 */
export class UpdateDocumentTemplateRequestDto extends RegisterDocumentTemplateRequestDto {}
