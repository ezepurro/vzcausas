import { Injectable } from '@nestjs/common';
import {
  LegalQualificationLookupPort,
  LegalQualificationRef,
} from '../../core/domain/ports/legal-qualification-lookup.port';
import { STUB_LEGAL_QUALIFICATIONS } from './stub-data';

/** Stub of {@link LegalQualificationLookupPort}: the catalog has no subsystem yet. */
@Injectable()
export class StubLegalQualificationLookupAdapter implements LegalQualificationLookupPort {
  async findActiveByIds(ids: number[]): Promise<LegalQualificationRef[]> {
    return STUB_LEGAL_QUALIFICATIONS.filter((qualification) => ids.includes(qualification.id));
  }
}
