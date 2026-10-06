import { ClientRef } from '../../core/domain/ports/client-lookup.port';
import { JurisdictionRef } from '../../core/domain/ports/jurisdiction-lookup.port';
import { LegalQualificationRef } from '../../core/domain/ports/legal-qualification-lookup.port';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';

/**
 * Fixed data behind the stub adapters, while the subsystems that own it do
 * not exist yet. `cases` has foreign keys to these rows: a real insert only
 * works if the database holds rows with the same ids.
 */

// TODO: replaced by `legal-parameters` (jurisdictions and their initial state).
export const STUB_JURISDICTIONS: JurisdictionRef[] = [
  { id: 1, code: JurisdictionCode.CRIMINAL, initialStateId: 1 },
  { id: 2, code: JurisdictionCode.ADMINISTRATIVE, initialStateId: 2 },
  { id: 3, code: JurisdictionCode.AMPARO, initialStateId: 3 },
];

// TODO: replaced by `people` (clients).
export const STUB_CLIENTS: ClientRef[] = [
  {
    id: 1,
    lastName: 'GÓMEZ',
    firstName: 'Ariel Fernando',
    dni: '34812905',
    phone: '351 415-2288',
    email: 'afgomez@gmail.com',
    clientSince: new Date('2021-03-12T00:00:00.000Z'),
  },
  {
    id: 2,
    lastName: 'MOYANO',
    firstName: 'Daniela',
    dni: '30211876',
    phone: null,
    email: null,
    clientSince: new Date('2026-09-08T00:00:00.000Z'),
  },
];

// TODO: replaced by the legal qualifications catalog.
export const STUB_LEGAL_QUALIFICATIONS: LegalQualificationRef[] = [
  { id: 1, name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 },
  { id: 2, name: 'Homicidio simple — art. 79 CP', prescriptionMonths: 180 },
];
