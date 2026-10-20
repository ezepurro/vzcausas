import { ValidationError } from '@shared/domain/domain-error';
import { AdministrativeCase } from '../entities/administrative';
import { Amparo } from '../entities/amparo';
import { Case, CaseProps } from '../entities/cases';
import { CriminalCase } from '../entities/criminal';
import { Offense } from '../entities/offense';
import { LegalQualificationRef, ProceduralStateRef } from '../ports/legal-parameters-lookup.port';
import { DayType } from '../value-objects/day-type';
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
  tribunalPhone?: string | null;
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
  // Data of each jurisdiction (D-67). Outside its own jurisdiction a datum is not sent: `undefined` or `null`.
  // CRIMINAL.
  clientDetained?: boolean | null;
  // AMPARO.
  injunctionGranted?: boolean | null;
  // `undefined` if missing and an invalid Date if malformed.
  harmfulActDate?: Date | null;
  harmfulActRenews?: boolean | null;
  harmfulActRenewalDays?: number | null;
  harmfulActTermDays?: number | null;
  harmfulActTermDayType?: DayType | null;
  // ADMINISTRATIVE.
  administrativeRemedyExhaustedOn?: Date | null;
  // The three jurisdictions. Defaults to `false`.
  courtFeePaid?: boolean | null;
  // Civil date of the study today, and the instant of creation.
  today: Date;
  now: Date;
}

type Errors = Record<string, string>;

/** A datum counts as sent when it is neither missing nor `null`. */
function isSent(value: unknown): boolean {
  return value !== undefined && value !== null;
}

const ONLY_CRIMINAL = 'Solo corresponde al fuero penal.';
const ONLY_AMPARO = 'Solo corresponde al fuero de amparo.';
const ONLY_ADMINISTRATIVE = 'Solo corresponde al fuero administrativo.';

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
    const tribunalPhone = clean(input.tribunalPhone);
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
    CaseFactory.checkLength(errors, 'tribunalPhone', tribunalPhone, 50);
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
    const harmfulAct = CaseFactory.checkJurisdictionData(errors, input);

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
      instructor: { name: instructorName, phone: tribunalPhone, extension: instructorExtension },
      clientId: input.clientId,
      responsibleLawyerId: input.responsibleLawyerId,
      // Without a SAC number the case has not started in court yet: there is no date to invent.
      startDate: startDate ?? null,
      courtFeePaid: input.courtFeePaid ?? false,
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
        return CriminalCase.hydrate({ ...props, offenses, clientDetained: input.clientDetained ?? false });
      case JurisdictionCode.ADMINISTRATIVE:
        return AdministrativeCase.hydrate({
          ...props,
          counterparty,
          subjectMatter: subjectMatter as string,
          administrativeRemedyExhaustedOn: input.administrativeRemedyExhaustedOn ?? null,
        });
      case JurisdictionCode.AMPARO:
        return Amparo.hydrate({
          ...props,
          counterparty,
          subjectMatter: subjectMatter as string,
          injunctionGranted: input.injunctionGranted ?? false,
          harmfulActDate: harmfulAct.date,
          harmfulActRenews: harmfulAct.renews,
          harmfulActRenewalDays: harmfulAct.renewalDays,
          harmfulActTermDays: harmfulAct.termDays,
          harmfulActTermDayType: harmfulAct.termDayType,
        });
    }
  }

  /**
   * Validates the data of each jurisdiction (D-67) and returns the harmful act
   * of an amparo, already normalized (all `null`/`false` outside it).
   *
   * Every datum belongs to one jurisdiction and is not sent in the others. In its
   * own, the harmful act follows the coherence of the `ck_cases_harmful_act_*`
   * constraints: renewal days if and only if the act renews, and the term (days
   * and day type) if and only if there is a date.
   */
  private static checkJurisdictionData(
    errors: Errors,
    input: NewCaseInput,
  ): {
    date: Date | null;
    renews: boolean;
    renewalDays: number | null;
    termDays: number | null;
    termDayType: DayType | null;
  } {
    const none = { date: null, renews: false, renewalDays: null, termDays: null, termDayType: null };
    const isAmparo = input.jurisdictionCode === JurisdictionCode.AMPARO;
    const isAdministrative = input.jurisdictionCode === JurisdictionCode.ADMINISTRATIVE;

    if (input.jurisdictionCode !== JurisdictionCode.CRIMINAL && isSent(input.clientDetained)) {
      errors.clientDetained = ONLY_CRIMINAL;
    }
    if (!isAdministrative && isSent(input.administrativeRemedyExhaustedOn)) {
      errors.administrativeRemedyExhaustedOn = ONLY_ADMINISTRATIVE;
    }
    if (isAdministrative && isSent(input.administrativeRemedyExhaustedOn)) {
      CaseFactory.checkPastDate(errors, 'administrativeRemedyExhaustedOn', input.administrativeRemedyExhaustedOn, input.today);
    }

    const amparoFields = [
      'injunctionGranted',
      'harmfulActDate',
      'harmfulActRenews',
      'harmfulActRenewalDays',
      'harmfulActTermDays',
      'harmfulActTermDayType',
    ] as const;
    if (!isAmparo) {
      for (const field of amparoFields) {
        if (isSent(input[field])) {
          errors[field] = ONLY_AMPARO;
        }
      }
      return none;
    }

    const date = input.harmfulActDate ?? null;
    const renews = input.harmfulActRenews ?? false;
    const renewalDays = input.harmfulActRenewalDays ?? null;
    const termDays = input.harmfulActTermDays ?? null;
    const termDayType = input.harmfulActTermDayType ?? null;

    if (date !== null) {
      CaseFactory.checkPastDate(errors, 'harmfulActDate', date, input.today);
    }

    if (renews && renewalDays === null) {
      errors.harmfulActRenewalDays = 'Indicá cada cuántos días se renueva el acto lesivo.';
    } else if (!renews && renewalDays !== null) {
      errors.harmfulActRenewalDays = 'Solo se informa si el acto lesivo se renueva.';
    } else if (renewalDays !== null && !CaseFactory.isPositiveInteger(renewalDays)) {
      errors.harmfulActRenewalDays = 'Debe ser un número entero mayor o igual a 1.';
    }

    if (date !== null) {
      if (termDays === null) {
        errors.harmfulActTermDays = 'Indicá el plazo para presentar el amparo.';
      } else if (!CaseFactory.isPositiveInteger(termDays)) {
        errors.harmfulActTermDays = 'Debe ser un número entero mayor o igual a 1.';
      }
      if (termDayType === null) {
        errors.harmfulActTermDayType = 'Indicá si el plazo se cuenta en días hábiles o corridos.';
      } else if (termDayType !== DayType.BUSINESS && termDayType !== DayType.CONSECUTIVE) {
        errors.harmfulActTermDayType = 'Debe ser BUSINESS o CONSECUTIVE.';
      }
    } else {
      if (termDays !== null) {
        errors.harmfulActTermDays = 'Solo se informa junto con la fecha del acto lesivo.';
      }
      if (termDayType !== null) {
        errors.harmfulActTermDayType = 'Solo se informa junto con la fecha del acto lesivo.';
      }
    }

    return { date, renews, renewalDays: renews ? renewalDays : null, termDays, termDayType };
  }

  private static isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value >= 1;
  }

  /** A date that must be valid and not after today. */
  private static checkPastDate(errors: Errors, field: string, value: Date | null | undefined, today: Date): void {
    if (!isValidDate(value ?? undefined)) {
      errors[field] = 'Debe ser una fecha válida (AAAA-MM-DD).';
    } else if (value && value > today) {
      errors[field] = 'No puede ser posterior a la fecha de hoy.';
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
        result.push(
          Offense.hydrate({ legalQualification, offenseDate: item.offenseDate, prescriptionExpiresOn: null }),
        );
      }
    }

    return result;
  }
}
