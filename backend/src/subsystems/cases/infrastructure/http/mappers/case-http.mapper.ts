import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import { toPageRequest } from '@shared/infrastructure/http/pagination';
import { toJurisdictionFilter } from '../../../core/application/common/jurisdiction-filter';
import { RegisterCaseResult } from '../../../core/application/common/register-case.interfaces';
import { ExclusiveCaseStateFilterError } from '../../../core/domain/errors/case.errors';
import {
  CaseListItem,
  CaseSearchCriteria,
  CaseStateFilter,
} from '../../../core/domain/ports/case-query.port';
import { CaseResponseDto } from '../dtos/case.response.dto';
import { ListCasesQueryDto } from '../dtos/list-cases.query.dto';
import { toPrescriptionDeclarationResponse } from './prescription-declaration-http.mapper';

/**
 * Collapses the three mutually exclusive state parameters into the single
 * value the port takes, or fails if more than one arrived.
 *
 * This is the one place that sees all three at once, which is why the check
 * lives here rather than in the DTO: `class-validator` cannot express "at most
 * one of these three" without a custom decorator, and the use case should not
 * receive a shape that can still be contradictory.
 *
 * The two `details` below reproduce the contract's own examples (§3.7).
 */
function toStateFilter(query: ListCasesQueryDto): CaseStateFilter | undefined {
  const present = [
    query.proceduralStateId !== undefined && 'proceduralStateId',
    query.customState !== undefined && 'customState',
    query.withoutProceduralActs !== undefined && 'withoutProceduralActs',
  ].filter((name): name is string => name !== false);

  if (present.length > 1) {
    throw new ExclusiveCaseStateFilterError(
      present.includes('withoutProceduralActs')
        ? { withoutProceduralActs: 'No puede combinarse con proceduralStateId ni con customState.' }
        : { customState: 'No puede combinarse con proceduralStateId.' },
    );
  }

  if (query.proceduralStateId !== undefined) {
    return { kind: 'proceduralState', proceduralStateId: query.proceduralStateId };
  }
  if (query.customState !== undefined) {
    return { kind: 'custom', customState: query.customState };
  }
  // Only `true` narrows the listing; `?withoutProceduralActs=false` is no filter.
  if (query.withoutProceduralActs === true) {
    return { kind: 'withoutProceduralActs' };
  }
  return undefined;
}

/**
 * Builds the case resource of the API contract (§3.7).
 *
 * One function over one type: `toResponse` takes a {@link CaseListItem} and
 * every endpoint goes through it — the listing (HU20), the detail (HU22) and
 * the registration (HU18). The contract requires the three to return the
 * same resource, and that is the only reason this class exists outside
 * `CasesController`, where it started as a private method.
 *
 * `toResponse` holds **no** domain types. That is what lets the listing feed
 * it a flat row projected by one SQL query: an `instanceof` check here would
 * force every reader to rebuild the aggregate first, and a page of 20 cases
 * would cost about a hundred queries.
 *
 * Injectable because `prescriptionDeclaration.registeredAt` goes out with the
 * offset of the firm's time zone (`APP_TIMEZONE`), like the other mappers of
 * this subsystem that hold an instant (`ProceduralActHttpMapper`).
 */
@Injectable()
export class CaseHttpMapper {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  /**
   * Query parameters of `GET /cases` into the criteria the read port takes.
   *
   * An empty `search` does not travel: `?search=` means "no filter", not "match
   * the empty string". A `jurisdiction` that names no jurisdiction is
   * `400 INVALID_REQUEST`, same as `GET /cases/custom-states`.
   */
  static toSearchCriteria(query: ListCasesQueryDto): CaseSearchCriteria {
    return {
      ...toPageRequest(query),
      search: query.search?.trim() || undefined,
      jurisdiction: toJurisdictionFilter(query.jurisdiction),
      responsibleLawyerId: query.responsibleLawyerId,
      clientId: query.clientId,
      openDeadline: query.openDeadline,
      state: toStateFilter(query),
    };
  }

  toResponse(item: CaseListItem): CaseResponseDto {
    return {
      id: item.id,
      sacNumber: item.sacNumber,
      caption: item.caption,
      court: item.court,
      jurisdiction: item.jurisdiction,
      proceduralRole: item.proceduralRole,
      instructorName: item.instructorName,
      tribunalPhone: item.tribunalPhone,
      instructorExtension: item.instructorExtension,
      counterparty: item.counterparty,
      subjectMatter: item.subjectMatter,
      clientDetained: item.clientDetained,
      injunctionGranted: item.injunctionGranted,
      harmfulActDate: item.harmfulActDate && toIsoDate(item.harmfulActDate),
      harmfulActRenews: item.harmfulActRenews,
      harmfulActRenewalDays: item.harmfulActRenewalDays,
      harmfulActTermDays: item.harmfulActTermDays,
      harmfulActTermDayType: item.harmfulActTermDayType as 'BUSINESS' | 'CONSECUTIVE' | null,
      harmfulActDeadline: item.harmfulActDeadline && {
        actDate: toIsoDate(item.harmfulActDeadline.actDate),
        renewed: item.harmfulActDeadline.renewed,
        dueDate: toIsoDate(item.harmfulActDeadline.dueDate),
        businessDaysRemaining: item.harmfulActDeadline.businessDaysRemaining,
      },
      administrativeRemedyExhaustedOn:
        item.administrativeRemedyExhaustedOn && toIsoDate(item.administrativeRemedyExhaustedOn),
      courtFeePaid: item.courtFeePaid,
      client: { ...item.client, clientSince: toIsoDate(item.client.clientSince) },
      responsibleLawyer: item.responsibleLawyer,
      legalQualifications: item.legalQualifications.map((qualification) => ({
        id: qualification.id,
        name: qualification.name,
        prescriptionMonths: qualification.prescriptionMonths,
        offenseDate: toIsoDate(qualification.offenseDate),
        prescriptionStartsOn: toIsoDate(qualification.prescriptionStartsOn),
        prescriptionExpiresOn:
          qualification.prescriptionExpiresOn && toIsoDate(qualification.prescriptionExpiresOn),
      })),
      prescription: item.prescription && {
        legalQualificationId: item.prescription.legalQualificationId,
        legalQualificationName: item.prescription.legalQualificationName,
        startsOn: toIsoDate(item.prescription.startsOn),
        expiresOn: toIsoDate(item.prescription.expiresOn),
        elapsedPercentage: item.prescription.elapsedPercentage,
        alert: item.prescription.alert,
        expired: item.prescription.expired,
        lastInterruptiveActDate:
          item.prescription.lastInterruptiveActDate && toIsoDate(item.prescription.lastInterruptiveActDate),
      },
      prescriptionDeclaration:
        item.prescriptionDeclaration && toPrescriptionDeclarationResponse(item.prescriptionDeclaration, this.timeZone),
      // `null` mientras la causa no tiene SAC (D-38): la fecha de inicio es la
      // de la causa en sede judicial, y sin SAC no existe. Antes la columna era
      // `NOT NULL` y se guardaba la del día, un dato inventado que el detalle
      // mostraba como real.
      startDate: item.startDate && toIsoDate(item.startDate),
      currentState: {
        proceduralStateId: item.currentState.proceduralStateId,
        name: item.currentState.name,
        custom: item.currentState.custom,
        initial: item.currentState.initial,
        proceduralActId: item.currentState.proceduralActId,
        dueDate: item.currentState.dueDate && toIsoDate(item.currentState.dueDate),
        businessDaysRemaining: item.currentState.businessDaysRemaining,
        manuallyAdjusted: item.currentState.manuallyAdjusted,
      },
      folder: item.folder && { ...item.folder },
      active: item.active,
    };
  }

  /**
   * Response for `POST /cases` (HU18): projects the aggregate the use case
   * just built into a {@link CaseListItem}, then maps it.
   *
   * It holds no domain entity either: the result carries a {@link CaseSnapshot}
   * where `counterparty` and `subjectMatter` (which exist only on
   * `ADMINISTRATIVE` and `AMPARO`) and the data of the other jurisdictions are
   * already `null`, as the contract wants.
   *
   * The four act-derived fields of `currentState` are empty here, and that is
   * a property of registration rather than a gap: a fresh case is in the
   * initial state of its jurisdiction, no act set it, so it opens no deadline
   * and is never hand-written. `proceduralStateId` goes out as `null` even
   * though `cases.current_state_id` points at the real "Iniciada" row —
   * mapping that id through would send the frontend looking for a state that
   * `/procedural-states` does not list.
   */
  fromRegisterResult(result: RegisterCaseResult): CaseResponseDto {
    const { newCase, currentState } = result;

    return this.toResponse({
      id: newCase.id,
      sacNumber: newCase.sacNumber,
      caption: newCase.caption,
      court: newCase.court,
      jurisdiction: newCase.jurisdictionCode,
      proceduralRole: newCase.proceduralRole,
      instructorName: newCase.instructor.name,
      tribunalPhone: newCase.instructor.phone,
      instructorExtension: newCase.instructor.extension,
      counterparty: newCase.counterparty,
      subjectMatter: newCase.subjectMatter,
      // The data of each jurisdiction is `null` outside its own (D-67), already so in the snapshot.
      clientDetained: newCase.clientDetained,
      injunctionGranted: newCase.injunctionGranted,
      harmfulActDate: newCase.harmfulActDate,
      harmfulActRenews: newCase.harmfulActRenews,
      harmfulActRenewalDays: newCase.harmfulActRenewalDays,
      harmfulActTermDays: newCase.harmfulActTermDays,
      harmfulActTermDayType: newCase.harmfulActTermDayType,
      harmfulActDeadline: result.harmfulActDeadline,
      administrativeRemedyExhaustedOn: newCase.administrativeRemedyExhaustedOn,
      courtFeePaid: newCase.courtFeePaid,
      client: result.client,
      responsibleLawyer: result.responsibleLawyer,
      legalQualifications: newCase.offenses.map((offense) => ({
        id: offense.legalQualificationId,
        name: offense.legalQualificationName,
        prescriptionMonths: offense.prescriptionMonths,
        offenseDate: offense.offenseDate,
        prescriptionStartsOn: offense.prescriptionStartsOn,
        prescriptionExpiresOn: offense.prescriptionExpiresOn,
      })),
      // A case being registered has no interruptive acts and was never marked as prescribed.
      lastInterruptiveActDate: null,
      prescription: result.prescription,
      prescriptionDeclaration: null,
      startDate: newCase.startDate,
      currentState: {
        proceduralStateId: currentState.isInitial ? null : currentState.id,
        name: currentState.name,
        custom: false,
        initial: currentState.isInitial,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
      },
      folder: result.folder,
      active: newCase.active,
    });
  }
}
