import { ValidationError } from '@shared/domain/domain-error';
import { AdministrativeCase } from '../entities/administrative';
import { Amparo } from '../entities/amparo';
import { Case, CaseProps } from '../entities/cases';
import { CriminalCase } from '../entities/criminal';
import { Offense } from '../entities/offense';
import { LegalQualificationRef } from '../ports/legal-qualification-lookup.port';
import { ProceduralStateRef } from '../ports/proc-state-lookup.port';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { isRoleAllowedIn, ProceduralRole } from '../value-objects/procedural-role';

export interface NewCaseInput {
  id: number;
  jurisdictionCode: JurisdictionCode;
  // The initial state of the jurisdiction, found by the caller. The case takes its jurisdiction from it.
  initialState: ProceduralStateRef;
  sacNumber?: string | null;
  caption: string;
  court?: string | null;
  instructorName?: string | null;
  instructorPhone?: string | null;
  instructorExtension?: string | null;
  counterparty?: string | null;
  subjectMatter?: string | null;
  clientId: number;
  proceduralRole: ProceduralRole;
  // `offenseDate` is undefined if missing and an invalid Date if malformed.
  legalQualifications: { legalQualificationId: number; offenseDate?: Date }[];
  // The existing legal qualifications among the requested ones.
  legalQualificationRefs: LegalQualificationRef[];
  responsibleLawyerId: number;
  // Required when there is a SAC number, not allowed when there is none (CA-18.2).
  startDate?: Date | null;
  createdByUserId: number;
  // Civil date of the study today, and the instant of creation.
  today: Date;
  now: Date;
}

type Errors = Record<string, string>;

/** Text trimmed, with blank treated as absent. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isValidDate(date: Date | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Builds a new {@link Case} of the kind that matches its jurisdiction.
 *
 * It checks every rule of the registration (HU18) and reports all the
 * problems together, keyed by field, as the API contract shows. The
 * caller can pass the errors it found on its own (unknown client, lawyer,
 * qualification) so they are reported in the same answer.
 */
export class CaseFactory {
  static create(input: NewCaseInput, referenceErrors: Errors = {}): Case {
    const errors: Errors = { ...referenceErrors };
    const isCriminal = input.jurisdictionCode === JurisdictionCode.CRIMINAL;

    const sacNumber = clean(input.sacNumber);
    const caption = clean(input.caption);
    const court = clean(input.court);
    const instructorName = clean(input.instructorName);
    const instructorPhone = clean(input.instructorPhone);
    const instructorExtension = clean(input.instructorExtension);
    const counterparty = clean(input.counterparty);
    const subjectMatter = clean(input.subjectMatter);

    if (sacNumber !== null && !/^\d{8}$/.test(sacNumber)) {
      errors.sacNumber = 'Debe contener exactamente 8 dígitos.';
    }
    if (caption === null) {
      errors.caption = 'Es obligatoria.';
    }
    CaseFactory.checkLength(errors, 'caption', caption, 255);
    CaseFactory.checkLength(errors, 'court', court, 255);
    CaseFactory.checkLength(errors, 'instructorName', instructorName, 150);
    CaseFactory.checkLength(errors, 'instructorPhone', instructorPhone, 50);
    CaseFactory.checkLength(errors, 'instructorExtension', instructorExtension, 20);
    CaseFactory.checkLength(errors, 'counterparty', counterparty, 255);
    CaseFactory.checkLength(errors, 'subjectMatter', subjectMatter, 800);

    if (!isRoleAllowedIn(input.proceduralRole, input.jurisdictionCode)) {
      errors.proceduralRole = 'El rol procesal no corresponde al fuero.';
    }

    if (isCriminal) {
      if (counterparty !== null) {
        errors.counterparty = 'No se informa en el fuero penal.';
      }
      if (subjectMatter !== null) {
        errors.subjectMatter = 'No se informa en el fuero penal.';
      }
    } else {
      if (subjectMatter === null) {
        errors.subjectMatter = 'Es obligatorio en los fueros administrativo y de amparo.';
      }
      if (input.legalQualifications.length > 0) {
        errors.legalQualifications = 'Solo corresponden al fuero penal.';
      }
    }

    const startDate = input.startDate ?? undefined;
    if (sacNumber !== null && startDate === undefined) {
      errors.startDate = 'Es obligatoria cuando se informa el número de SAC.';
    } else if (sacNumber === null && startDate !== undefined) {
      errors.startDate = 'No se informa si la causa no tiene número de SAC.';
    } else if (startDate !== undefined && !isValidDate(startDate)) {
      errors.startDate = 'Debe ser una fecha válida (AAAA-MM-DD).';
    } else if (startDate !== undefined && startDate > input.today) {
      errors.startDate = 'No puede ser posterior a la fecha de hoy.';
    }

    const offenses = CaseFactory.checkQualifications(errors, input);

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', errors);
    }

    const props: CaseProps = {
      id: input.id,
      sacNumber,
      caption: caption as string,
      court,
      jurisdictionId: input.initialState.jurisdictionId,
      proceduralRole: input.proceduralRole,
      instructor: { name: instructorName, phone: instructorPhone, extension: instructorExtension },
      clientId: input.clientId,
      responsibleLawyerId: input.responsibleLawyerId,
      // `cases.start_date` cannot be empty: a case without SAC gets today's date.
      startDate: startDate ?? input.today,
      // Every case starts in the "Iniciada" state of its jurisdiction.
      currentStateId: input.initialState.id,
      currentCustomState: null,
      currentProceduralActId: null,
      proceduralActs: [],
      active: true,
      createdByUserId: input.createdByUserId,
      createdAt: input.now,
      updatedAt: input.now,
    };

    switch (input.jurisdictionCode) {
      case JurisdictionCode.CRIMINAL:
        return CriminalCase.hydrate({ ...props, offenses });
      case JurisdictionCode.ADMINISTRATIVE:
        return AdministrativeCase.hydrate({ ...props, counterparty, subjectMatter: subjectMatter as string });
      case JurisdictionCode.AMPARO:
        return Amparo.hydrate({ ...props, counterparty, subjectMatter: subjectMatter as string });
    }
  }

  private static checkLength(errors: Errors, field: string, value: string | null, max: number): void {
    if (value !== null && value.length > max && !errors[field]) {
      errors[field] = `Debe tener como máximo ${max} caracteres.`;
    }
  }

  /** Validates the qualifications of the request and returns the offenses they make up. */
  private static checkQualifications(errors: Errors, input: NewCaseInput): Offense[] {
    const result: Offense[] = [];
    const seen = new Set<number>();

    for (const item of input.legalQualifications) {
      if (!isValidDate(item.offenseDate)) {
        errors.legalQualifications ??= 'Cada calificación legal requiere la fecha del hecho.';
        continue;
      }
      if (item.offenseDate > input.today) {
        errors.legalQualifications ??= 'La fecha del hecho no puede ser posterior a hoy.';
      }
      if (seen.has(item.legalQualificationId)) {
        errors.legalQualifications ??= 'No puede haber calificaciones legales repetidas.';
      }
      seen.add(item.legalQualificationId);
      const legalQualification = input.legalQualificationRefs.find((ref) => ref.id === item.legalQualificationId);
      // An unknown qualification is already reported by the caller.
      if (legalQualification) {
        result.push(Offense.hydrate({ legalQualification, offenseDate: item.offenseDate, prescriptionExpiresOn: null }));
      }
    }

    return result;
  }
}
