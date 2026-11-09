import { LegalQualificationRef } from '../ports/case/legal-parameters-lookup.port';
import { Offense } from '../entities/case/offense.entity';
import { DayType } from '../value-objects/deadline/day-type';

/** Field → message, as the contract's `details` of a `VALIDATION_ERROR`. */
export type FieldErrors = Record<string, string>;

/** A legal qualification as the forms send it: `offenseDate` is undefined if missing, an invalid Date if malformed. */
export interface QualificationInput {
  legalQualificationId: number;
  offenseDate?: Date;
}

/** The harmful act of an amparo (D-67, D-78), as it would be stored. */
export interface HarmfulActData {
  date: Date | null;
  renews: boolean;
  renewalDays: number | null;
  termDays: number | null;
  termDayType: DayType | null;
}

/**
 * The rules of a case's data that registering (HU18, `CaseFactory`) and
 * modifying (HU19, `Case.modify`) share, with the same messages.
 *
 * One copy of each rule: if the length of a caption or the coherence of a
 * harmful act changes, it changes for both. Each method adds its message to
 * `errors` instead of throwing, so the caller reports every problem at once.
 */
export class CaseDataRules {
  static readonly ONLY_CRIMINAL = 'Solo corresponde al fuero penal.';
  static readonly ONLY_CRIMINAL_QUALIFICATIONS = 'Solo corresponden al fuero penal.';
  static readonly ONLY_AMPARO = 'Solo corresponde al fuero de amparo.';
  static readonly ONLY_ADMINISTRATIVE = 'Solo corresponde al fuero administrativo.';
  static readonly NOT_IN_CRIMINAL = 'No se informa en el fuero penal.';
  static readonly SUBJECT_MATTER_REQUIRED = 'Es obligatorio en los fueros administrativo y de amparo.';
  static readonly INVALID_DATE = 'Debe ser una fecha válida (AAAA-MM-DD).';
  static readonly NOT_AFTER_TODAY = 'No puede ser posterior a la fecha de hoy.';
  /** A field that the case always has, sent `null` in a modification (HU19). */
  static readonly CANNOT_BE_EMPTIED = 'No puede quedar vacío.';

  /** The contract's limits (V5 §3.7). */
  static readonly MAX_LENGTH = {
    caption: 255,
    court: 255,
    instructorName: 150,
    tribunalPhone: 50,
    instructorExtension: 20,
    counterparty: 255,
    subjectMatter: 800,
  } as const;

  /** A datum counts as sent when it is neither missing nor `null`. */
  static isSent(value: unknown): boolean {
    return value !== undefined && value !== null;
  }

  /** Text trimmed, with blank treated as absent. */
  static clean(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  static isValidDate(date: Date | null | undefined): date is Date {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  static isSacNumber(value: string): boolean {
    return /^\d{8}$/.test(value);
  }

  static checkLength(errors: FieldErrors, field: keyof typeof CaseDataRules.MAX_LENGTH, value: string | null): void {
    const max = CaseDataRules.MAX_LENGTH[field];
    if (value !== null && value.length > max && !errors[field]) {
      errors[field] = `Debe tener como máximo ${max} caracteres.`;
    }
  }

  /** A date that must be valid and not after today. */
  static checkPastDate(errors: FieldErrors, field: string, value: Date | null | undefined, today: Date): void {
    if (!CaseDataRules.isValidDate(value)) {
      errors[field] = CaseDataRules.INVALID_DATE;
    } else if (value > today) {
      errors[field] = CaseDataRules.NOT_AFTER_TODAY;
    }
  }

  /**
   * Validates the legal qualifications sent and returns the offenses they make
   * up, each with its prescription date. An unknown or deactivated
   * qualification is reported by the caller, which is the one that looked it up.
   */
  static checkQualifications(
    errors: FieldErrors,
    items: readonly QualificationInput[],
    refs: readonly LegalQualificationRef[],
    today: Date,
  ): Offense[] {
    const result: Offense[] = [];
    const seen = new Set<number>();

    for (const item of items) {
      if (!CaseDataRules.isValidDate(item.offenseDate)) {
        errors.legalQualifications ??= 'Cada calificación legal requiere la fecha del hecho.';
        continue;
      }
      if (item.offenseDate > today) {
        errors.legalQualifications ??= 'La fecha del hecho no puede ser posterior a hoy.';
      }
      if (seen.has(item.legalQualificationId)) {
        errors.legalQualifications ??= 'No puede haber calificaciones legales repetidas.';
      }
      seen.add(item.legalQualificationId);
      const legalQualification = refs.find((ref) => ref.id === item.legalQualificationId);
      if (legalQualification) {
        const offense = Offense.hydrate({ legalQualification, offenseDate: item.offenseDate, prescriptionExpiresOn: null });
        offense.calculatePrescription();
        result.push(offense);
      }
    }

    return result;
  }

  /**
   * The harmful act of an amparo follows the coherence of the
   * `ck_cases_harmful_act_*` constraints: renewal days if and only if the act
   * renews, and the term (days and day type) if and only if there is a date.
   * Returns it normalized: no renewal days when it does not renew.
   */
  static checkHarmfulAct(errors: FieldErrors, act: HarmfulActData, today: Date): HarmfulActData {
    const { date, renews, renewalDays, termDays, termDayType } = act;

    if (date !== null) {
      CaseDataRules.checkPastDate(errors, 'harmfulActDate', date, today);
    }

    if (renews && renewalDays === null) {
      errors.harmfulActRenewalDays = 'Indicá cada cuántos días se renueva el acto lesivo.';
    } else if (!renews && renewalDays !== null) {
      errors.harmfulActRenewalDays = 'Solo se informa si el acto lesivo se renueva.';
    } else if (renewalDays !== null && !CaseDataRules.isPositiveInteger(renewalDays)) {
      errors.harmfulActRenewalDays = 'Debe ser un número entero mayor o igual a 1.';
    }

    if (date !== null) {
      if (termDays === null) {
        errors.harmfulActTermDays = 'Indicá el plazo para presentar el amparo.';
      } else if (!CaseDataRules.isPositiveInteger(termDays)) {
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

  /** The counterparty of an administrative case or an amparo: optional, up to 255 characters. */
  static checkCounterparty(errors: FieldErrors, raw: string | null | undefined): string | null {
    const counterparty = CaseDataRules.clean(raw);
    CaseDataRules.checkLength(errors, 'counterparty', counterparty);
    return counterparty;
  }

  /** The subject matter of an administrative case or an amparo: required, up to 800 characters. */
  static checkSubjectMatter(errors: FieldErrors, raw: string | null | undefined): string | null {
    const subjectMatter = CaseDataRules.clean(raw);
    if (subjectMatter === null) {
      errors.subjectMatter = CaseDataRules.SUBJECT_MATTER_REQUIRED;
    }
    CaseDataRules.checkLength(errors, 'subjectMatter', subjectMatter);
    return subjectMatter;
  }

  private static isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value >= 1;
  }
}
