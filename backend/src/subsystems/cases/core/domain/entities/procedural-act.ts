import { Deadline } from '../value-objects/deadline';

export interface ProceduralActProps {
  id: number;
  caseId: number;
  // Exactly one of the two is set: a table state or a hand-written one.
  proceduralStateId: number | null;
  customState: string | null;
  actDate: Date;
  // Only ADMINISTRATIVE cases (RN6).
  notificationDate: Date | null;
  notes: string | null;
  deadline: Deadline;
  registeredByUserId: number;
  // The responsible lawyer of the case at registration time.
  registeredByLawyerId: number;
  registeredAt: Date;
}

/** Procedural act: one entry in the timeline of a case. Lives inside the Case aggregate. */
export class ProceduralAct {
  private constructor(private readonly props: ProceduralActProps) {}

  /** Rebuilds a {@link ProceduralAct} from persisted data, without validation. */
  static hydrate(props: ProceduralActProps): ProceduralAct {
    return new ProceduralAct(props);
  }

  get id(): number {
    return this.props.id;
  }

  get caseId(): number {
    return this.props.caseId;
  }

  get proceduralStateId(): number | null {
    return this.props.proceduralStateId;
  }

  get customState(): string | null {
    return this.props.customState;
  }

  get actDate(): Date {
    return this.props.actDate;
  }

  get notificationDate(): Date | null {
    return this.props.notificationDate;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get deadline(): Deadline {
    return this.props.deadline;
  }

  get registeredByUserId(): number {
    return this.props.registeredByUserId;
  }

  get registeredByLawyerId(): number {
    return this.props.registeredByLawyerId;
  }

  get registeredAt(): Date {
    return this.props.registeredAt;
  }
}
