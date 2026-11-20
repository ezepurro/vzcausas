/**
 * How many questions a user may ask (proposal §3, "Límite de frecuencia"):
 * at most `perMinute` in the last minute and `perDay` in the last 24 hours.
 * Configuration of the server, validated once at startup.
 */
export class UsageLimits {
  private constructor(
    readonly perMinute: number,
    readonly perDay: number,
  ) {}

  static create(raw: { perMinute: number; perDay: number }): UsageLimits {
    const problems = Object.entries(raw)
      .filter(([, value]) => !Number.isInteger(value) || value < 1)
      .map(([name, value]) => `${name} must be a positive integer, got ${value}`);
    if (problems.length > 0) {
      throw new Error(`Invalid assistant usage limits: ${problems.join('; ')}.`);
    }
    return new UsageLimits(raw.perMinute, raw.perDay);
  }

  equals(other: UsageLimits): boolean {
    return this.perMinute === other.perMinute && this.perDay === other.perDay;
  }
}
