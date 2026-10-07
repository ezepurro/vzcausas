import { ClientRef } from '../../core/domain/ports/client-lookup.port';
import { LegalQualificationRef } from '../../core/domain/ports/legal-qualification-lookup.port';

/**
 * Fixed data behind the stub adapters, while the subsystems that own it do
 * not exist yet. `cases` has foreign keys to these rows: a real insert only
 * works if the database holds clients and legal qualifications with the same ids.
 */

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
