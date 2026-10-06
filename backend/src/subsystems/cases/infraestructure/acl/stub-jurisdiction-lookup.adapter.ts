import { Injectable } from '@nestjs/common';
import { JurisdictionLookupPort, JurisdictionRef } from '../../core/domain/ports/jurisdiction-lookup.port';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';
import { STUB_JURISDICTIONS } from './stub-data';

/** Stub of {@link JurisdictionLookupPort}: `legal-parameters` exposes no lookup use case yet. */
@Injectable()
export class StubJurisdictionLookupAdapter implements JurisdictionLookupPort {
  async findActiveByCode(code: JurisdictionCode): Promise<JurisdictionRef | null> {
    return STUB_JURISDICTIONS.find((jurisdiction) => jurisdiction.code === code) ?? null;
  }
}
