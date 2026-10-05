import { Instructor } from '../value-objects/instructor';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { ProceduralRole } from '../value-objects/procedural-role';
import { ProceduralAct } from './procedural-act';

export interface CaseProps {
  id: number;
  // Optional (D-33). When present it is unique system-wide (RN2).
  sacNumber: string | null;
  caption: string;
  court: string | null;
  jurisdictionId: number;
  proceduralRole: ProceduralRole;
  instructor: Instructor;
  clientId: number;
  responsibleLawyerId: number;
  startDate: Date;
  // Current state: exactly one of the two is set. A new case starts in the
  // initial state of its jurisdiction ("Iniciada").
  currentStateId: number | null;
  currentCustomState: string | null;
  // Act that led to the current state. Null while in the initial state.
  currentProceduralActId: number | null;
  proceduralActs: ProceduralAct[];
  active: boolean;
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Case (causa). Aggregate root of `cases`. Other aggregates (client, lawyer,
 * user, jurisdiction, state) are referenced by id only.
 *
 * One subclass per jurisdiction; all of them are stored in the `cases` table.
 */
export abstract class Case {
  protected constructor(protected readonly props: CaseProps) {}

  /** The jurisdiction this kind of case belongs to. */
  abstract get jurisdictionCode(): JurisdictionCode;

  get id(): number {
    return this.props.id;
  }

  get sacNumber(): string | null {
    return this.props.sacNumber;
  }

  get caption(): string {
    return this.props.caption;
  }

  get court(): string | null {
    return this.props.court;
  }

  get jurisdictionId(): number {
    return this.props.jurisdictionId;
  }

  get proceduralRole(): ProceduralRole {
    return this.props.proceduralRole;
  }

  get instructor(): Instructor {
    return this.props.instructor;
  }

  get clientId(): number {
    return this.props.clientId;
  }

  get responsibleLawyerId(): number {
    return this.props.responsibleLawyerId;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get currentStateId(): number | null {
    return this.props.currentStateId;
  }

  get currentCustomState(): string | null {
    return this.props.currentCustomState;
  }

  get currentProceduralActId(): number | null {
    return this.props.currentProceduralActId;
  }

  get proceduralActs(): ProceduralAct[] {
    return this.props.proceduralActs;
  }

  get active(): boolean {
    return this.props.active;
  }

  get createdByUserId(): number {
    return this.props.createdByUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
