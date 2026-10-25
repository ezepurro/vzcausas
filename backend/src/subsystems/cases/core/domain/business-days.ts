const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Saturday and Sunday, as `Date.getUTCDay()` reports them. */
const SATURDAY = 6;
const SUNDAY = 0;

function isBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday !== SATURDAY && weekday !== SUNDAY;
}

/** `date` plus `days` calendar days. Civil dates at midnight UTC, like a `date` column. */
export function addConsecutiveDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Calendar days from `from` to `to`, the inverse of {@link addConsecutiveDays}. `from` after `to` gives `0`. */
export function countConsecutiveDays(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / MS_PER_DAY));
}

/**
 * `date` plus `days` business days, counted from the day after and skipping
 * Saturdays and Sundays. Same rule as {@link businessDaysRemaining}, and as
 * incomplete: no holidays, no judicial recess (P-02).
 */
export function addBusinessDays(date: Date, days: number): Date {
  let current = date;
  let remaining = days;
  while (remaining > 0) {
    current = addConsecutiveDays(current, 1);
    if (isBusinessDay(current)) {
      remaining -= 1;
    }
  }
  return current;
}

/**
 * Business days in the half-open interval `(from, to]`: the day after `from`
 * up to and including `to`. `from` equal to or after `to` gives `0`.
 *
 * Counted by walking the days rather than with a weeks-and-remainder formula.
 * The ranges involved are deadlines — days or weeks, months at worst for an
 * overdue one — so the cost is irrelevant, and a legal computation that a
 * lawyer may have to audit is worth more readable than clever.
 *
 * Inverse of {@link addBusinessDays} when `to` is a business day. When it is
 * not, `to` and the business day before it give the same count.
 */
export function countBusinessDays(from: Date, to: Date): number {
  let count = 0;
  for (let time = from.getTime() + MS_PER_DAY; time <= to.getTime(); time += MS_PER_DAY) {
    if (isBusinessDay(new Date(time))) {
      count += 1;
    }
  }
  return count;
}

/**
 * Business days between today (**excluded**) and the due date (**included**),
 * as the `businessDaysRemaining` field of the contract (§4, Cómputo de días).
 *
 * - Positive: days left.
 * - `0`: the deadline falls today.
 * - Negative: already overdue, counting back from the due date to today.
 *
 * Both dates are civil dates at midnight UTC, the way a `date` column is read.
 * The client builds the prototype's labels from this number — "Vencido hace 2
 * días", "Vence hoy", "En 3 días hábiles". **The backend does not send the
 * category**: that distinction is the frontend's, and adding an enum for it
 * would break the contract (CA-20.5).
 *
 * **What this number is, and what it is not.** It is a countdown to the
 * deadline, expressed in business days. It is **not** a measure of how much
 * working time the lawyer has left. The distinction matters because it decides
 * how holidays read: a deadline on Monday the 28th, seen on Thursday the 24th,
 * counts Friday the 25th and gives `2` — correct as a countdown, even though
 * the 25th is Christmas and the courts are shut. Reading it as available
 * working time would make that `2` look like an overstatement; it is not,
 * because that is not what it measures.
 *
 * Note that the two deadline computations of the system pull in opposite
 * directions on holidays, which is easy to conflate. Computing the due date
 * itself (`deadlineComputedDueDate`, when an act is registered) **moves a
 * date**: counting holidays lands it earlier and warns sooner. This function
 * moves nothing — the due date is already fixed and stored — it only measures
 * the distance to it.
 *
 * ---
 *
 * **This computation is incomplete on purpose, and must stay that way for now.**
 *
 * It excludes Saturdays and Sundays and nothing else: neither public holidays
 * nor the judicial recess (*feria judicial*). The calendar of non-working days
 * is undefined — P-02 of `PENDIENTE_DEFINICION.md`, which the contract states
 * explicitly in §4.
 *
 * Do not "fix" it by hardcoding a holiday list. A computation that looks right
 * and is not is worse than one that is declaredly incomplete: the tests pass
 * either way, which is exactly what hides the defect. When the calendar
 * arrives, the values change and the shape of the contract does not.
 */
export function businessDaysRemaining(today: Date, dueDate: Date): number {
  if (dueDate.getTime() < today.getTime()) {
    return -countBusinessDays(dueDate, today);
  }
  return countBusinessDays(today, dueDate);
}
