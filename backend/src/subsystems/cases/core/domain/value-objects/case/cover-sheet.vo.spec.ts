import { ClientRef, LawyerRef } from '../../ports/case/people-lookup.port';
import { CoverSheet, CoverSheetSource } from './cover-sheet.vo';
import { JurisdictionCode } from './jurisdiction-code';
import { ProceduralRole } from './procedural-role';

const LAWYER_VAZQUEZ: LawyerRef = { id: 1, lastName: 'Vazquez', firstName: 'Fernando', registrationNumber: '1-1' };

function aClient(lastName: string, firstName: string): ClientRef {
  return {
    id: 7,
    lastName,
    firstName,
    documentType: 'DNI',
    documentNumber: '1',
    address: 'Av. Colón 1320, Córdoba',
    phone: '351 530-1177',
    email: null,
    clientSince: new Date('2021-01-01'),
  };
}

/** C1 of the HU24 test plan: criminal, defense, with SAC. Override what each case needs. */
function aSource(overrides: Partial<CoverSheetSource> = {}): CoverSheetSource {
  return {
    id: 41,
    sacNumber: '13284571',
    caption: 'Sánchez, Celia p.s.a. Robo calificado',
    court: 'Juzgado de Control N° 3 · Córdoba',
    jurisdiction: JurisdictionCode.CRIMINAL,
    proceduralRole: ProceduralRole.DEFENSA,
    instructorName: 'Dra. Verónica Ledesma',
    counterparty: null,
    client: aClient('Sánchez', 'Celia'),
    responsibleLawyer: LAWYER_VAZQUEZ,
    ...overrides,
  };
}

describe('CoverSheet', () => {
  describe('parties (D-94)', () => {
    it('criminal defense: the client is the accused, with the lawyer under it; plaintiff empty (CA-24.4, CA-24.7)', () => {
      const sheet = CoverSheet.create(aSource());

      expect(sheet.defendant).toEqual(['SÁNCHEZ CELIA', 'DEFENSOR: DR. FERNANDO VAZQUEZ']);
      expect(sheet.plaintiff).toEqual([]);
    });

    it('criminal private prosecutor: the client is the plaintiff, with the lawyer under it; defendant empty (CA-24.5, CA-24.7)', () => {
      const sheet = CoverSheet.create(
        aSource({
          proceduralRole: ProceduralRole.QUERELLANTE_PARTICULAR,
          client: aClient('González', 'María del Pilar'),
        }),
      );

      expect(sheet.plaintiff).toEqual(['QUERELLANTE (GONZÁLEZ MARÍA DEL PILAR)', 'DEFENSOR: DR. FERNANDO VAZQUEZ']);
      expect(sheet.defendant).toEqual([]);
    });

    it.each([JurisdictionCode.ADMINISTRATIVE, JurisdictionCode.AMPARO])(
      '%s with role DEMANDADA: plaintiff is the counterparty, defendant is the client (CA-24.6)',
      (jurisdiction) => {
        const sheet = CoverSheet.create(
          aSource({
            jurisdiction,
            proceduralRole: ProceduralRole.DEMANDADA,
            client: aClient('Caja de Jubilaciones', ''),
            counterparty: 'Candia, Claro Daniel',
          }),
        );

        expect(sheet.plaintiff).toEqual(['CANDIA, CLARO DANIEL']);
        expect(sheet.defendant).toEqual(['CAJA DE JUBILACIONES']);
      },
    );

    it.each([JurisdictionCode.ADMINISTRATIVE, JurisdictionCode.AMPARO])(
      '%s with any other role: plaintiff is the client, defendant is the counterparty (CA-24.6)',
      (jurisdiction) => {
        const sheet = CoverSheet.create(
          aSource({
            jurisdiction,
            proceduralRole: ProceduralRole.ACTORA,
            client: aClient('Candia', 'Claro Daniel'),
            counterparty: 'Caja de Jubilaciones y Pensiones',
          }),
        );

        expect(sheet.plaintiff).toEqual(['CANDIA CLARO DANIEL']);
        expect(sheet.defendant).toEqual(['CAJA DE JUBILACIONES Y PENSIONES']);
      },
    );

    it('a null counterparty leaves its side empty, without the word "null" (CA-24.6)', () => {
      const sheet = CoverSheet.create(
        aSource({ jurisdiction: JurisdictionCode.ADMINISTRATIVE, proceduralRole: ProceduralRole.ACTORA, counterparty: null }),
      );

      expect(sheet.plaintiff).toEqual(['SÁNCHEZ CELIA']);
      expect(sheet.defendant).toEqual([]);
    });
  });

  describe('fixed boxes', () => {
    it('the SAC and the caption are copied in capitals (CA-24.1)', () => {
      const sheet = CoverSheet.create(aSource());

      expect(sheet.sacNumber).toBe('13284571');
      expect(sheet.caption).toBe('SÁNCHEZ, CELIA P.S.A. ROBO CALIFICADO');
    });

    it('a case without SAC leaves its box empty (CA-24.3)', () => {
      expect(CoverSheet.create(aSource({ sacNumber: null })).sacNumber).toBe('');
    });

    it('the intervening body is the court, the secretary label with the instructor and the instructor label, blank (CA-24.3, C-35)', () => {
      const sheet = CoverSheet.create(aSource());

      expect(sheet.interveningBody).toEqual([
        'JUZGADO DE CONTROL N° 3 · CÓRDOBA',
        'SECRETARIO/A: DRA. VERÓNICA LEDESMA',
        'INSTRUCTOR:',
      ]);
    });

    it('a null court or instructor leaves its line empty, the label alone for the secretary (CA-24.3)', () => {
      const sheet = CoverSheet.create(aSource({ court: null, instructorName: null }));

      expect(sheet.interveningBody).toEqual(['', 'SECRETARIO/A:', 'INSTRUCTOR:']);
    });

    it('keeps the jurisdiction, which picks the template (CA-24.2)', () => {
      expect(CoverSheet.create(aSource({ jurisdiction: JurisdictionCode.AMPARO })).jurisdiction).toBe(
        JurisdictionCode.AMPARO,
      );
    });

    it('observations are always empty (CA-24.3)', () => {
      expect(CoverSheet.create(aSource()).observations).toEqual([]);
    });
  });

  describe('fileName (CA-24.10)', () => {
    it('is built from the SAC', () => {
      expect(CoverSheet.create(aSource()).fileName).toBe('Caratula_13284571.pdf');
    });

    it('is built from the case id when there is no SAC', () => {
      expect(CoverSheet.create(aSource({ id: 41, sacNumber: null })).fileName).toBe('Caratula_causa-41.pdf');
    });
  });

  describe('forCaseFile (HU25, CA-25.5, D-92)', () => {
    const none = { notes: null, opposingParty: null };

    it('sin cover es la misma hoja que la carátula suelta', () => {
      expect(CoverSheet.forCaseFile(aSource(), none)).toEqual(CoverSheet.create(aSource()));
    });

    it('las observaciones van en mayúsculas, una línea por salto', () => {
      const sheet = CoverSheet.forCaseFile(aSource(), { notes: 'Causa conexa\n\nen DI T6', opposingParty: null });

      expect(sheet.observations).toEqual(['CAUSA CONEXA', 'EN DI T6']);
    });

    it('con el cliente como defensa, la parte va al recuadro del actor / querellante', () => {
      const sheet = CoverSheet.forCaseFile(aSource(), {
        notes: null,
        opposingParty: 'QUERELLANTE: Peralta Juan Carlos\nAPODERADO: Dr. Martín Sosa',
      });

      expect(sheet.plaintiff).toEqual(['QUERELLANTE: PERALTA JUAN CARLOS', 'APODERADO: DR. MARTÍN SOSA']);
      expect(sheet.defendant).toEqual(CoverSheet.create(aSource()).defendant);
    });

    it('con el cliente como querellante, la parte va al recuadro del demandado / imputado', () => {
      const source = aSource({ proceduralRole: ProceduralRole.QUERELLANTE_PARTICULAR });

      const sheet = CoverSheet.forCaseFile(source, { notes: null, opposingParty: 'Gómez Ariel' });

      expect(sheet.defendant).toEqual(['GÓMEZ ARIEL']);
      expect(sheet.plaintiff).toEqual(CoverSheet.create(source).plaintiff);
    });

    it.each([
      [JurisdictionCode.AMPARO, ProceduralRole.ACTORA],
      [JurisdictionCode.ADMINISTRATIVE, ProceduralRole.RECURRENTE],
    ])('en %s la parte responde 400 sobre cover', (jurisdiction, proceduralRole) => {
      const attempt = () =>
        CoverSheet.forCaseFile(aSource({ jurisdiction, proceduralRole }), { notes: null, opposingParty: 'X' });

      expect(attempt).toThrow(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: { cover: 'La parte de la carátula solo corresponde al fuero penal.' },
        }),
      );
    });
  });
});
