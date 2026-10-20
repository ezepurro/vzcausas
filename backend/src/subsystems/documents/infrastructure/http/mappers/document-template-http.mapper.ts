import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import { DocumentTemplateView } from '../../../core/domain/ports/document-template.repository';
import { DocumentTemplateResponseDto } from '../dtos/document-template.response.dto';

/** A registered template to the contract's resource: only the date changes. */
@Injectable()
export class DocumentTemplateHttpMapper {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  toResponse(view: DocumentTemplateView): DocumentTemplateResponseDto {
    return { ...view, lastVersionAt: toIsoWithOffset(view.lastVersionAt, this.timeZone) };
  }
}
