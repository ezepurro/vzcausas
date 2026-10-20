import { ClockPort } from "@shared/domain/clock.port";
import {
  CaseOpenDeadline,
  OpenDeadlinesPort,
} from "../../../domain/ports/open-deadlines.port";
import {
  CasePrescriptionStatus,
  PrescriptionStatusPort,
} from "../../../domain/ports/prescription-status.port";

/*
 * Fakes for the detection half of `deadlines` (HU51, HU52). Kept apart from
 * `deadlines-fakes.ts`, which belongs to the notification half (V-11,
 * `IMPLEMENTACION_DETECCION.md`).
 */

/**
 * In-memory {@link PrescriptionStatusPort}. `statuses` is what it answers;
 * `calls` records the `today` of each call, so a spec can check the use case
 * passes its own date through; `failWith` makes the next call throw, to check
 * the port is treated as essential.
 */
export class FakePrescriptionStatus implements PrescriptionStatusPort {
  statuses: CasePrescriptionStatus[] = [];
  readonly calls: Date[] = [];
  failWith: Error | null = null;

  async findOfActiveCriminalCases(today: Date): Promise<CasePrescriptionStatus[]> {
    this.calls.push(today);
    if (this.failWith) {
      throw this.failWith;
    }
    return this.statuses;
  }
}

/** In-memory {@link OpenDeadlinesPort}, same contract as {@link FakePrescriptionStatus}. */
export class FakeOpenDeadlines implements OpenDeadlinesPort {
  deadlines: CaseOpenDeadline[] = [];
  readonly calls: Date[] = [];
  failWith: Error | null = null;

  async findOfActiveCases(today: Date): Promise<CaseOpenDeadline[]> {
    this.calls.push(today);
    if (this.failWith) {
      throw this.failWith;
    }
    return this.deadlines;
  }
}

/** Same shape as `cases/core/test-support/case-fakes.ts`'s: a fixed instant and a fixed civil date. */
export class FakeClock implements ClockPort {
  constructor(
    private readonly instant: Date,
    private readonly date: Date,
  ) {}

  now(): Date {
    return this.instant;
  }

  today(): Date {
    return this.date;
  }
}
