import { ValidationError } from '@shared/domain/domain-error';
import { AdministrativeCase } from '../entities/case/administrative-case.entity';
import { Amparo } from '../entities/case/amparo.entity';
import { Case, CaseProps } from '../entities/case/case.entity';
import { CriminalCase } from '../entities/case/criminal-case.entity';
import { LegalQualificationRef, ProceduralStateRef } from '../ports/case/legal-parameters-lookup.port';
import { CaseDataRules, FieldErrors, HarmfulActData } from '../rules/case-data-rules';
import { DayType } from '../value-objects/deadline/day-type';
import { JurisdictionCode } from '../value-objects/case/jurisdiction-code';
import { isRoleAllowedIn, ProceduralRole } from '../value-objects/case/procedural-role';

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

const { isSent, clean, isValidDate } = CaseDataRules;

/**
 * Builds a new {@link Case} of the kind that matches its jurisdiction.
 *
 * It checks every rule of the registration (HU18) and reports all the
 * problems together, keyed by field, as the API contract shows. The
 * caller can pass the errors it found on its own (unknown client, lawyer,
 * qualification) so they are reported in the same answer.
 *
 * The rules themselves are {@link CaseDataRules}, which modifying a case
 * (HU19, `Case.modify`) uses too: one copy of each rule and of its message.
 */
export class CaseFactory {
  static create(input: NewCaseInput, referenceErrors: FieldErrors = {}): Case {
    const errors: FieldErrors = { ...referenceErrors };
    const isCriminal = input.jurisdictionCode === JurisdictionCode.CRIMINAL;

    const sacNumber = clean(input.sacNumber);
    const caption = clean(input.caption);
    const court = clean(input.court);
    const instructorName = clean(input.instructorName);
    const tribunalPhone = clean(input.tribunalPhone);
    const instructorExtension = clean(input.instructorExtension);
    const counterparty = clean(input.counterparty);
    const subjectMatter = clean(input.subjectMatter);

    if (sacNumber !== null && !CaseDataRules.isSacNumber(sacNumber)) {
      errors.sacNumber = 'Debe contener exactamente 8 dígitos.';
    }
    if (caption === null) {
      errors.caption = 'Es obligatoria.';
    }
    CaseDataRules.checkLength(errors, 'caption', caption);
    CaseDataRules.checkLength(errors, 'court', court);
    CaseDataRules.checkLength(errors, 'instructorName', instructorName);
    CaseDataRules.checkLength(errors, 'tribunalPhone', tribunalPhone);
    CaseDataRules.checkLength(errors, 'instructorExtension', instructorExtension);
    CaseDataRules.checkLength(errors, 'counterparty', counterparty);
    CaseDataRules.checkLength(errors, 'subjectMatter', subjectMatter);

    if (!isRoleAllowedIn(input.proceduralRole, input.jurisdictionCode)) {
      errors.proceduralRole = 'El rol procesal no corresponde al fuero.';
    }

    if (isCriminal) {
      if (counterparty !== null) {
        errors.counterparty = CaseDataRules.NOT_IN_CRIMINAL;
      }
      if (subjectMatter !== null) {
        errors.subjectMatter = CaseDataRules.NOT_IN_CRIMINAL;
      }
    } else {
      if (subjectMatter === null) {
        errors.subjectMatter = CaseDataRules.SUBJECT_MATTER_REQUIRED;
      }
      if (input.legalQualifications.length > 0) {
        errors.legalQualifications = CaseDataRules.ONLY_CRIMINAL_QUALIFICATIONS;
      }
    }

    const startDate = input.startDate ?? undefined;
    if (sacNumber !== null && startDate === undefined) {
      errors.startDate = 'Es obligatoria cuando se informa el número de SAC.';
    } else if (sacNumber === null && startDate !== undefined) {
      errors.startDate = 'No se informa si la causa no tiene número de SAC.';
    } else if (startDate !== undefined && !isValidDate(startDate)) {
      errors.startDate = CaseDataRules.INVALID_DATE;
    } else if (startDate !== undefined && startDate > input.today) {
      errors.startDate = CaseDataRules.NOT_AFTER_TODAY;
    }

    const offenses = CaseDataRules.checkQualifications(
      errors,
      input.legalQualifications,
      input.legalQualificationRefs,
      input.today,
    );
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
      currentStateTerminal: input.initialState.terminal,
      proceduralActs: [],
      active: true,
      deactivation: null,
      createdByUserId: input.createdByUserId,
      createdAt: input.now,
      updatedAt: input.now,
    };

    switch (input.jurisdictionCode) {
      case JurisdictionCode.CRIMINAL:
        return CriminalCase.hydrate({
          ...props,
          offenses,
          clientDetained: input.clientDetained ?? false,
          // A case being registered was never marked as prescribed.
          prescriptionDeclaration: null,
        });
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
   * own, the harmful act follows {@link CaseDataRules.checkHarmfulAct}.
   */
  private static checkJurisdictionData(errors: FieldErrors, input: NewCaseInput): HarmfulActData {
    const none: HarmfulActData = { date: null, renews: false, renewalDays: null, termDays: null, termDayType: null };
    const isAmparo = input.jurisdictionCode === JurisdictionCode.AMPARO;
    const isAdministrative = input.jurisdictionCode === JurisdictionCode.ADMINISTRATIVE;

    if (input.jurisdictionCode !== JurisdictionCode.CRIMINAL && isSent(input.clientDetained)) {
      errors.clientDetained = CaseDataRules.ONLY_CRIMINAL;
    }
    if (!isAdministrative && isSent(input.administrativeRemedyExhaustedOn)) {
      errors.administrativeRemedyExhaustedOn = CaseDataRules.ONLY_ADMINISTRATIVE;
    }
    if (isAdministrative && isSent(input.administrativeRemedyExhaustedOn)) {
      CaseDataRules.checkPastDate(
        errors,
        'administrativeRemedyExhaustedOn',
        input.administrativeRemedyExhaustedOn,
        input.today,
      );
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
          errors[field] = CaseDataRules.ONLY_AMPARO;
        }
      }
      return none;
    }

    return CaseDataRules.checkHarmfulAct(
      errors,
      {
        date: input.harmfulActDate ?? null,
        renews: input.harmfulActRenews ?? false,
        renewalDays: input.harmfulActRenewalDays ?? null,
        termDays: input.harmfulActTermDays ?? null,
        termDayType: input.harmfulActTermDayType ?? null,
      },
      input.today,
    );
  }
}
