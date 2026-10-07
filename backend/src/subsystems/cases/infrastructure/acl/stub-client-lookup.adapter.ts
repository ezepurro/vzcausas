import { Injectable } from '@nestjs/common';
import { ClientLookupPort, ClientRef } from '../../core/domain/ports/client-lookup.port';
import { STUB_CLIENTS } from './stub-data';

/** Stub of {@link ClientLookupPort}: `people` has no client use cases yet. */
@Injectable()
export class StubClientLookupAdapter implements ClientLookupPort {
  async findActiveById(id: number): Promise<ClientRef | null> {
    return STUB_CLIENTS.find((client) => client.id === id) ?? null;
  }
}
